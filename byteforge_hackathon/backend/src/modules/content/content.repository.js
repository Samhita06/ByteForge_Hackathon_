import { throwIfDbError, requireOwnedRow } from '../../shared/utils/db.js';
import { paginationQuery, paginated } from '../../shared/utils/pagination.js';

export async function listContent(supabase, userId, query) {
  const page = paginationQuery({ ...query, pageSize: query.pageSize || 50 });
  let request = supabase
    .from('content_items')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('scheduled_date', { ascending: true, nullsFirst: false })
    .range(page.from, page.to);
  if (query.platform) request = request.eq('platform', query.platform);
  if (query.status) request = request.eq('status', query.status);
  if (query.month) {
    const start = `${query.month}-01`;
    const [year, month] = query.month.split('-').map(Number);
    const endDate = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    request = request.gte('scheduled_date', start).lte('scheduled_date', endDate);
  }
  const { data, error, count } = await request;
  throwIfDbError(error, 'Database request failed', { operation: 'select_content', table: 'content_items' });
  return paginated(data || [], count, page);
}

export async function getContent(supabase, userId, id) {
  return requireOwnedRow(
    supabase.from('content_items').select('*').eq('id', id).eq('user_id', userId),
    'Content item not found',
  );
}

export async function createContent(supabase, userId, payload) {
  const { data, error } = await supabase
    .from('content_items')
    .insert({ ...payload, user_id: userId })
    .select('*')
    .single();
  throwIfDbError(error);
  return data;
}

export async function updateContent(supabase, userId, id, payload) {
  const { data, error } = await supabase
    .from('content_items')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  throwIfDbError(error);
  return data;
}

export async function deleteContent(supabase, userId, id) {
  const { data, error } = await supabase
    .from('content_items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();
  throwIfDbError(error);
  return data;
}
