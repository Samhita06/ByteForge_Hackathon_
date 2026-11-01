import { describe, expect, it, vi } from 'vitest';
import * as service from '../modules/collaborations/collaborations.service.js';
import * as repo from '../modules/collaborations/collaborations.repository.js';
import { Errors } from '../shared/errors/AppError.js';

vi.mock('../modules/collaborations/collaborations.repository.js');

describe('cross-user ownership', () => {
  it('does not update another user\'s collaboration', async () => {
    repo.getCollaboration.mockRejectedValue(Errors.notFound('Collaboration not found'));
    await expect(service.update({}, { id: 'user-b' }, 'owned-by-a', { brand_name: 'Hack' })).rejects.toMatchObject({
      status: 404,
    });
    expect(repo.updateCollaboration).not.toHaveBeenCalled();
  });
});
