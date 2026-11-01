import { Errors } from '../shared/errors/AppError.js';
import { createAuthClient, createUserClient } from '../database/supabaseClient.js';

export function createAuthMiddleware({ getAuthClient = createAuthClient, getUserClient = createUserClient } = {}) {
  return async function requireAuth(req, _res, next) {
    try {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
      if (!token) {
        throw Errors.unauthorized();
      }

      const { data, error } = await getAuthClient().auth.getUser(token);
      if (error || !data?.user) {
        throw Errors.unauthorized('Session expired or invalid. Please sign in again.');
      }

      req.user = data.user;
      req.accessToken = token;
      req.supabase = getUserClient(token);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export const requireAuth = createAuthMiddleware();
