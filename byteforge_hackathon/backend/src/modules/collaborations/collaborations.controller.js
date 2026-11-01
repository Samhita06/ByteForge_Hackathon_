import * as service from './collaborations.service.js';

export async function list(req, res, next) {
  try {
    const result = await service.list(req.supabase, req.user, req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const data = await service.getById(req.supabase, req.user, req.params.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const data = await service.create(req.supabase, req.user, req.body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const data = await service.update(req.supabase, req.user, req.params.id, req.body);
    res.json({ data });
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
