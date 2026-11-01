import { createClient } from '@supabase/supabase-js';
import { env, assertSupabaseConfigured } from '../config/env.js';

export function createUserClient(accessToken) {
  assertSupabaseConfigured();
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function createAuthClient() {
  assertSupabaseConfigured();
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function createServiceClient() {
  assertSupabaseConfigured();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    const error = new Error('YouTube server-side storage is not configured.');
    error.status = 503;
    error.code = 'SERVICE_UNAVAILABLE';
    throw error;
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
