import { z } from 'zod';

export const invoiceStatus = z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']);
export const transactionType = z.enum(['income', 'expense']);
export const idParamSchema = z.object({ id: z.string().uuid() });

const money = z.coerce.number().min(0).max(999999999.99);
const currency = z
  .string()
  .length(3)
  .transform((value) => value.toUpperCase());

export const invoiceCreateSchema = z.object({
  collaboration_id: z.string().uuid(),
  invoice_number: z.string().min(1).max(40),
  amount: money,
  currency: currency.default('INR'),
  issue_date: z.string().date().optional(),
  due_date: z.string().date().optional().nullable(),
  status: invoiceStatus.default('draft'),
});

export const invoiceUpdateSchema = z.object({
  invoice_number: z.string().min(1).max(40).optional(),
  amount: money.optional(),
  currency: currency.optional(),
  issue_date: z.string().date().optional(),
  due_date: z.string().date().optional().nullable(),
  status: invoiceStatus.optional(),
  paid_at: z.string().datetime().optional().nullable(),
});

export const transactionCreateSchema = z.object({
  type: transactionType,
  amount: money,
  currency: currency.default('INR'),
  category: z.string().max(80).optional().nullable(),
  transaction_date: z.string().date().optional(),
  description: z.string().max(500).optional().nullable(),
  collaboration_id: z.string().uuid().optional().nullable(),
  invoice_id: z.string().uuid().optional().nullable(),
});

export const transactionUpdateSchema = transactionCreateSchema.partial();

export const invoiceListQuery = z.object({
  status: invoiceStatus.optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});

export const transactionListQuery = z.object({
  type: transactionType.optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});
