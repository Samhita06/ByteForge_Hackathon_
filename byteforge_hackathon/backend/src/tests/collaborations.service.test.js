import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as service from '../modules/collaborations/collaborations.service.js';
import * as repo from '../modules/collaborations/collaborations.repository.js';

vi.mock('../modules/collaborations/collaborations.repository.js');

const user = { id: 'user-a' };
const supabase = {};

describe('collaboration CRUD', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates with the authenticated user id via repository', async () => {
    repo.createCollaboration.mockResolvedValue({ id: '1', brand_name: 'Acme', user_id: 'user-a' });
    const created = await service.create(supabase, user, { brand_name: 'Acme', campaign_name: 'Q1' });
    expect(repo.createCollaboration).toHaveBeenCalledWith(supabase, 'user-a', expect.any(Object));
    expect(created.user_id).toBe('user-a');
  });

  it('lists only through the user-scoped repository call', async () => {
    repo.listCollaborations.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20 });
    await service.list(supabase, user, {});
    expect(repo.listCollaborations).toHaveBeenCalledWith(supabase, 'user-a', {});
  });

  it('refuses to update a missing owned collaboration', async () => {
    repo.getCollaboration.mockRejectedValue(Object.assign(new Error('Collaboration not found'), { status: 404 }));
    await expect(service.update(supabase, user, 'missing', { brand_name: 'X' })).rejects.toThrow(
      'Collaboration not found',
    );
  });
});
