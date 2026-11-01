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

export async function getDashboardSummary(supabase, user) {
  const profile =
    (await creatorRepo.findProfile(supabase, user.id)) || {
      display_name: user.email?.split('@')[0] || 'Creator',
      reporting_currency: 'INR',
      niche: null,
    };

  const [collaborations, deliverables, content, invoices, transactions] = await Promise.all([
    collabRepo.listCollaborations(supabase, user.id, { page: 1, pageSize: 50 }),
    deliverableRepo.listDeliverables(supabase, user.id, { page: 1, pageSize: 50 }),
    contentRepo.listContent(supabase, user.id, { page: 1, pageSize: 50 }),
    financeRepo.listAllInvoices(supabase, user.id),
    financeRepo.listAllTransactions(supabase, user.id),
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
