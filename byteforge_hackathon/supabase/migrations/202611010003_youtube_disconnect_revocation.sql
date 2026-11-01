alter table public.youtube_oauth_tokens
  add column connection_generation uuid not null default pg_catalog.gen_random_uuid();

create or replace function public.store_youtube_connection(
  p_user_id uuid,
  p_channel_id text,
  p_channel_title text,
  p_channel_thumbnail_url text,
  p_token_ciphertext text,
  p_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  insert into public.youtube_connections (
    user_id,
    channel_id,
    channel_title,
    channel_thumbnail_url,
    connected_at
  )
  values (
    p_user_id,
    p_channel_id,
    p_channel_title,
    p_channel_thumbnail_url,
    pg_catalog.now()
  )
  on conflict (user_id) do update set
    channel_id = excluded.channel_id,
    channel_title = excluded.channel_title,
    channel_thumbnail_url = excluded.channel_thumbnail_url,
    connected_at = excluded.connected_at;

  insert into public.youtube_oauth_tokens (
    user_id,
    token_ciphertext,
    expires_at,
    updated_at,
    connection_generation
  )
  values (
    p_user_id,
    p_token_ciphertext,
    p_expires_at,
    pg_catalog.now(),
    pg_catalog.gen_random_uuid()
  )
  on conflict (user_id) do update set
    token_ciphertext = excluded.token_ciphertext,
    expires_at = excluded.expires_at,
    updated_at = excluded.updated_at,
    connection_generation = excluded.connection_generation;
end;
$$;

create or replace function public.disconnect_youtube(p_expected_generation uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted_user_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  if p_expected_generation is null then
    if exists (
      select 1
      from public.youtube_oauth_tokens
      where user_id = v_user_id
    ) then
      return false;
    end if;

    delete from public.youtube_connections
    where user_id = v_user_id;
    return true;
  else
    delete from public.youtube_oauth_tokens
    where user_id = v_user_id
      and connection_generation = p_expected_generation
    returning user_id into v_deleted_user_id;

    if v_deleted_user_id is null then
      return false;
    end if;

    delete from public.youtube_connections
    where user_id = v_user_id;
    return true;
  end if;
end;
$$;

drop function public.disconnect_youtube();

revoke all on function public.store_youtube_connection(uuid, text, text, text, text, timestamptz) from public;
revoke all on function public.store_youtube_connection(uuid, text, text, text, text, timestamptz) from anon;
revoke all on function public.store_youtube_connection(uuid, text, text, text, text, timestamptz) from authenticated;
grant execute on function public.store_youtube_connection(uuid, text, text, text, text, timestamptz) to service_role;

revoke all on function public.disconnect_youtube(uuid) from public;
revoke all on function public.disconnect_youtube(uuid) from anon;
grant execute on function public.disconnect_youtube(uuid) to authenticated;
