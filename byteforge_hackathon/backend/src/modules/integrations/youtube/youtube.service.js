import { createHash, randomBytes } from 'node:crypto';
import { AppError, Errors } from '../../../shared/errors/AppError.js';
import { env } from '../../../config/env.js';
import { decryptTokenBundle, encryptTokenBundle } from './tokenCipher.js';
import * as repo from './youtube.repository.js';

const YOUTUBE_READONLY_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';
const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const YOUTUBE_CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';
const OAUTH_STATE_TTL_MS = 5 * 60 * 1000;
const EXPIRY_SKEW_MS = 60 * 1000;
const REVOCATION_TIMEOUT_MS = 5000;

function providerError(message, status = 502, code = 'YOUTUBE_PROVIDER_ERROR') {
  return new AppError(message, { status, code });
}

function hashState(state) {
  return createHash('sha256').update(state).digest('hex');
}

function createPkcePair() {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function assertAuthorizationConfiguration(configuration) {
  if (
    !configuration.GOOGLE_CLIENT_ID ||
    !configuration.GOOGLE_CLIENT_SECRET ||
    !configuration.GOOGLE_REDIRECT_URI ||
    !configuration.SUPABASE_SERVICE_ROLE_KEY ||
    !/^[\da-f]{64}$/i.test(configuration.YOUTUBE_TOKEN_ENCRYPTION_KEY)
  ) {
    throw Errors.unavailable('YouTube integration is not configured.');
  }
}

async function responseJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function postForm(fetchImpl, url, values) {
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams(values),
    });
  } catch {
    throw providerError('Google OAuth is temporarily unavailable.');
  }
  const payload = await responseJson(response);
  return { response, payload };
}

function validateTokenPayload(payload, { requireRefreshToken = false } = {}) {
  if (
    typeof payload.access_token !== 'string' ||
    !Number.isFinite(Number(payload.expires_in)) ||
    Number(payload.expires_in) <= 0 ||
    typeof payload.scope !== 'string'
  ) {
    throw providerError('Google returned an invalid authorization response.');
  }
  const scopes = payload.scope.split(/\s+/).filter(Boolean);
  if (scopes.length !== 1 || scopes[0] !== YOUTUBE_READONLY_SCOPE) {
    throw providerError('Google authorization did not grant the required read-only YouTube scope.', 403);
  }
  if (requireRefreshToken && typeof payload.refresh_token !== 'string') {
    throw providerError('Google did not issue offline access. Reconnect and approve access again.', 409);
  }
}

function tokenExpiry(tokenPayload, now) {
  return new Date(now + Number(tokenPayload.expires_in) * 1000).toISOString();
}

function selectChannel(payload) {
  const item = Array.isArray(payload.items) ? payload.items[0] : null;
  if (!item || typeof item.id !== 'string' || typeof item.snippet?.title !== 'string') return null;
  return {
    channelId: item.id,
    channelTitle: item.snippet.title,
    channelThumbnailUrl: item.snippet.thumbnails?.default?.url || null,
    statistics: {
      subscriberCount: item.statistics?.subscriberCount ?? null,
      viewCount: item.statistics?.viewCount ?? null,
      videoCount: item.statistics?.videoCount ?? null,
      hiddenSubscriberCount: Boolean(item.statistics?.hiddenSubscriberCount),
    },
  };
}

function youtubeApiFailure(response, payload) {
  const reason = payload?.error?.errors?.[0]?.reason;
  if (response.status === 403 && ['quotaExceeded', 'dailyLimitExceeded'].includes(reason)) {
    throw providerError('YouTube API quota has been reached. Try again later.', 429, 'YOUTUBE_QUOTA_EXCEEDED');
  }
  if (response.status === 401 || reason === 'invalidCredentials') {
    throw providerError('YouTube authorization expired or was revoked. Reconnect your account.', 409, 'YOUTUBE_REAUTH_REQUIRED');
  }
  throw providerError('Unable to retrieve YouTube channel statistics.');
}

export function createYoutubeService({
  repository = repo,
  fetchImpl = (...args) => fetch(...args),
  configuration = env,
  now = () => Date.now(),
  encrypt = encryptTokenBundle,
  decrypt = decryptTokenBundle,
} = {}) {
  async function startAuthorization(userId) {
    assertAuthorizationConfiguration(configuration);
    const state = randomBytes(32).toString('base64url');
    const { verifier, challenge } = createPkcePair();
    const expiresAt = new Date(now() + OAUTH_STATE_TTL_MS).toISOString();

    await repository.createOAuthState({
      stateHash: hashState(state),
      userId,
      codeVerifier: verifier,
      expiresAt,
    });

    const url = new URL(GOOGLE_AUTHORIZE_URL);
    url.search = new URLSearchParams({
      client_id: configuration.GOOGLE_CLIENT_ID,
      redirect_uri: configuration.GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: YOUTUBE_READONLY_SCOPE,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'false',
    }).toString();
    return url.toString();
  }

  async function handleCallback({ code, state, providerError: consentError }) {
    if (typeof state !== 'string' || state.length < 32 || state.length > 256) return 'invalid_state';
    const storedState = await repository.consumeOAuthState(hashState(state));
    if (!storedState) return 'invalid_state';
    if (consentError) return consentError === 'access_denied' ? 'denied' : 'failed';
    if (typeof code !== 'string' || code.length === 0 || code.length > 4096) return 'failed';

    assertAuthorizationConfiguration(configuration);
    const { response: tokenResponse, payload: tokens } = await postForm(fetchImpl, GOOGLE_TOKEN_URL, {
      code,
      client_id: configuration.GOOGLE_CLIENT_ID,
      client_secret: configuration.GOOGLE_CLIENT_SECRET,
      redirect_uri: configuration.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: storedState.code_verifier,
    });
    if (!tokenResponse.ok) throw providerError('Google authorization could not be completed.');
    validateTokenPayload(tokens, { requireRefreshToken: true });

    const { response: channelResponse, payload: channelPayload } = await fetchImpl(
      `${YOUTUBE_CHANNELS_URL}?part=snippet%2Cstatistics&mine=true&maxResults=1`,
      {
        headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
      },
    )
      .then(async (response) => ({ response, payload: await responseJson(response) }))
      .catch(() => {
        throw providerError('Unable to verify the authorized YouTube channel.');
      });

    if (!channelResponse.ok) youtubeApiFailure(channelResponse, channelPayload);
    const channel = selectChannel(channelPayload);
    if (!channel) return 'no_channel';

    const expiresAt = tokenExpiry(tokens, now());
    const encryptedTokens = encrypt(
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
        expires_at: expiresAt,
      },
      storedState.user_id,
      configuration.YOUTUBE_TOKEN_ENCRYPTION_KEY,
    );
    await repository.storeConnection(
      storedState.user_id,
      channel,
      encryptedTokens,
      expiresAt,
    );
    return 'connected';
  }

  async function connectionStatus(userClient, userId) {
    const connection = await repository.getConnection(userClient, userId);
    if (!connection) return { connected: false };
    return {
      connected: true,
      channel: {
        id: connection.channel_id,
        title: connection.channel_title,
        thumbnailUrl: connection.channel_thumbnail_url,
      },
      connectedAt: connection.connected_at,
    };
  }

  async function getAccessToken(userId) {
    assertAuthorizationConfiguration(configuration);
    const tokenRecord = await repository.getTokenRecord(userId);
    if (!tokenRecord) {
      throw new AppError('YouTube is not connected.', { status: 404, code: 'YOUTUBE_NOT_CONNECTED' });
    }

    const tokenBundle = decrypt(
      tokenRecord.token_ciphertext,
      userId,
      configuration.YOUTUBE_TOKEN_ENCRYPTION_KEY,
    );
    if (Date.parse(tokenBundle.expires_at) > now() + EXPIRY_SKEW_MS) return tokenBundle;
    if (!tokenBundle.refresh_token) {
      throw providerError(
        'YouTube authorization expired or cannot be refreshed. Reconnect your account.',
        409,
        'YOUTUBE_REAUTH_REQUIRED',
      );
    }

    const { response, payload: refreshed } = await postForm(fetchImpl, GOOGLE_TOKEN_URL, {
      client_id: configuration.GOOGLE_CLIENT_ID,
      client_secret: configuration.GOOGLE_CLIENT_SECRET,
      refresh_token: tokenBundle.refresh_token,
      grant_type: 'refresh_token',
    });
    if (!response.ok) {
      if (refreshed.error === 'invalid_grant' || response.status === 401) {
        throw providerError(
          'YouTube authorization expired or was revoked. Reconnect your account.',
          409,
          'YOUTUBE_REAUTH_REQUIRED',
        );
      }
      throw providerError('Unable to refresh YouTube authorization.');
    }

    const refreshedScope = refreshed.scope || tokenBundle.scope;
    validateTokenPayload({ ...refreshed, scope: refreshedScope });
    const refreshedBundle = {
      access_token: refreshed.access_token,
      refresh_token: tokenBundle.refresh_token,
      scope: refreshedScope,
      expires_at: tokenExpiry(refreshed, now()),
    };
    const ciphertext = encrypt(refreshedBundle, userId, configuration.YOUTUBE_TOKEN_ENCRYPTION_KEY);
    const stored = await repository.updateTokenRecord(userId, ciphertext, refreshedBundle.expires_at);
    if (!stored) {
      throw new AppError('YouTube connection was removed. Reconnect your account.', {
        status: 404,
        code: 'YOUTUBE_NOT_CONNECTED',
      });
    }
    return refreshedBundle;
  }

  async function channelStatistics(userId) {
    const tokens = await getAccessToken(userId);
    let response;
    let payload;
    try {
      response = await fetchImpl(
        `${YOUTUBE_CHANNELS_URL}?part=snippet%2Cstatistics&mine=true&maxResults=1`,
        {
          headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
        },
      );
      payload = await responseJson(response);
    } catch {
      throw providerError('Unable to retrieve YouTube channel statistics.');
    }
    if (!response.ok) youtubeApiFailure(response, payload);
    const channel = selectChannel(payload);
    if (!channel) {
      throw new AppError('No YouTube channel is available for this Google account.', {
        status: 404,
        code: 'YOUTUBE_CHANNEL_NOT_FOUND',
      });
    }
    return {
      channel: {
        id: channel.channelId,
        title: channel.channelTitle,
        thumbnailUrl: channel.channelThumbnailUrl,
      },
      statistics: channel.statistics,
    };
  }

  async function disconnect(userClient, userId) {
    const tokenRecord = await repository.getTokenRecord(userId);
    let providerRevocation = 'not_attempted';

    if (tokenRecord) {
      try {
        const tokenBundle = decrypt(
          tokenRecord.token_ciphertext,
          userId,
          configuration.YOUTUBE_TOKEN_ENCRYPTION_KEY,
        );
        const token = tokenBundle.refresh_token || tokenBundle.access_token;
        if (token) {
          try {
            const response = await fetchImpl(GOOGLE_REVOKE_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({ token }),
              signal: AbortSignal.timeout(REVOCATION_TIMEOUT_MS),
            });
            if (response.status === 200) {
              providerRevocation = 'revoked';
            } else if (response.status === 400) {
              const payload = await responseJson(response);
              providerRevocation =
                payload.error === 'invalid_token' ? 'already_invalid' : 'failed';
            } else {
              providerRevocation = 'failed';
            }
          } catch {
            providerRevocation = 'unknown';
          }
        }
      } catch {
        providerRevocation = 'not_attempted';
      }
    }

    const localDisconnected = await repository.disconnectConnection(
      userClient,
      tokenRecord?.connection_generation ?? null,
    );
    return { localDisconnected, providerRevocation };
  }

  return {
    startAuthorization,
    handleCallback,
    connectionStatus,
    channelStatistics,
    disconnect,
  };
}

export const youtubeService = createYoutubeService();
