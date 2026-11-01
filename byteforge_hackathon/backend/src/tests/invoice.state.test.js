import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as service from '../modules/finance/finance.service.js';
import * as repo from '../modules/finance/finance.repository.js';

vi.mock('../modules/finance/finance.repository.js');
vi.mock('../modules/collaborations/collaborations.repository.js', () => ({
  getCollaboration: vi.fn().mockResolvedValue({ id: 'col-1', user_id: 'user-a' }),
}));

const user = { id: 'user-a' };
const paidInvoice = {
  id: 'inv-1',
  status: 'paid',
  amount: 900,
  currency: 'INR',
  invoice_number: 'INV-9',
  collaboration_id: 'col-1',
  paid_at: '2026-11-01T00:00:00.000Z',
};

describe('atomic invoice payment service', () => {
  beforeEach(() => vi.resetAllMocks());

  it('marks a pending invoice paid through the atomic database operation', async () => {
    repo.markInvoicePaid.mockResolvedValue(paidInvoice);

    await expect(service.updateInvoice({}, user, 'inv-1', { status: 'paid' })).resolves.toEqual(paidInvoice);
    expect(repo.markInvoicePaid).toHaveBeenCalledTimes(1);
    expect(repo.markInvoicePaid).toHaveBeenCalledWith({}, 'inv-1');
    expect(repo.updateInvoice).not.toHaveBeenCalled();
    expect(repo.createTransaction).not.toHaveBeenCalled();
  });

  it('delegates repeated and concurrent requests to the idempotent database operation', async () => {
    repo.markInvoicePaid.mockResolvedValue(paidInvoice);

    const results = await Promise.all([
      service.updateInvoice({}, user, 'inv-1', { status: 'paid' }),
      service.updateInvoice({}, user, 'inv-1', { status: 'paid' }),
      service.updateInvoice({}, user, 'inv-1', { status: 'paid' }),
    ]);

    expect(results).toEqual([paidInvoice, paidInvoice, paidInvoice]);
    expect(repo.markInvoicePaid).toHaveBeenCalledTimes(3);
    expect(repo.createTransaction).not.toHaveBeenCalled();
  });

  it('propagates an RPC failure without attempting a separate invoice update', async () => {
    const databaseError = Object.assign(new Error('RPC failed'), { code: 'DATABASE_ERROR' });
    repo.markInvoicePaid.mockRejectedValue(databaseError);

    await expect(service.updateInvoice({}, user, 'inv-1', { status: 'paid' })).rejects.toBe(databaseError);
    expect(repo.updateInvoice).not.toHaveBeenCalled();
    expect(repo.createTransaction).not.toHaveBeenCalled();
  });

  it('returns not found when the atomic operation cannot see the invoice', async () => {
    repo.markInvoicePaid.mockResolvedValue(null);

    await expect(service.updateInvoice({}, user, 'missing-or-unowned', { status: 'paid' })).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('keeps an existing paid invoice on the same idempotent path', async () => {
    repo.markInvoicePaid.mockResolvedValue(paidInvoice);

    await expect(service.updateInvoice({}, user, 'inv-1', { status: 'paid' })).resolves.toEqual(paidInvoice);
    expect(repo.markInvoicePaid).toHaveBeenCalledWith({}, 'inv-1');
    expect(repo.getInvoice).not.toHaveBeenCalled();
  });

  it('rejects attempts to change financial fields while marking an invoice paid', async () => {
    await expect(
      service.updateInvoice({}, user, 'inv-1', { status: 'paid', amount: 1 }),
    ).rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
    expect(repo.markInvoicePaid).not.toHaveBeenCalled();
  });

  it('creates invoices requested as paid in a pending state before invoking atomic payment', async () => {
    const pendingInvoice = { ...paidInvoice, status: 'sent', paid_at: null };
    repo.createInvoice.mockResolvedValue(pendingInvoice);
    repo.markInvoicePaid.mockResolvedValue(paidInvoice);

    await expect(
      service.createInvoice({}, user, {
        collaboration_id: 'col-1',
        invoice_number: 'INV-9',
        amount: 900,
        currency: 'INR',
        status: 'paid',
      }),
    ).resolves.toEqual(paidInvoice);

    expect(repo.createInvoice).toHaveBeenCalledWith(
      {},
      user.id,
      expect.objectContaining({ status: 'sent' }),
    );
    expect(repo.markInvoicePaid).toHaveBeenCalledWith({}, 'inv-1');
  });
});
