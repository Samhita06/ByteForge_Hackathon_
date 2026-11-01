import * as service from './creators.service.js';

export async function getProfile(req, res, next) {
  try {
    const profile = await service.getProfile(req.supabase, req.user);
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
}

export async function patchProfile(req, res, next) {
  try {
    const profile = await service.updateProfile(req.supabase, req.user, req.body);
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
}
