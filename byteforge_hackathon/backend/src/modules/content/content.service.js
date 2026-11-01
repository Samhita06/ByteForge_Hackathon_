import { Errors } from '../../shared/errors/AppError.js';
import * as collabRepo from '../collaborations/collaborations.repository.js';
import * as repo from './content.repository.js';

export function list(supabase, user, query) {
  return repo.listContent(supabase, user.id, query);
}

export async function create(supabase, user, payload) {
  if (payload.collaboration_id) {
    await collabRepo.getCollaboration(supabase, user.id, payload.collaboration_id);
  }
  return repo.createContent(supabase, user.id, payload);
}

export async function update(supabase, user, id, payload) {
  await repo.getContent(supabase, user.id, id);
  if (payload.collaboration_id) {
    await collabRepo.getCollaboration(supabase, user.id, payload.collaboration_id);
  }
  const updated = await repo.updateContent(supabase, user.id, id, payload);
  if (!updated) throw Errors.notFound('Content item not found');
  return updated;
}

export async function remove(supabase, user, id) {
  await repo.getContent(supabase, user.id, id);
  const deleted = await repo.deleteContent(supabase, user.id, id);
  if (!deleted) throw Errors.notFound('Content item not found');
  return deleted;
}
