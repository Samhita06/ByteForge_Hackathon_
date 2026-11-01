import { describe, expect, it } from 'vitest';
import { calculateFinancials } from '../modules/analytics/analytics.service.js';

describe('financial calculations', () => {
  it('counts income transactions only and does not add paid invoices', () => {
    const transactions = [
      { type: 'income', amount: '1000.00', currency: 'INR' },
      { type: 'income', amount: '500.50', currency: 'INR' },
      { type: 'expense', amount: '200.00', currency: 'INR' },
      { type: 'income', amount: '80.00', currency: 'USD' },
    ];
    const invoices = [
      { status: 'paid', amount: '1000.00', currency: 'INR' },
      { status: 'sent', amount: '300.00', currency: 'INR' },
      { status: 'draft', amount: '50.00', currency: 'USD' },
    ];
    const result = calculateFinancials(transactions, invoices, 'INR');
    expect(result.receivedEarnings).toBe(1500.5);
    expect(result.expenses).toBe(200);
    expect(result.netEarnings).toBe(1300.5);
    expect(result.pendingInvoiceTotal).toBe(300);
    expect(result.excludedOtherCurrencyCount).toBe(2);
  });

  it('returns zeros for empty records', () => {
    const result = calculateFinancials([], [], 'INR');
    expect(result).toMatchObject({
      receivedEarnings: 0,
      expenses: 0,
      netEarnings: 0,
      pendingInvoiceTotal: 0,
    });
  });
});
