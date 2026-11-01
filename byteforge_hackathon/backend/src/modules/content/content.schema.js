import { z } from 'zod';

export const platformEnum = z.enum(['instagram', 'youtube', 'tiktok', 'linkedin', 'other']);
export const contentTypeEnum = z.enum(['post', 'reel', 'short', 'video', 'story', 'carousel', 'article', 'other']);
export const contentStatus = z.enum(['idea', 'scheduled', 'in_progress', 'published', 'cancelled']);
export const idParamSchema = z.object({ id: z.string().uuid() });

export const contentCreateSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(2000).optional().nullable(),
  platform: platformEnum,
  content_type: contentTypeEnum.default('post'),
  scheduled_date: z.string().date().optional().nullable(),
  status: contentStatus.default('idea'),
  collaboration_id: z.string().uuid().optional().nullable(),
});

export const contentUpdateSchema = contentCreateSchema.partial();

export const contentListQuery = z.object({
  platform: platformEnum.optional(),
  status: contentStatus.optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
