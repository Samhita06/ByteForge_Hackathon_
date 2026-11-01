import { z } from 'zod';

export const deliverableStatus = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
export const idParamSchema = z.object({ id: z.string().uuid() });

export const deliverableCreateSchema = z.object({
  collaboration_id: z.string().uuid(),
  title: z.string().min(1).max(160),
  description: z.string().max(2000).optional().nullable(),
  due_date: z.string().date().optional().nullable(),
  status: deliverableStatus.default('pending'),
});

export const deliverableUpdateSchema = deliverableCreateSchema.partial();

export const deliverableListQuery = z.object({
  collaboration_id: z.string().uuid().optional(),
  status: deliverableStatus.optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
});
