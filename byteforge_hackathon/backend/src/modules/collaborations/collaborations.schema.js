import { z } from 'zod';

export const collaborationStatus = z.enum(['draft', 'active', 'completed', 'cancelled']);
export const idParamSchema = z.object({ id: z.string().uuid() });

const money = z.coerce.number().min(0).max(999999999.99);
const currency = z
  .string()
  .length(3)
  .transform((value) => value.toUpperCase());

export const collaborationCreateSchema = z.object({
  brand_name: z.string().min(1).max(120),
  campaign_name: z.string().min(1).max(160),
  description: z.string().max(2000).optional().nullable(),
  agreed_amount: money.default(0),
  currency: currency.default('INR'),
  status: collaborationStatus.default('active'),
  start_date: z.string().date().optional().nullable(),
  deadline: z.string().date().optional().nullable(),
});

export const collaborationUpdateSchema = collaborationCreateSchema.partial();

export const collaborationListQuery = z.object({
  status: collaborationStatus.optional(),
  q: z.string().max(120).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});
