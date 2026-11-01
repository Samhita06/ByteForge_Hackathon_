import { Errors } from '../../shared/errors/AppError.js';
import * as repo from './collaborations.repository.js';

export function list(supabase, user, query) {
  return repo.listCollaborations(supabase, user.id, query);
}

export function getById(supabase, user, id) {
  return repo.getCollaboration(supabase, user.id, id);
}

export function create(supabase, user, payload) {
  return repo.createCollaboration(supabase, user.id, payload);
}

export async function update(supabase, user, id, payload) {
  await repo.getCollaboration(supabase, user.id, id);
  const updated = await repo.updateCollaboration(supabase, user.id, id, payload);
  if (!updated) throw Errors.notFound('Collaboration not found');
  return updated;
}

export async function remove(supabase, user, id) {
  await repo.getCollaboration(supabase, user.id, id);
  const deleted = await repo.deleteCollaboration(supabase, user.id, id);
  if (!deleted) throw Errors.notFound('Collaboration not found');
  return deleted;
}
