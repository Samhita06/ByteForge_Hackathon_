import { Router } from 'express';
import { env } from '../../config/env.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'byteforge-api',
    supabaseConfigured: Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
    geminiConfigured: Boolean(env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});
