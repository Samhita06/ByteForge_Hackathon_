import { describe, expect, it } from 'vitest';
import { decryptTokenBundle, encryptTokenBundle } from '../modules/integrations/youtube/tokenCipher.js';

const key = 'ab'.repeat(32);

describe('YouTube token encryption', () => {
  it('encrypts tokens and binds ciphertext to the owner', () => {
    const tokenBundle = {
      access_token: 'access-secret',
      refresh_token: 'refresh-secret',
      expires_at: '2026-11-01T22:00:00.000Z',
    };
    const encrypted = encryptTokenBundle(tokenBundle, 'user-a', key);

    expect(encrypted).not.toContain('access-secret');
    expect(encrypted).not.toContain('refresh-secret');
    expect(decryptTokenBundle(encrypted, 'user-a', key)).toEqual(tokenBundle);
    expect(() => decryptTokenBundle(encrypted, 'user-b', key)).toThrowError(
      expect.objectContaining({ code: 'YOUTUBE_REAUTH_REQUIRED' }),
    );
  });

  it('rejects tampered encrypted tokens without returning token content', () => {
    const encrypted = encryptTokenBundle(
      { access_token: 'access-secret', refresh_token: 'refresh-secret' },
      'user-a',
      key,
    );
    const [iv, tag, ciphertext] = encrypted.split('.');
    const tamperedTag = `${tag.startsWith('A') ? 'B' : 'A'}${tag.slice(1)}`;
    const tampered = `${iv}.${tamperedTag}.${ciphertext}`;

    expect(() => decryptTokenBundle(tampered, 'user-a', key)).toThrowError(
      expect.objectContaining({ code: 'YOUTUBE_REAUTH_REQUIRED' }),
    );
  });

  it('can decrypt an access-token-only bundle for safe provider revocation', () => {
    const tokenBundle = { access_token: 'access-secret' };
    const encrypted = encryptTokenBundle(tokenBundle, 'user-a', key);

    expect(decryptTokenBundle(encrypted, 'user-a', key)).toEqual(tokenBundle);
  });
});
