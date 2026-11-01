import { alertsService } from './alerts.service.js';

export async function list(req, res, next) {
  try {
    const data = await alertsService.list(req.supabase, req.user.id);
    res.json({ data });
  } catch (error) {
    next(error);
  }
}
