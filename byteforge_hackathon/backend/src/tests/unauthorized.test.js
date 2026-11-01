import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

const app = createApp();

describe('unauthorized access', () => {
  it('rejects collaborations without a token', async () => {
    const res = await request(app).get('/api/collaborations');
    expect(res.status).toBe(401);
  });

  it('rejects dashboard without a token', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(401);
  });

  it('rejects AI recommendations without a token', async () => {
    const res = await request(app).get('/api/ai/recommendations');
    expect(res.status).toBe(401);
  });
});
