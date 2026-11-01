import { Errors } from '../../shared/errors/AppError.js';
import * as collabRepo from '../collaborations/collaborations.repository.js';
import * as repo from './finance.repository.js';

export function listInvoices(supabase, user, query) {
  return repo.listInvoices(supabase, user.id, query);
}

export async function createInvoice(supabase, user, payload) {
  await collabRepo.getCollaboration(supabase, user.id, payload.collaboration_id);
  const invoice = await repo.createInvoice(supabase, user.id, {
    ...payload,
    status: payload.status === 'paid' ? 'sent' : payload.status,
  });
  if (payload.status === 'paid') {
    const paid = await repo.markInvoicePaid(supabase, invoice.id);
    if (!paid) throw Errors.notFound('Invoice not found');
    return paid;
  }
  return invoice;
}

export async function updateInvoice(supabase, user, id, payload) {
  if (payload.status === 'paid') {
    if (Object.keys(payload).some((key) => key !== 'status')) {
      throw Errors.validation('Mark an invoice paid separately from editing invoice details.');
    }
    const paid = await repo.markInvoicePaid(supabase, id);
    if (!paid) throw Errors.notFound('Invoice not found');
    return paid;
  }

  const current = await repo.getInvoice(supabase, user.id, id);
  if (current.status === 'paid') {
    if (payload.status && payload.status !== 'paid') {
      throw Errors.validation('A paid invoice cannot be moved back to an unpaid status.');
    }
    if (payload.paid_at !== undefined && payload.paid_at !== current.paid_at) {
      throw Errors.validation('Payment date cannot be changed after an invoice is paid.');
    }
    if (
      (payload.amount !== undefined && Number(payload.amount) !== Number(current.amount)) ||
      (payload.currency !== undefined && payload.currency !== current.currency)
    ) {
      throw Errors.validation('Amount and currency cannot be changed after an invoice is paid.');
    }
  }
  const updated = await repo.updateInvoice(supabase, user.id, id, payload);
  if (!updated) throw Errors.notFound('Invoice not found');
  return updated;
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
