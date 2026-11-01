import { Errors } from '../../shared/errors/AppError.js';
import * as collabRepo from '../collaborations/collaborations.repository.js';
import * as repo from './finance.repository.js';

export function listInvoices(supabase, user, query) {
  return repo.listInvoices(supabase, user.id, query);
}

export async function createInvoice(supabase, user, payload) {
  await collabRepo.getCollaboration(supabase, user.id, payload.collaboration_id);
  const invoice = await repo.createInvoice(supabase, user.id, payload);
  if (invoice.status === 'paid') {
    return ensurePaymentTransaction(supabase, user, invoice);
  }
  return invoice;
}

export async function updateInvoice(supabase, user, id, payload) {
  const current = await repo.getInvoice(supabase, user.id, id);
  const nextStatus = payload.status ?? current.status;
  if (nextStatus === 'paid' && !payload.paid_at) {
    payload.paid_at = new Date().toISOString();
  }
  if (nextStatus !== 'paid') {
    payload.paid_at = payload.paid_at ?? null;
  }
  const updated = await repo.updateInvoice(supabase, user.id, id, payload);
  if (!updated) throw Errors.notFound('Invoice not found');
  if (updated.status === 'paid') {
    await ensurePaymentTransaction(supabase, user, updated);
  }
  return updated;
}

async function ensurePaymentTransaction(supabase, user, invoice) {
  const existing = await repo.findIncomeForInvoice(supabase, user.id, invoice.id);
  if (existing) return invoice;
  await repo.createTransaction(supabase, user.id, {
    type: 'income',
    amount: invoice.amount,
    currency: invoice.currency,
    category: 'invoice_payment',
    transaction_date: (invoice.paid_at || new Date().toISOString()).slice(0, 10),
    description: `Payment for invoice ${invoice.invoice_number}`,
    collaboration_id: invoice.collaboration_id,
    invoice_id: invoice.id,
  });
  return invoice;
}

export function listTransactions(supabase, user, query) {
  return repo.listTransactions(supabase, user.id, query);
}

export async function createTransaction(supabase, user, payload) {
  if (payload.collaboration_id) {
    await collabRepo.getCollaboration(supabase, user.id, payload.collaboration_id);
  }
  if (payload.invoice_id) {
    await repo.getInvoice(supabase, user.id, payload.invoice_id);
  }
  return repo.createTransaction(supabase, user.id, payload);
}

export async function updateTransaction(supabase, user, id, payload) {
  await repo.getTransaction(supabase, user.id, id);
  if (payload.collaboration_id) {
    await collabRepo.getCollaboration(supabase, user.id, payload.collaboration_id);
  }
  const updated = await repo.updateTransaction(supabase, user.id, id, payload);
  if (!updated) throw Errors.notFound('Transaction not found');
  return updated;
}

export async function removeTransaction(supabase, user, id) {
  await repo.getTransaction(supabase, user.id, id);
  const deleted = await repo.deleteTransaction(supabase, user.id, id);
  if (!deleted) throw Errors.notFound('Transaction not found');
  return deleted;
}
