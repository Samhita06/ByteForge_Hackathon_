import { Errors } from '../../shared/errors/AppError.js';
import * as collabRepo from '../collaborations/collaborations.repository.js';
import * as repo from './deliverables.repository.js';

export function list(supabase, user, query) {
  return repo.listDeliverables(supabase, user.id, query);
}

export function getById(supabase, user, id) {
  return repo.getDeliverable(supabase, user.id, id);
}

export async function create(supabase, user, payload) {
  await collabRepo.getCollaboration(supabase, user.id, payload.collaboration_id);
  return repo.createDeliverable(supabase, user.id, payload);
}

export async function update(supabase, user, id, payload) {
  await repo.getDeliverable(supabase, user.id, id);
  if (payload.collaboration_id) {
    await collabRepo.getCollaboration(supabase, user.id, payload.collaboration_id);
  }
  const updated = await repo.updateDeliverable(supabase, user.id, id, payload);
  if (!updated) throw Errors.notFound('Deliverable not found');
  return updated;
}

export async function remove(supabase, user, id) {
  await repo.getDeliverable(supabase, user.id, id);
  const deleted = await repo.deleteDeliverable(supabase, user.id, id);
  if (!deleted) throw Errors.notFound('Deliverable not found');
  return deleted;
}
