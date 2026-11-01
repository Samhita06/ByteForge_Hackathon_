import * as service from './finance.service.js';

export async function listInvoices(req, res, next) {
  try {
    res.json(await service.listInvoices(req.supabase, req.user, req.query));
  } catch (err) {
    next(err);
  }
}

export async function createInvoice(req, res, next) {
  try {
    res.status(201).json({ data: await service.createInvoice(req.supabase, req.user, req.body) });
  } catch (err) {
    next(err);
  }
}

export async function updateInvoice(req, res, next) {
  try {
    res.json({ data: await service.updateInvoice(req.supabase, req.user, req.params.id, req.body) });
  } catch (err) {
    next(err);
  }
}

export async function listTransactions(req, res, next) {
  try {
    res.json(await service.listTransactions(req.supabase, req.user, req.query));
  } catch (err) {
    next(err);
  }
}

export async function createTransaction(req, res, next) {
  try {
    res.status(201).json({ data: await service.createTransaction(req.supabase, req.user, req.body) });
  } catch (err) {
    next(err);
  }
}

export async function updateTransaction(req, res, next) {
  try {
    res.json({ data: await service.updateTransaction(req.supabase, req.user, req.params.id, req.body) });
  } catch (err) {
    next(err);
  }
}

export async function removeTransaction(req, res, next) {
  try {
    await service.removeTransaction(req.supabase, req.user, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
