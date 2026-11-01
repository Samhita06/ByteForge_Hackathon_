import { createServiceClient } from '../../../database/supabaseClient.js';
import { throwIfDbError } from '../../../shared/utils/db.js';

export async function createOAuthState({ stateHash, userId, codeVerifier, expiresAt }) {
  const serviceClient = createServiceClient();
  const { error: userStateError } = await serviceClient
    .from('youtube_oauth_states')
    .delete()
    .eq('user_id', userId);
  throwIfDbError(userStateError);

  const { error: cleanupError } = await serviceClient
    .from('youtube_oauth_states')
    .delete()
    .lt('expires_at', new Date().toISOString());
  throwIfDbError(cleanupError);

  const { error } = await serviceClient.from('youtube_oauth_states').insert({
    state_hash: stateHash,
    user_id: userId,
    code_verifier: codeVerifier,
    expires_at: expiresAt,
  });
  throwIfDbError(error);
}

export async function consumeOAuthState(stateHash) {
  const serviceClient = createServiceClient();
  const { error: cleanupError } = await serviceClient
    .from('youtube_oauth_states')
    .delete()
    .lt('expires_at', new Date().toISOString());
  throwIfDbError(cleanupError);

  const { data, error } = await serviceClient
    .from('youtube_oauth_states')
    .delete()
    .eq('state_hash', stateHash)
    .gt('expires_at', new Date().toISOString())
    .select('user_id, code_verifier')
    .maybeSingle();
  throwIfDbError(error);
  return data;
}

export async function storeConnection(userId, connection, tokenCiphertext, expiresAt) {
  const { error } = await createServiceClient().rpc('store_youtube_connection', {
    p_user_id: userId,
    p_channel_id: connection.channelId,
    p_channel_title: connection.channelTitle,
    p_channel_thumbnail_url: connection.channelThumbnailUrl,
    p_token_ciphertext: tokenCiphertext,
    p_expires_at: expiresAt,
  });
  throwIfDbError(error);
}

export async function getConnection(userClient, userId) {
  const { data, error } = await userClient
    .from('youtube_connections')
    .select('channel_id, channel_title, channel_thumbnail_url, connected_at')
    .eq('user_id', userId)
    .maybeSingle();
  throwIfDbError(error);
  return data;
}

export async function getTokenRecord(userId) {
  const { data, error } = await createServiceClient()
    .from('youtube_oauth_tokens')
    .select('token_ciphertext, expires_at, connection_generation')
    .eq('user_id', userId)
    .maybeSingle();
  throwIfDbError(error);
  return data;
}

export async function updateTokenRecord(userId, tokenCiphertext, expiresAt) {
  const { data, error } = await createServiceClient()
    .from('youtube_oauth_tokens')
    .update({
      token_ciphertext: tokenCiphertext,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('user_id')
    .maybeSingle();
  throwIfDbError(error);
  return Boolean(data);
}

export async function disconnectConnection(userClient, expectedGeneration) {
  const { data, error } = await userClient.rpc('disconnect_youtube', {
    p_expected_generation: expectedGeneration,
  });
  throwIfDbError(error);
  return Boolean(data);
}
