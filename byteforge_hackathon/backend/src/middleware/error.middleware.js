import { AppError } from '../shared/errors/AppError.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const code = err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
  const message =
    status >= 500
      ? 'Something went wrong. Please try again.'
      : err.message || 'Request failed';

  if (status >= 500) {
    console.error('[byteforge]', err.name, err.message);
  }

  res.status(status).json({
    error: {
      code,
      message,
      details: err instanceof AppError ? err.details : undefined,
    },
  });
}
