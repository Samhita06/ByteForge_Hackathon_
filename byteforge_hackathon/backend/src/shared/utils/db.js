import { AppError, Errors } from '../errors/AppError.js';
import { env } from '../../config/env.js';

function sanitizedDiagnostic(error, context) {
  const code = typeof error.code === 'string' && /^[A-Z0-9_-]{1,16}$/i.test(error.code) ? error.code : null;
  const statusValue = Number(error.status ?? error.statusCode);
  const status = Number.isInteger(statusValue) && statusValue >= 100 && statusValue <= 599 ? statusValue : null;
  const message = String(error.message || 'Unknown database error')
    .replace(/https?:\/\/\S+/gi, '[redacted-url]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted-token]')
    .replace(/\bsb_(?:publishable|secret)_[A-Za-z0-9_-]+\b/g, '[redacted-key]')
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[redacted-email]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, '[redacted-id]')
    .replace(/(['"])(.*?)\1/g, (match, quote, value) =>
      /^[a-z_][a-z0-9_.]*$/i.test(value) ? match : '[redacted-value]',
    )
    .replace(/[$€£₹]\s*\d[\d,.]*/g, '[redacted-amount]')
    .replace(/\b\d+\.\d{2,}\b/g, '[redacted-amount]')
    .replace(/[\r\n\t]+/g, ' ')
    .slice(0, 240);
  const operation =
    typeof context?.operation === 'string' && /^[a-z][a-z0-9_]{0,63}$/i.test(context.operation)
      ? context.operation
      : 'unknown';
  const table =
    typeof context?.table === 'string' && /^[a-z][a-z0-9_.]{0,63}$/i.test(context.table) ? context.table : 'unknown';

  return { operation, table, code, message, status };
}

function logDatabaseDiagnostic(error, context) {
  if (env.NODE_ENV !== 'development' || !context) return;
  console.error('[byteforge] database error', JSON.stringify(sanitizedDiagnostic(error, context)));
}

export function throwIfDbError(error, fallback = 'Database request failed', context) {
  if (!error) return;
  const message = error.message || fallback;
  if (message.toLowerCase().includes('row-level security')) {
    throw Errors.forbidden();
  }
  if (error.code === '23505') {
    throw Errors.conflict('A record with those unique values already exists.');
  }
  if (error.code === '23503') {
    throw Errors.validation('Related record was not found.');
  }
  if (error.code === '23514' || message.includes('must belong to the same user')) {
    throw Errors.validation(message);
  }
  logDatabaseDiagnostic(error, context);
  throw new AppError(fallback, { status: 502, code: 'DATABASE_ERROR' });
}

export async function requireOwnedRow(query, notFoundMessage) {
  const { data, error } = await query.maybeSingle();
  throwIfDbError(error);
  if (!data) throw Errors.notFound(notFoundMessage);
  return data;
}
