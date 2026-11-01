import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as service from '../modules/collaborations/collaborations.service.js';
import * as repo from '../modules/collaborations/collaborations.repository.js';
import * as financeService from '../modules/finance/finance.service.js';
import * as financeRepo from '../modules/finance/finance.repository.js';
import { Errors } from '../shared/errors/AppError.js';

vi.mock('../modules/collaborations/collaborations.repository.js');
vi.mock('../modules/finance/finance.repository.js');

describe('cross-user ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not update another user\'s collaboration', async () => {
    repo.getCollaboration.mockRejectedValue(Errors.notFound('Collaboration not found'));
    await expect(service.update({}, { id: 'user-b' }, 'owned-by-a', { brand_name: 'Hack' })).rejects.toMatchObject({
      status: 404,
    });
    expect(repo.updateCollaboration).not.toHaveBeenCalled();
  });

  it('does not update another user\'s invoice', async () => {
    const supabase = {};
    financeRepo.getInvoice.mockRejectedValue(Errors.notFound('Invoice not found'));

    await expect(
      financeService.updateInvoice(supabase, { id: 'user-b' }, 'owned-by-a', { status: 'sent' }),
    ).rejects.toMatchObject({ status: 404 });

    expect(financeRepo.getInvoice).toHaveBeenCalledWith(supabase, 'user-b', 'owned-by-a');
    expect(financeRepo.updateInvoice).not.toHaveBeenCalled();
  });

  it('does not update or delete another user\'s transaction', async () => {
    const supabase = {};
    financeRepo.getTransaction.mockRejectedValue(Errors.notFound('Transaction not found'));

    await expect(
      financeService.updateTransaction(supabase, { id: 'user-b' }, 'owned-by-a', { description: 'Hack' }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(financeService.removeTransaction(supabase, { id: 'user-b' }, 'owned-by-a')).rejects.toMatchObject({
      status: 404,
    });

    expect(financeRepo.getTransaction).toHaveBeenNthCalledWith(1, supabase, 'user-b', 'owned-by-a');
    expect(financeRepo.getTransaction).toHaveBeenNthCalledWith(2, supabase, 'user-b', 'owned-by-a');
    expect(financeRepo.updateTransaction).not.toHaveBeenCalled();
    expect(financeRepo.deleteTransaction).not.toHaveBeenCalled();
  });
});
