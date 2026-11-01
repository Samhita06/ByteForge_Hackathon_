import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from '../config/env.js';
import { throwIfDbError } from '../shared/utils/db.js';

describe('database error diagnostics', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs only sanitized context in development and keeps the public error generic', () => {
    const previousNodeEnv = env.NODE_ENV;
    env.NODE_ENV = 'development';
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    const sensitiveToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';

    try {
      expect(() =>
        throwIfDbError(
          {
            code: '42P01',
            message: `relation "profiles" missing for creator@example.com ${sensitiveToken} https://demo.example.test/rest/v1 amount '12345.67'`,
            status: 404,
          },
          'Database request failed',
          { operation: 'select_dashboard_profile', table: 'profiles' },
        ),
      ).toThrow(
        expect.objectContaining({
          status: 502,
          code: 'DATABASE_ERROR',
          message: 'Database request failed',
        }),
      );
      expect(logger).toHaveBeenCalledTimes(1);
      expect(logger.mock.calls[0][1]).toContain('"operation":"select_dashboard_profile"');
      expect(logger.mock.calls[0][1]).toContain('"table":"profiles"');
      expect(logger.mock.calls[0][1]).toContain('"code":"42P01"');
      expect(logger.mock.calls[0][1]).toContain('"status":404');
      expect(logger.mock.calls[0][1]).not.toContain('creator@example.com');
      expect(logger.mock.calls[0][1]).not.toContain(sensitiveToken);
      expect(logger.mock.calls[0][1]).not.toContain('demo.example.test');
      expect(logger.mock.calls[0][1]).not.toContain('12345.67');
      expect(logger.mock.calls[0][1]).toContain('"profiles"');
    } finally {
      env.NODE_ENV = previousNodeEnv;
    }
  });

  it('does not log database diagnostics outside development', () => {
    const previousNodeEnv = env.NODE_ENV;
    env.NODE_ENV = 'production';
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      expect(() =>
        throwIfDbError(
          { code: 'XX000', message: 'database unavailable' },
          'Database request failed',
          { operation: 'select_dashboard_profile', table: 'profiles' },
        ),
      ).toThrow(expect.objectContaining({ code: 'DATABASE_ERROR' }));
      expect(logger).not.toHaveBeenCalled();
    } finally {
      env.NODE_ENV = previousNodeEnv;
    }
  });
});
