create table public.youtube_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  channel_id text not null,
  channel_title text not null,
  channel_thumbnail_url text,
  connected_at timestamptz not null default now()
);

alter table public.youtube_connections enable row level security;

create policy "Users can view their YouTube connection metadata"
  on public.youtube_connections
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.youtube_connections from public, anon;
revoke insert, update, delete on table public.youtube_connections from authenticated;
grant select on table public.youtube_connections to authenticated;

create table public.youtube_oauth_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token_ciphertext text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.youtube_oauth_tokens enable row level security;
revoke all on table public.youtube_oauth_tokens from public, anon, authenticated;
grant select, insert, update, delete on table public.youtube_oauth_tokens to service_role;

create table public.youtube_oauth_states (
  state_hash text primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  code_verifier text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint youtube_oauth_states_hash_format check (state_hash ~ '^[0-9a-f]{64}$'),
  constraint youtube_oauth_states_expiry check (expires_at > created_at)
);

alter table public.youtube_oauth_states enable row level security;
revoke all on table public.youtube_oauth_states from public, anon, authenticated;
grant select, insert, update, delete on table public.youtube_oauth_states to service_role;

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
    now()
  )
  on conflict (user_id) do update set
    channel_id = excluded.channel_id,
    channel_title = excluded.channel_title,
    channel_thumbnail_url = excluded.channel_thumbnail_url,
    connected_at = excluded.connected_at;

  insert into public.youtube_oauth_tokens (user_id, token_ciphertext, expires_at, updated_at)
  values (p_user_id, p_token_ciphertext, p_expires_at, now())
  on conflict (user_id) do update set
    token_ciphertext = excluded.token_ciphertext,
    expires_at = excluded.expires_at,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.store_youtube_connection(uuid, text, text, text, text, timestamptz) from public;
revoke all on function public.store_youtube_connection(uuid, text, text, text, text, timestamptz) from anon;
revoke all on function public.store_youtube_connection(uuid, text, text, text, text, timestamptz) from authenticated;
grant execute on function public.store_youtube_connection(uuid, text, text, text, text, timestamptz) to service_role;

create or replace function public.disconnect_youtube()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted_rows bigint;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  delete from public.youtube_oauth_tokens where user_id = v_user_id;
  delete from public.youtube_connections where user_id = v_user_id;
  get diagnostics v_deleted_rows = row_count;
  return v_deleted_rows > 0;
end;
$$;

revoke all on function public.disconnect_youtube() from public;
revoke all on function public.disconnect_youtube() from anon;
grant execute on function public.disconnect_youtube() to authenticated;
