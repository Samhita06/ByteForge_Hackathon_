import { describe, expect, it, vi } from 'vitest';
import * as repo from '../modules/finance/finance.repository.js';

describe('mark invoice paid repository operation', () => {
  it('invokes the atomic RPC with only the target invoice id', async () => {
    const paidInvoice = { id: 'invoice-1', status: 'paid', amount: '25000.00', currency: 'INR' };
    const rpc = vi.fn().mockResolvedValue({ data: paidInvoice, error: null });
    const supabase = { rpc };

    await expect(repo.markInvoicePaid(supabase, 'invoice-1')).resolves.toEqual(paidInvoice);
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('mark_invoice_paid', { p_invoice_id: 'invoice-1' });
  });

  it('surfaces database errors returned by the atomic RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'XX000', message: 'payment transaction failed' },
    });

    await expect(repo.markInvoicePaid({ rpc }, 'invoice-1')).rejects.toMatchObject({
      status: 502,
      code: 'DATABASE_ERROR',
      message: 'Unable to mark invoice paid',
    });
  });
});
