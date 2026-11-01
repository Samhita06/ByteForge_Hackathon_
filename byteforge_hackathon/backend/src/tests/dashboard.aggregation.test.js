import { describe, expect, it } from 'vitest';
import { calculateFinancials } from '../modules/analytics/analytics.service.js';

describe('dashboard aggregation', () => {
  it('keeps pending invoices separate from received earnings', () => {
    const result = calculateFinancials(
      [{ type: 'income', amount: 2500, currency: 'INR' }],
      [
        { status: 'paid', amount: 2500, currency: 'INR' },
        { status: 'sent', amount: 4000, currency: 'INR' },
      ],
      'INR',
    );
    expect(result.receivedEarnings).toBe(2500);
    expect(result.pendingInvoiceTotal).toBe(4000);
  });
});
