import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { updateInvoice } = vi.hoisted(() => ({ updateInvoice: vi.fn() }));

vi.mock('../middleware/auth.middleware.js', () => ({
  requireAuth(req, _res, next) {
    req.user = { id: 'user-1' };
    req.supabase = { rpc: vi.fn() };
    next();
  },
}));

vi.mock('../modules/finance/finance.service.js', () => ({
  listInvoices: vi.fn(),
  createInvoice: vi.fn(),
  updateInvoice,
  listTransactions: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  removeTransaction: vi.fn(),
}));

import { invoicesRouter } from '../modules/finance/finance.routes.js';

const app = express();
app.use(express.json());
app.use('/api/invoices', invoicesRouter);

afterEach(() => {
  vi.clearAllMocks();
});

describe('invoice payment route compatibility', () => {
  it('keeps PATCH /api/invoices/:id response contract', async () => {
    const invoice = { id: '11111111-1111-4111-8111-111111111111', status: 'paid' };
    updateInvoice.mockResolvedValue(invoice);

    const response = await request(app)
      .patch(`/api/invoices/${invoice.id}`)
      .send({ status: 'paid' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: invoice });
    expect(updateInvoice).toHaveBeenCalledWith(
      expect.any(Object),
      { id: 'user-1' },
      invoice.id,
      { status: 'paid' },
    );
  });
});
