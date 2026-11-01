import { describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import { validate } from '../middleware/validate.middleware.js';
import { collaborationCreateSchema } from '../modules/collaborations/collaborations.schema.js';
import { errorHandler } from '../middleware/error.middleware.js';

const app = express();
app.use(express.json());
app.post('/collab', validate({ body: collaborationCreateSchema }), (_req, res) => res.status(201).json({ ok: true }));
app.use(errorHandler);

describe('input validation', () => {
  it('rejects missing brand name', async () => {
    const res = await request(app).post('/collab').send({ campaign_name: 'Spring' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects negative amounts', async () => {
    const res = await request(app).post('/collab').send({
      brand_name: 'Acme',
      campaign_name: 'Spring',
      agreed_amount: -10,
    });
    expect(res.status).toBe(422);
  });

  it('accepts a valid payload', async () => {
    const res = await request(app).post('/collab').send({
      brand_name: 'Acme',
      campaign_name: 'Spring launch',
      agreed_amount: 25000,
      currency: 'inr',
    });
    expect(res.status).toBe(201);
  });
});
