import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as service from '../modules/content/content.service.js';
import * as repo from '../modules/content/content.repository.js';
import * as collabRepo from '../modules/collaborations/collaborations.repository.js';

vi.mock('../modules/content/content.repository.js');
vi.mock('../modules/collaborations/collaborations.repository.js');

describe('content CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates content for the current user', async () => {
    repo.createContent.mockResolvedValue({ id: 'c1', title: 'Launch reel' });
    const created = await service.create({}, { id: 'user-a' }, { title: 'Launch reel', platform: 'instagram' });
    expect(repo.createContent).toHaveBeenCalledWith({}, 'user-a', expect.objectContaining({ title: 'Launch reel' }));
    expect(created.id).toBe('c1');
  });

  it('verifies linked collaborations belong to the user', async () => {
    collabRepo.getCollaboration.mockRejectedValue(new Error('Collaboration not found'));
    await expect(
      service.create({}, { id: 'user-a' }, { title: 'x', platform: 'youtube', collaboration_id: 'other' }),
    ).rejects.toThrow('Collaboration not found');
    expect(collabRepo.getCollaboration).toHaveBeenCalledWith({}, 'user-a', 'other');
    expect(repo.createContent).not.toHaveBeenCalled();
  });
});
