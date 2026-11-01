import * as service from './analytics.service.js';

export async function getDashboard(req, res, next) {
  try {
    const data = await service.getDashboardSummary(req.supabase, req.user);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
