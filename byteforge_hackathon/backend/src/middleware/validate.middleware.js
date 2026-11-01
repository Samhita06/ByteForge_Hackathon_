import { Errors } from '../shared/errors/AppError.js';

export function validate({ body, query, params }) {
  return (req, _res, next) => {
    try {
      if (body) {
        const parsed = body.safeParse(req.body);
        if (!parsed.success) {
          throw Errors.validation('Invalid request body', parsed.error.flatten());
        }
        req.body = parsed.data;
      }
      if (query) {
        const parsed = query.safeParse(req.query);
        if (!parsed.success) {
          throw Errors.validation('Invalid query parameters', parsed.error.flatten());
        }
        Object.defineProperty(req, 'query', { value: parsed.data, writable: true, configurable: true });
      }
      if (params) {
        const parsed = params.safeParse(req.params);
        if (!parsed.success) {
          throw Errors.validation('Invalid path parameters', parsed.error.flatten());
        }
        Object.defineProperty(req, 'params', { value: parsed.data, writable: true, configurable: true });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
