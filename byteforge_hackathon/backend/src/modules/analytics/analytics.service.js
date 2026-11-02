import { AppError } from '../../shared/errors/AppError.js';
import { sumMoney, roundMoney } from '../../shared/utils/money.js';
import * as creatorRepo from '../creators/creators.repository.js';
import * as collabRepo from '../collaborations/collaborations.repository.js';
import * as deliverableRepo from '../deliverables/deliverables.repository.js';
import * as contentRepo from '../content/content.repository.js';
import * as financeRepo from '../finance/finance.repository.js';

const PENDING_INVOICE_STATUSES = new Set(['draft', 'sent', 'overdue']);
const ACTIVE_COLLAB_STATUSES = new Set(['draft', 'active']);
const OPEN_DELIVERABLE_STATUSES = new Set(['pending', 'in_progress']);
const PLANNED_CONTENT_STATUSES = new Set(['idea', 'scheduled', 'in_progress']);
const OUTSTANDING_INVOICE_STATUSES = new Set(['sent', 'overdue']);

function utcToday(clock) {
  const instant = new Date(clock());
  if (!Number.isFinite(instant.getTime())) {
    throw new TypeError('Business insights clock must return a valid date.');
  }
  return instant.toISOString().slice(0, 10);
}

function databaseDataError() {
  return new AppError('Database request failed', { status: 502, code: 'DATABASE_ERROR' });
}

function exactCount(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw databaseDataError();
  return value;
}

function toMinorUnits(value) {
  const decimal = typeof value === 'string' ? value : String(value);
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(decimal);
  if (!match) throw databaseDataError();
  return BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0'));
}

function formatMinorUnits(value) {
  return `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
}

function normalizeCurrency(value) {
  if (typeof value !== 'string') throw databaseDataError();
  const currency = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw databaseDataError();
  return currency;
}

function getOutstandingInvoiceTotals(invoices) {
  const totals = new Map();
  let count = 0;

  for (const row of invoices) {
    if (!OUTSTANDING_INVOICE_STATUSES.has(row.status) || row.paid_at !== null) continue;
    const currency = normalizeCurrency(row.currency);
    const amount = toMinorUnits(row.amount);
    const current = totals.get(currency) || { amount: 0n, count: 0 };
    current.amount += amount;
    current.count += 1;
    totals.set(currency, current);
    count += 1;
  }

  if (!Number.isSafeInteger(count)) throw databaseDataError();
  const amountsByCurrency = [...totals.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([currency, total]) => ({
      currency,
      amount: formatMinorUnits(total.amount),
      count: total.count,
    }));

  return {
    count,
    amountBasis: 'invoice_face_value',
    amountsByCurrency,
  };
}

export async function getBusinessInsights(
  supabase,
  userId,
  { clock = () => new Date(), invoicesPromise } = {},
) {
  const today = utcToday(clock);
  const invoiceRowsPromise = invoicesPromise || financeRepo.listAllInvoices(supabase, userId);
  const [activeCollaborations, scheduledContent, overdueDeliverables, invoices] = await Promise.all([
    collabRepo.countActiveCollaborations(supabase, userId),
    contentRepo.countScheduledContent(supabase, userId),
    deliverableRepo.countOverdueDeliverables(supabase, userId, today),
    invoiceRowsPromise,
  ]);

  return {
    activeCollaborations: exactCount(activeCollaborations),
    scheduledContent: exactCount(scheduledContent),
    overdueDeliverables: exactCount(overdueDeliverables),
    outstandingInvoices: getOutstandingInvoiceTotals(invoices),
  };
}

export function calculateFinancials(transactions, invoices, reportingCurrency) {
  const matchingIncome = transactions.filter(
    (row) => row.type === 'income' && row.currency === reportingCurrency,
  );
  const matchingExpenses = transactions.filter(
    (row) => row.type === 'expense' && row.currency === reportingCurrency,
  );
  const pendingInvoices = invoices.filter(
    (row) => PENDING_INVOICE_STATUSES.has(row.status) && row.currency === reportingCurrency,
  );
  const mismatched = [
    ...transactions.filter((row) => row.currency !== reportingCurrency),
    ...invoices.filter((row) => row.currency !== reportingCurrency),
  ];

  const receivedEarnings = roundMoney(sumMoney(matchingIncome));
  const expenses = roundMoney(sumMoney(matchingExpenses));
  return {
    reportingCurrency,
    receivedEarnings,
    expenses,
    netEarnings: roundMoney(receivedEarnings - expenses),
    pendingInvoiceTotal: roundMoney(sumMoney(pendingInvoices)),
    excludedOtherCurrencyCount: mismatched.length,
  };
}

export async function getDashboardSummary(supabase, user, options = {}) {
  const profile =
    (await creatorRepo.findProfile(supabase, user.id)) || {
      display_name: user.email?.split('@')[0] || 'Creator',
      reporting_currency: 'INR',
      niche: null,
    };

  const invoicesPromise = financeRepo.listAllInvoices(supabase, user.id);
  const [collaborations, deliverables, content, invoices, transactions, businessInsights] = await Promise.all([
    collabRepo.listCollaborations(supabase, user.id, { page: 1, pageSize: 50 }),
    deliverableRepo.listDeliverables(supabase, user.id, { page: 1, pageSize: 50 }),
    contentRepo.listContent(supabase, user.id, { page: 1, pageSize: 50 }),
    invoicesPromise,
    financeRepo.listAllTransactions(supabase, user.id),
    getBusinessInsights(supabase, user.id, { ...options, invoicesPromise }),
  ]);

  const reportingCurrency = profile.reporting_currency || 'INR';
  const financials = calculateFinancials(transactions, invoices, reportingCurrency);

  const activeCollaborations = collaborations.data.filter((row) => ACTIVE_COLLAB_STATUSES.has(row.status));
  const upcomingDeliverables = deliverables.data
    .filter((row) => OPEN_DELIVERABLE_STATUSES.has(row.status))
    .slice(0, 8);
  const scheduledContent = content.data
    .filter((row) => PLANNED_CONTENT_STATUSES.has(row.status))
    .slice(0, 8);

  const activity = [
    ...collaborations.data.map((row) => ({
      id: row.id,
      kind: 'collaboration',
      title: `${row.brand_name} · ${row.campaign_name}`,
      at: row.updated_at || row.created_at,
    })),
    ...invoices.map((row) => ({
      id: row.id,
      kind: 'invoice',
      title: `Invoice ${row.invoice_number} · ${row.status}`,
      at: row.updated_at || row.created_at,
    })),
    ...content.data.map((row) => ({
      id: row.id,
      kind: 'content',
      title: row.title,
      at: row.updated_at || row.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 8);

  const deadlines = [
    ...upcomingDeliverables
      .filter((row) => row.due_date)
      .map((row) => ({ id: row.id, kind: 'deliverable', title: row.title, date: row.due_date })),
    ...activeCollaborations
      .filter((row) => row.deadline)
      .map((row) => ({
        id: row.id,
        kind: 'collaboration',
        title: `${row.brand_name} deadline`,
        date: row.deadline,
      })),
    ...scheduledContent
      .filter((row) => row.scheduled_date)
      .map((row) => ({ id: row.id, kind: 'content', title: row.title, date: row.scheduled_date })),
  ]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 8);

  return {
    profile: {
      display_name: profile.display_name,
      niche: profile.niche,
      reporting_currency: reportingCurrency,
    },
    businessInsights,
    counts: {
      activeCollaborations: activeCollaborations.length,
      upcomingDeliverables: upcomingDeliverables.length,
      scheduledContent: scheduledContent.length,
    },
    financials,
    activeCollaborations: activeCollaborations.slice(0, 6),
    upcomingDeliverables,
    scheduledContent,
    recentActivity: activity,
    upcomingDeadlines: deadlines,
  };
}
