export class AppError extends Error {
  constructor(message, { status = 400, code = 'BAD_REQUEST', details } = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const Errors = {
  unauthorized: (message = 'Authentication required') =>
    new AppError(message, { status: 401, code: 'UNAUTHORIZED' }),
  forbidden: (message = 'You do not have access to this resource') =>
    new AppError(message, { status: 403, code: 'FORBIDDEN' }),
  notFound: (message = 'Resource not found') =>
    new AppError(message, { status: 404, code: 'NOT_FOUND' }),
  conflict: (message = 'Conflict') => new AppError(message, { status: 409, code: 'CONFLICT' }),
  validation: (message, details) =>
    new AppError(message, { status: 422, code: 'VALIDATION_ERROR', details }),
  unavailable: (message = 'Service unavailable') =>
    new AppError(message, { status: 503, code: 'SERVICE_UNAVAILABLE' }),
};
