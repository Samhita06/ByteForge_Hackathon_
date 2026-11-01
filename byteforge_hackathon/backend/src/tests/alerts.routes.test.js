import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { list } = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock('../middleware/auth.middleware.js', () => ({
  requireAuth(req, _res, next) {
    req.user = { id: 'authenticated-user' };
    req.supabase = { client: 'user-scoped' };
    next();
  },
}));

vi.mock('../modules/alerts/alerts.service.js', () => ({
  alertsService: { list },
}));

import { alertsRouter } from '../modules/alerts/alerts.routes.js';

const app = express();
app.use('/api/alerts', alertsRouter);

afterEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/alerts', () => {
  it('returns the established data envelope using the authenticated user context', async () => {
    const alerts = [
      {
        id: 'deliverable:item-1',
        type: 'deliverable_overdue',
        severity: 'high',
        title: 'Overdue deliverable',
        message: 'Submit the draft is overdue.',
        relatedRecordId: 'item-1',
        date: '2026-11-01',
      },
    ];
    list.mockResolvedValue(alerts);

    const response = await request(app).get('/api/alerts');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: alerts });
    expect(list).toHaveBeenCalledWith({ client: 'user-scoped' }, 'authenticated-user');
  });
});
