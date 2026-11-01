import { Errors } from '../../shared/errors/AppError.js';
import * as repo from './creators.repository.js';

export async function getProfile(supabase, user) {
  const profile = await repo.findProfile(supabase, user.id);
  if (profile) return profile;
  return repo.upsertProfile(supabase, user.id, {
    display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Creator',
  });
}

export async function updateProfile(supabase, user, patch) {
  if (Object.keys(patch).length === 0) {
    throw Errors.validation('No profile fields were provided.');
  }
  await getProfile(supabase, user);
  return repo.upsertProfile(supabase, user.id, patch);
}
