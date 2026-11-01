import { throwIfDbError } from '../../shared/utils/db.js';
import { Errors } from '../../shared/errors/AppError.js';

export async function findProfile(supabase, userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  throwIfDbError(error, 'Database request failed', { operation: 'select_profile', table: 'profiles' });
  return data;
}

export async function upsertProfile(supabase, userId, patch) {
  const existing = await findProfile(supabase, userId);
  if (!existing) {
    const payload = { id: userId, display_name: patch.display_name || 'Creator', ...patch };
    const { data, error } = await supabase.from('profiles').insert(payload).select('*').single();
    throwIfDbError(error);
    return data;
  }
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select('*').single();
  throwIfDbError(error, 'Unable to update profile');
  if (!data) throw Errors.notFound('Profile not found');
  return data;
}
