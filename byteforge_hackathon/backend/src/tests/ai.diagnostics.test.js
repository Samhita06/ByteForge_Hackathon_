import { describe, expect, it } from 'vitest';
import { createGeminiDiagnostic } from '../modules/ai/ai.service.js';

describe('Gemini fallback diagnostics', () => {
  it('classifies provider HTTP errors and includes only a numeric status', () => {
    const error = Object.assign(new Error('private provider response'), { status: 429 });

    expect(createGeminiDiagnostic(error, 'gemini-3.8-flash')).toEqual({
      category: 'provider_http',
      status: 429,
      model: 'gemini-3.8-flash',
    });
  });

  it('classifies timeout, parse, network, and unknown errors without exposing messages', () => {
    expect(createGeminiDiagnostic(Object.assign(new Error('private'), { code: 'ETIMEDOUT' })).category)
      .toBe('timeout');
    expect(createGeminiDiagnostic(new SyntaxError('private response body')).category).toBe('response_parse');
    expect(createGeminiDiagnostic(new TypeError('private network detail')).category).toBe('network');
    expect(createGeminiDiagnostic(new Error('private error detail')).category).toBe('other');
  });

  it('omits invalid statuses and sanitizes an invalid model identifier', () => {
    const diagnostic = createGeminiDiagnostic(
      Object.assign(new Error('private'), { status: '401' }),
      'model with unsafe details',
    );

    expect(diagnostic).toEqual({ category: 'other', model: 'unknown' });
    expect(JSON.stringify(diagnostic)).not.toContain('private');
    expect(JSON.stringify(diagnostic)).not.toContain('unsafe details');
  });
});
