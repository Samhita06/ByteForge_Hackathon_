import * as service from './ai.service.js';

export async function latest(req, res, next) {
  try {
    const data = await service.latestRecommendation(req.supabase, req.user.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function generate(req, res, next) {
  try {
    const data = await service.createRecommendations(req.supabase, req.user);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
