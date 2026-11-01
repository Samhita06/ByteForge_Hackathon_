import * as service from './deliverables.service.js';

export async function list(req, res, next) {
  try {
    res.json(await service.list(req.supabase, req.user, req.query));
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    res.status(201).json({ data: await service.create(req.supabase, req.user, req.body) });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    res.json({ data: await service.update(req.supabase, req.user, req.params.id, req.body) });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await service.remove(req.supabase, req.user, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
