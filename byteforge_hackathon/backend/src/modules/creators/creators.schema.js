import { z } from 'zod';

export const platformEnum = z.enum(['instagram', 'youtube', 'tiktok', 'linkedin', 'other']);

export const profileUpdateSchema = z.object({
  display_name: z.string().min(1).max(80).optional(),
  username: z
    .string()
    .max(40)
    .regex(/^[a-zA-Z0-9_]*$/, 'Username may only contain letters, numbers, and underscores')
    .optional()
    .nullable(),
  bio: z.string().max(500).optional().nullable(),
  niche: z.string().max(80).optional().nullable(),
  primary_platform: platformEnum.optional().nullable(),
  reporting_currency: z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase())
    .optional(),
});
