import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { errorHandler } from '../middleware/error.middleware.js';

function buildApp(middleware) {
  const app = express();
  app.get('/protected', middleware, (req, res) => {
    res.json({ userId: req.user.id });
  });
  app.use(errorHandler);
  return app;
}

describe('auth middleware', () => {
  it('rejects missing bearer token', async () => {
    const middleware = createAuthMiddleware({
      getAuthClient: () => ({ auth: { getUser: vi.fn() } }),
      getUserClient: vi.fn(),
    });
    const res = await request(buildApp(middleware)).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects malformed authorization headers before token verification', async () => {
    const getUser = vi.fn();
    const middleware = createAuthMiddleware({
      getAuthClient: () => ({ auth: { getUser } }),
      getUserClient: vi.fn(),
    });
    const app = buildApp(middleware);

    for (const authorization of ['Bearer', 'Basic opaque-token']) {
      const res = await request(app).get('/protected').set('Authorization', authorization);
      expect(res.status).toBe(401);
    }

    expect(getUser).not.toHaveBeenCalled();
  });

  it('rejects invalid tokens', async () => {
    const middleware = createAuthMiddleware({
      getAuthClient: () => ({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } }) },
      }),
      getUserClient: vi.fn(),
    });
    const res = await request(buildApp(middleware))
      .get('/protected')
      .set('Authorization', 'Bearer expired-token');
    expect(res.status).toBe(401);
  });

  it('attaches the verified user', async () => {
    const getUserClient = vi.fn().mockReturnValue({ from: vi.fn() });
    const middleware = createAuthMiddleware({
      getAuthClient: () => ({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      }),
      getUserClient,
    });
    const res = await request(buildApp(middleware)).get('/protected').set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('user-1');
    expect(getUserClient).toHaveBeenCalledWith('valid');
  });
});
