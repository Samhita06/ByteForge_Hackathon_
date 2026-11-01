import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().optional().default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_ANON_KEY: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().optional().default('gemini-2.0-flash'),
});

export const env = envSchema.parse(process.env);

export function assertSupabaseConfigured() {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    const error = new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
    error.status = 503;
    error.code = 'SERVICE_UNAVAILABLE';
    throw error;
  }
}
