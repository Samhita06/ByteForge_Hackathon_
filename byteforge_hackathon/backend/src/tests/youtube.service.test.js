import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createYoutubeService } from '../modules/integrations/youtube/youtube.service.js';

const readonlyScope = 'https://www.googleapis.com/auth/youtube.readonly';
const configuration = {
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_REDIRECT_URI: 'http://localhost:4000/api/integrations/youtube/callback',
  SUPABASE_SERVICE_ROLE_KEY: 'test-server-key',
  YOUTUBE_TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32),
};

function providerResponse(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

describe('YouTube OAuth service', () => {
  let repository;
  let fetchImpl;
  let service;

  beforeEach(() => {
    repository = {
      createOAuthState: vi.fn().mockResolvedValue(undefined),
      consumeOAuthState: vi.fn(),
      storeConnection: vi.fn().mockResolvedValue(undefined),
      getConnection: vi.fn(),
      getTokenRecord: vi.fn(),
      updateTokenRecord: vi.fn(),
      disconnectConnection: vi.fn(),
    };
    fetchImpl = vi.fn();
    service = createYoutubeService({
      repository,
      fetchImpl,
      configuration,
      now: () => Date.parse('2026-11-01T12:00:00.000Z'),
      encrypt: vi.fn(() => 'encrypted-token-bundle'),
      decrypt: vi.fn(),
    });
  });

  it('creates an authenticated-user-bound PKCE state and requests only YouTube read-only scope', async () => {
    const authorizationUrl = new URL(await service.startAuthorization('user-a'));
    const state = authorizationUrl.searchParams.get('state');

    expect(authorizationUrl.origin).toBe('https://accounts.google.com');
    expect(authorizationUrl.searchParams.get('scope')).toBe(readonlyScope);
    expect(authorizationUrl.searchParams.get('access_type')).toBe('offline');
    expect(authorizationUrl.searchParams.get('code_challenge_method')).toBe('S256');
    expect(state).toHaveLength(43);
    expect(repository.createOAuthState).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-a',
        stateHash: expect.stringMatching(/^[\da-f]{64}$/),
        codeVerifier: expect.any(String),
        expiresAt: '2026-11-01T12:05:00.000Z',
      }),
    );
    expect(repository.createOAuthState.mock.calls[0][0].stateHash).not.toBe(state);
  });

  it('rejects unknown and replayed states before contacting Google', async () => {
    repository.consumeOAuthState.mockResolvedValue(null);

    await expect(service.handleCallback({ code: 'oauth-code', state: 'x'.repeat(43) })).resolves.toBe(
      'invalid_state',
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('consumes state when the user denies consent and does not exchange tokens', async () => {
    repository.consumeOAuthState.mockResolvedValue({ user_id: 'user-a', code_verifier: 'verifier' });

    await expect(
      service.handleCallback({ state: 'x'.repeat(43), providerError: 'access_denied' }),
    ).resolves.toBe('denied');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('stores encrypted tokens and the channel returned by channels.list mine=true', async () => {
    repository.consumeOAuthState.mockResolvedValue({ user_id: 'user-a', code_verifier: 'stored-verifier' });
    fetchImpl
      .mockResolvedValueOnce(
        providerResponse({
          access_token: 'access-secret',
          refresh_token: 'refresh-secret',
          expires_in: 3600,
          scope: readonlyScope,
        }),
      )
      .mockResolvedValueOnce(
        providerResponse({
          items: [
            {
              id: 'channel-from-google',
              snippet: { title: 'Creator channel', thumbnails: { default: { url: 'https://img.example/thumb' } } },
              statistics: { subscriberCount: '12', viewCount: '34', videoCount: '5' },
            },
          ],
        }),
      );

    await expect(service.handleCallback({ code: 'oauth-code', state: 'x'.repeat(43) })).resolves.toBe(
      'connected',
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      'https://www.googleapis.com/youtube/v3/channels?part=snippet%2Cstatistics&mine=true&maxResults=1',
      expect.objectContaining({
        headers: { Authorization: 'Bearer access-secret', Accept: 'application/json' },
      }),
    );
    expect(repository.storeConnection).toHaveBeenCalledWith(
      'user-a',
      expect.objectContaining({ channelId: 'channel-from-google', channelTitle: 'Creator channel' }),
      'encrypted-token-bundle',
      '2026-11-01T13:00:00.000Z',
    );
    expect(JSON.stringify(repository.storeConnection.mock.calls)).not.toContain('access-secret');
    expect(JSON.stringify(repository.storeConnection.mock.calls)).not.toContain('refresh-secret');
  });

  it('does not store tokens if Google reports no YouTube channel', async () => {
    repository.consumeOAuthState.mockResolvedValue({ user_id: 'user-a', code_verifier: 'stored-verifier' });
    fetchImpl
      .mockResolvedValueOnce(
        providerResponse({
          access_token: 'access-secret',
          refresh_token: 'refresh-secret',
          expires_in: 3600,
          scope: readonlyScope,
        }),
      )
      .mockResolvedValueOnce(providerResponse({ items: [] }));

    await expect(service.handleCallback({ code: 'oauth-code', state: 'x'.repeat(43) })).resolves.toBe(
      'no_channel',
    );
    expect(repository.storeConnection).not.toHaveBeenCalled();
  });

  it('returns a reauthorization error when a refresh token is revoked', async () => {
    repository.getTokenRecord.mockResolvedValue({
      token_ciphertext: 'stored-ciphertext',
      expires_at: '2026-11-01T11:00:00.000Z',
    });
    service = createYoutubeService({
      repository,
      fetchImpl: vi.fn().mockResolvedValue(providerResponse({ error: 'invalid_grant' }, 400)),
      configuration,
      now: () => Date.parse('2026-11-01T12:00:00.000Z'),
      encrypt: vi.fn(),
      decrypt: vi.fn(() => ({
        access_token: 'expired-access',
        refresh_token: 'revoked-refresh',
        expires_at: '2026-11-01T11:00:00.000Z',
      })),
    });

    await expect(service.channelStatistics('user-a')).rejects.toMatchObject({
      status: 409,
      code: 'YOUTUBE_REAUTH_REQUIRED',
    });
  });

  it('preserves the granted read-only scope when Google omits scope during token refresh', async () => {
    repository.getTokenRecord.mockResolvedValue({
      token_ciphertext: 'stored-ciphertext',
      expires_at: '2026-11-01T11:00:00.000Z',
    });
    repository.updateTokenRecord.mockResolvedValue(true);
    fetchImpl
      .mockResolvedValueOnce(providerResponse({ access_token: 'refreshed-access', expires_in: 3600 }))
      .mockResolvedValueOnce(
        providerResponse({
          items: [
            {
              id: 'channel-a',
              snippet: { title: 'Creator channel' },
              statistics: { subscriberCount: '12' },
            },
          ],
        }),
      );
    service = createYoutubeService({
      repository,
      fetchImpl,
      configuration,
      now: () => Date.parse('2026-11-01T12:00:00.000Z'),
      encrypt: vi.fn(() => 'refreshed-ciphertext'),
      decrypt: vi.fn(() => ({
        access_token: 'expired-access',
        refresh_token: 'valid-refresh',
        scope: readonlyScope,
        expires_at: '2026-11-01T11:00:00.000Z',
      })),
    });

    await expect(service.channelStatistics('user-a')).resolves.toMatchObject({
      channel: { id: 'channel-a' },
      statistics: { subscriberCount: '12' },
    });
    expect(repository.updateTokenRecord).toHaveBeenCalledWith(
      'user-a',
      'refreshed-ciphertext',
      '2026-11-01T13:00:00.000Z',
    );
  });

  it('maps YouTube quota failures to a safe retry-later error', async () => {
    repository.getTokenRecord.mockResolvedValue({
      token_ciphertext: 'stored-ciphertext',
      expires_at: '2026-11-01T13:00:00.000Z',
    });
    service = createYoutubeService({
      repository,
      fetchImpl: vi.fn().mockResolvedValue(
        providerResponse({ error: { errors: [{ reason: 'quotaExceeded' }] } }, 403),
      ),
      configuration,
      now: () => Date.parse('2026-11-01T12:00:00.000Z'),
      encrypt: vi.fn(),
      decrypt: vi.fn(() => ({
        access_token: 'valid-access',
        refresh_token: 'valid-refresh',
        expires_at: '2026-11-01T13:00:00.000Z',
      })),
    });

    await expect(service.channelStatistics('user-a')).rejects.toMatchObject({
      status: 429,
      code: 'YOUTUBE_QUOTA_EXCEEDED',
    });
  });

  it('revokes the stored refresh token before conditionally disconnecting local credentials', async () => {
    const userClient = { id: 'user-b-client' };
    repository.getTokenRecord.mockResolvedValue({
      token_ciphertext: 'encrypted-user-b-tokens',
      connection_generation: 'generation-b',
    });
    repository.disconnectConnection.mockResolvedValue(true);
    fetchImpl.mockResolvedValue(providerResponse({}, 200));
    const decrypt = vi.fn(() => ({
      access_token: 'access-secret',
      refresh_token: 'refresh-secret',
    }));
    service = createYoutubeService({ repository, fetchImpl, configuration, decrypt });

    const result = await service.disconnect(userClient, 'user-b');
    expect(result).toEqual({
      localDisconnected: true,
      providerRevocation: 'revoked',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/revoke',
      expect.objectContaining({
        method: 'POST',
        body: new URLSearchParams({ token: 'refresh-secret' }),
      }),
    );
    expect(decrypt).toHaveBeenCalledWith(
      'encrypted-user-b-tokens',
      'user-b',
      configuration.YOUTUBE_TOKEN_ENCRYPTION_KEY,
    );
    expect(repository.getTokenRecord).toHaveBeenCalledWith('user-b');
    expect(repository.disconnectConnection).toHaveBeenCalledWith(userClient, 'generation-b');
    expect(JSON.stringify(result)).not.toContain('access-secret');
    expect(JSON.stringify(result)).not.toContain('refresh-secret');
  });

  it('uses the access token for revocation when no refresh token is stored', async () => {
    repository.getTokenRecord.mockResolvedValue({
      token_ciphertext: 'encrypted-access-token',
      connection_generation: 'generation-a',
    });
    repository.disconnectConnection.mockResolvedValue(true);
    fetchImpl.mockResolvedValue(providerResponse({}, 200));
    service = createYoutubeService({
      repository,
      fetchImpl,
      configuration,
      decrypt: vi.fn(() => ({ access_token: 'access-secret' })),
    });

    await expect(service.disconnect({ id: 'user-a-client' }, 'user-a')).resolves.toEqual({
      localDisconnected: true,
      providerRevocation: 'revoked',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/revoke',
      expect.objectContaining({ body: new URLSearchParams({ token: 'access-secret' }) }),
    );
  });

  it.each([
    ['provider failure', providerResponse({ error: 'server_error' }, 503), 'failed'],
    ['already-invalid token', providerResponse({ error: 'invalid_token' }, 400), 'already_invalid'],
  ])('disconnects locally and reports %s without claiming revocation', async (_label, response, result) => {
    repository.getTokenRecord.mockResolvedValue({
      token_ciphertext: 'encrypted-tokens',
      connection_generation: 'generation-a',
    });
    repository.disconnectConnection.mockResolvedValue(true);
    fetchImpl.mockResolvedValue(response);
    service = createYoutubeService({
      repository,
      fetchImpl,
      configuration,
      decrypt: vi.fn(() => ({ access_token: 'access-secret', refresh_token: 'refresh-secret' })),
    });

    await expect(service.disconnect({ id: 'user-a-client' }, 'user-a')).resolves.toEqual({
      localDisconnected: true,
      providerRevocation: result,
    });
    expect(repository.disconnectConnection).toHaveBeenCalledWith(
      { id: 'user-a-client' },
      'generation-a',
    );
  });

  it('reports an unknown provider outcome after timeout and still disconnects locally', async () => {
    repository.getTokenRecord.mockResolvedValue({
      token_ciphertext: 'encrypted-tokens',
      connection_generation: 'generation-a',
    });
    repository.disconnectConnection.mockResolvedValue(true);
    fetchImpl.mockRejectedValue(new Error('timeout'));
    service = createYoutubeService({
      repository,
      fetchImpl,
      configuration,
      decrypt: vi.fn(() => ({ access_token: 'access-secret', refresh_token: 'refresh-secret' })),
    });

    await expect(service.disconnect({ id: 'user-a-client' }, 'user-a')).resolves.toEqual({
      localDisconnected: true,
      providerRevocation: 'unknown',
    });
  });

  it('handles missing or undecryptable credentials without attempting revocation', async () => {
    repository.getTokenRecord.mockResolvedValue(null);
    repository.disconnectConnection.mockResolvedValue(true);

    await expect(service.disconnect({ id: 'user-a-client' }, 'user-a')).resolves.toEqual({
      localDisconnected: true,
      providerRevocation: 'not_attempted',
    });
    expect(repository.disconnectConnection).toHaveBeenLastCalledWith(
      { id: 'user-a-client' },
      null,
    );
    expect(fetchImpl).not.toHaveBeenCalled();

    repository.getTokenRecord.mockResolvedValue({
      token_ciphertext: 'corrupt-ciphertext',
      connection_generation: 'generation-a',
    });
    const decrypt = vi.fn(() => {
      throw new Error('ciphertext details');
    });
    service = createYoutubeService({ repository, fetchImpl, configuration, decrypt });

    await expect(service.disconnect({ id: 'user-a-client' }, 'user-a')).resolves.toEqual({
      localDisconnected: true,
      providerRevocation: 'not_attempted',
    });
    expect(repository.disconnectConnection).toHaveBeenLastCalledWith(
      { id: 'user-a-client' },
      'generation-a',
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('preserves a newer connection when the snapshotted generation changed', async () => {
    repository.getTokenRecord.mockResolvedValue({
      token_ciphertext: 'encrypted-user-b-tokens',
      connection_generation: 'old-generation',
    });
    repository.disconnectConnection.mockResolvedValue(false);
    fetchImpl.mockResolvedValue(providerResponse({}, 200));
    service = createYoutubeService({
      repository,
      fetchImpl,
      configuration,
      decrypt: vi.fn(() => ({ access_token: 'access-b', refresh_token: 'refresh-b' })),
    });

    await expect(service.disconnect({ id: 'user-b-client' }, 'user-b')).resolves.toEqual({
      localDisconnected: false,
      providerRevocation: 'revoked',
    });
    expect(repository.getTokenRecord).toHaveBeenCalledWith('user-b');
    expect(repository.disconnectConnection).toHaveBeenCalledWith(
      { id: 'user-b-client' },
      'old-generation',
    );
  });

  it('scopes metadata status to the authenticated user client', async () => {
    const userClient = { id: 'user-b-client' };
    repository.getConnection.mockResolvedValue({
      channel_id: 'channel-b',
      channel_title: 'B channel',
      channel_thumbnail_url: null,
      connected_at: '2026-11-01T12:00:00.000Z',
    });

    await expect(service.connectionStatus(userClient, 'user-b')).resolves.toEqual({
      connected: true,
      channel: { id: 'channel-b', title: 'B channel', thumbnailUrl: null },
      connectedAt: '2026-11-01T12:00:00.000Z',
    });
    expect(repository.getConnection).toHaveBeenCalledWith(userClient, 'user-b');
  });
});
