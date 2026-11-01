import { throwIfDbError, requireOwnedRow } from '../../shared/utils/db.js';
import { paginationQuery, paginated } from '../../shared/utils/pagination.js';

export async function listInvoices(supabase, userId, query) {
  const page = paginationQuery(query);
  let request = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('issue_date', { ascending: false })
    .range(page.from, page.to);
  if (query.status) request = request.eq('status', query.status);
  const { data, error, count } = await request;
  throwIfDbError(error);
  return paginated(data || [], count, page);
}

export async function getInvoice(supabase, userId, id) {
  return requireOwnedRow(
    supabase.from('invoices').select('*').eq('id', id).eq('user_id', userId),
    'Invoice not found',
  );
}

export async function createInvoice(supabase, userId, payload) {
  const { data, error } = await supabase
    .from('invoices')
    .insert({ ...payload, user_id: userId })
    .select('*')
    .single();
  throwIfDbError(error);
  return data;
}

export async function updateInvoice(supabase, userId, id, payload) {
  const { data, error } = await supabase
    .from('invoices')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  throwIfDbError(error);
  return data;
}

export async function markInvoicePaid(supabase, id) {
  const { data, error } = await supabase.rpc('mark_invoice_paid', { p_invoice_id: id });
  throwIfDbError(error, 'Unable to mark invoice paid', {
    operation: 'mark_invoice_paid',
    table: 'invoices',
  });
  return data;
}

export async function findIncomeForInvoice(supabase, userId, invoiceId) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('invoice_id', invoiceId)
    .eq('type', 'income')
    .limit(1);
  throwIfDbError(error);
  return data?.[0] || null;
}

export async function listTransactions(supabase, userId, query) {
  const page = paginationQuery(query);
  let request = supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .range(page.from, page.to);
  if (query.type) request = request.eq('type', query.type);
  if (query.from) request = request.gte('transaction_date', query.from);
  if (query.to) request = request.lte('transaction_date', query.to);
  const { data, error, count } = await request;
  throwIfDbError(error);
  return paginated(data || [], count, page);
}

export async function getTransaction(supabase, userId, id) {
  return requireOwnedRow(
    supabase.from('transactions').select('*').eq('id', id).eq('user_id', userId),
    'Transaction not found',
  );
}

export async function createTransaction(supabase, userId, payload) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...payload, user_id: userId })
    .select('*')
    .single();
  throwIfDbError(error);
  return data;
}

export async function updateTransaction(supabase, userId, id, payload) {
  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  throwIfDbError(error);
  return data;
}

export async function deleteTransaction(supabase, userId, id) {
  const { data, error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();
  throwIfDbError(error);
  return data;
}

export async function listAllTransactions(supabase, userId) {
  const { data, error } = await supabase.from('transactions').select('*').eq('user_id', userId);
  throwIfDbError(error, 'Database request failed', {
    operation: 'select_all_user_transactions',
    table: 'transactions',
  });
  return data || [];
}

export async function listAllInvoices(supabase, userId) {
  const { data, error } = await supabase.from('invoices').select('*').eq('user_id', userId);
  throwIfDbError(error, 'Database request failed', { operation: 'select_all_user_invoices', table: 'invoices' });
  return data || [];
}
