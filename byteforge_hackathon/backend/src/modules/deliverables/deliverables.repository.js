import { throwIfDbError, requireOwnedRow } from '../../shared/utils/db.js';
import { paginationQuery, paginated } from '../../shared/utils/pagination.js';

export async function listDeliverables(supabase, userId, query) {
  const page = paginationQuery(query);
  let request = supabase
    .from('deliverables')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .range(page.from, page.to);
  if (query.collaboration_id) request = request.eq('collaboration_id', query.collaboration_id);
  if (query.status) request = request.eq('status', query.status);
  const { data, error, count } = await request;
  throwIfDbError(error, 'Database request failed', {
    operation: 'select_deliverables',
    table: 'deliverables',
  });
  return paginated(data || [], count, page);
}

export async function getDeliverable(supabase, userId, id) {
  return requireOwnedRow(
    supabase.from('deliverables').select('*').eq('id', id).eq('user_id', userId),
    'Deliverable not found',
  );
}

export async function createDeliverable(supabase, userId, payload) {
  const { data, error } = await supabase
    .from('deliverables')
    .insert({ ...payload, user_id: userId })
    .select('*')
    .single();
  throwIfDbError(error);
  return data;
}

export async function updateDeliverable(supabase, userId, id, payload) {
  const { data, error } = await supabase
    .from('deliverables')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  throwIfDbError(error);
  return data;
}

export async function deleteDeliverable(supabase, userId, id) {
  const { data, error } = await supabase
    .from('deliverables')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();
  throwIfDbError(error);
  return data;
}
