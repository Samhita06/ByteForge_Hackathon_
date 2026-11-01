import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as service from '../modules/finance/finance.service.js';
import * as repo from '../modules/finance/finance.repository.js';

vi.mock('../modules/finance/finance.repository.js');
vi.mock('../modules/collaborations/collaborations.repository.js', () => ({
  getCollaboration: vi.fn().mockResolvedValue({ id: 'col-1', user_id: 'user-a' }),
}));

describe('invoice payment state', () => {
  beforeEach(() => vi.resetAllMocks());

  it('creates one income transaction when an invoice is marked paid', async () => {
    repo.getInvoice.mockResolvedValue({
      id: 'inv-1',
      status: 'sent',
      amount: 900,
      currency: 'INR',
      invoice_number: 'INV-9',
      collaboration_id: 'col-1',
    });
    repo.updateInvoice.mockResolvedValue({
      id: 'inv-1',
      status: 'paid',
      amount: 900,
      currency: 'INR',
      invoice_number: 'INV-9',
      collaboration_id: 'col-1',
      paid_at: '2026-11-01T00:00:00.000Z',
    });
    repo.findIncomeForInvoice.mockResolvedValue(null);
    repo.createTransaction.mockResolvedValue({ id: 'tx-1' });

    const updated = await service.updateInvoice({}, { id: 'user-a' }, 'inv-1', { status: 'paid' });
    expect(updated.status).toBe('paid');
    expect(repo.createTransaction).toHaveBeenCalledTimes(1);
    expect(repo.createTransaction).toHaveBeenCalledWith(
      {},
      'user-a',
      expect.objectContaining({ type: 'income', invoice_id: 'inv-1', amount: 900 }),
    );
  });

  it('does not create a second income row if payment already exists', async () => {
    repo.getInvoice.mockResolvedValue({ id: 'inv-1', status: 'sent' });
    repo.updateInvoice.mockResolvedValue({
      id: 'inv-1',
      status: 'paid',
      amount: 900,
      currency: 'INR',
      invoice_number: 'INV-9',
      collaboration_id: 'col-1',
    });
    repo.findIncomeForInvoice.mockResolvedValue({ id: 'tx-existing' });

    await service.updateInvoice({}, { id: 'user-a' }, 'inv-1', { status: 'paid' });
    expect(repo.createTransaction).not.toHaveBeenCalled();
  });
});
