import * as service from './ai.service.js';

export async function generate(req, res, next) {
  try {
    const data = await service.createRecommendations(req.supabase, req.user);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
