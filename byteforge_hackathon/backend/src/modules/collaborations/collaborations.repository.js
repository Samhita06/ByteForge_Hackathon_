import { throwIfDbError, requireOwnedRow } from '../../shared/utils/db.js';
import { paginationQuery, paginated } from '../../shared/utils/pagination.js';

export async function listCollaborations(supabase, userId, query) {
  const page = paginationQuery(query);
  let request = supabase
    .from('collaborations')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(page.from, page.to);

  if (query.status) request = request.eq('status', query.status);
  if (query.q) {
    const term = `%${query.q}%`;
    request = request.or(`brand_name.ilike.${term},campaign_name.ilike.${term}`);
  }

  const { data, error, count } = await request;
  throwIfDbError(error, 'Database request failed', {
    operation: 'select_collaborations',
    table: 'collaborations',
  });
  return paginated(data || [], count, page);
}

export async function getCollaboration(supabase, userId, id) {
  return requireOwnedRow(
    supabase.from('collaborations').select('*').eq('id', id).eq('user_id', userId),
    'Collaboration not found',
  );
}

export async function createCollaboration(supabase, userId, payload) {
  const { data, error } = await supabase
    .from('collaborations')
    .insert({ ...payload, user_id: userId })
    .select('*')
    .single();
  throwIfDbError(error);
  return data;
}

export async function updateCollaboration(supabase, userId, id, payload) {
  const { data, error } = await supabase
    .from('collaborations')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  throwIfDbError(error);
  return data;
}

export async function deleteCollaboration(supabase, userId, id) {
  const { data, error } = await supabase
    .from('collaborations')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();
  throwIfDbError(error);
  return data;
}
