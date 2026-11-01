import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { AppError } from '../../../shared/errors/AppError.js';
import { env } from '../../../config/env.js';

function getEncryptionKey(value = env.YOUTUBE_TOKEN_ENCRYPTION_KEY) {
  if (!/^[\da-f]{64}$/i.test(value)) {
    throw new AppError('YouTube token encryption is not configured correctly.', {
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
    });
  }
  return Buffer.from(value, 'hex');
}

export function encryptTokenBundle(tokenBundle, userId, encryptionKey) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(encryptionKey), iv);
  cipher.setAAD(Buffer.from(`byteforge-youtube:${userId}`, 'utf8'));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(tokenBundle), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptTokenBundle(serialized, userId, encryptionKey) {
  const key = getEncryptionKey(encryptionKey);
  try {
    const [ivEncoded, tagEncoded, encryptedEncoded, ...extra] = String(serialized).split('.');
    if (!ivEncoded || !tagEncoded || !encryptedEncoded || extra.length) throw new Error();
    const iv = Buffer.from(ivEncoded, 'base64url');
    const tag = Buffer.from(tagEncoded, 'base64url');
    const encrypted = Buffer.from(encryptedEncoded, 'base64url');
    if (iv.length !== 12 || tag.length !== 16 || encrypted.length === 0) throw new Error();

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(Buffer.from(`byteforge-youtube:${userId}`, 'utf8'));
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    const tokenBundle = JSON.parse(plaintext);
    if (
      typeof tokenBundle.access_token !== 'string' ||
      (tokenBundle.refresh_token !== undefined && typeof tokenBundle.refresh_token !== 'string')
    ) {
      throw new Error();
    }
    return tokenBundle;
  } catch {
    throw new AppError('Stored YouTube authorization is unavailable. Reconnect your account.', {
      status: 409,
      code: 'YOUTUBE_REAUTH_REQUIRED',
    });
  }
}
