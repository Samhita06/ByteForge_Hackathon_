-- ByteForge initial schema
-- Received revenue rule: dashboard "received earnings" is the sum of
-- transactions.type = 'income' in the creator's reporting currency.
-- Marking an invoice paid creates exactly one linked income transaction
-- (if none exists). Paid invoice amounts are never added on top of income.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  username text unique,
  bio text,
  niche text,
  primary_platform text
    check (primary_platform is null or primary_platform in ('instagram', 'youtube', 'tiktok', 'linkedin', 'other')),
  reporting_currency char(3) not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collaborations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  brand_name text not null,
  campaign_name text not null,
  description text,
  agreed_amount numeric(12, 2) not null default 0 check (agreed_amount >= 0),
  currency char(3) not null default 'INR',
  status text not null default 'active'
    check (status in ('draft', 'active', 'completed', 'cancelled')),
  start_date date,
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  collaboration_id uuid not null references public.collaborations (id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  collaboration_id uuid references public.collaborations (id) on delete set null,
  title text not null,
  description text,
  platform text not null
    check (platform in ('instagram', 'youtube', 'tiktok', 'linkedin', 'other')),
  content_type text not null default 'post'
    check (content_type in ('post', 'reel', 'short', 'video', 'story', 'carousel', 'article', 'other')),
  scheduled_date date,
  status text not null default 'idea'
    check (status in ('idea', 'scheduled', 'in_progress', 'published', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  collaboration_id uuid not null references public.collaborations (id) on delete restrict,
  invoice_number text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency char(3) not null default 'INR',
  issue_date date not null default current_date,
  due_date date,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  collaboration_id uuid references public.collaborations (id) on delete set null,
  invoice_id uuid references public.invoices (id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  category text,
  amount numeric(12, 2) not null check (amount >= 0),
  currency char(3) not null default 'INR',
  transaction_date date not null default current_date,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  recommendation jsonb not null,
  source_context jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

create or replace function public.ensure_same_owner_collaboration()
returns trigger
language plpgsql
as $$
declare
  owner uuid;
begin
  if new.collaboration_id is null then
    return new;
  end if;
  select user_id into owner from public.collaborations where id = new.collaboration_id;
  if owner is null then
    raise exception 'collaboration not found';
  end if;
  if owner <> new.user_id then
    raise exception 'linked collaboration must belong to the same user';
  end if;
  return new;
end;
$$;

create or replace function public.ensure_same_owner_invoice()
returns trigger
language plpgsql
as $$
declare
  owner uuid;
begin
  if new.invoice_id is null then
    return new;
  end if;
  select user_id into owner from public.invoices where id = new.invoice_id;
  if owner is null then
    raise exception 'invoice not found';
  end if;
  if owner <> new.user_id then
    raise exception 'linked invoice must belong to the same user';
  end if;
  return new;
end;
$$;

create trigger collaborations_updated_at before update on public.collaborations
for each row execute function public.set_updated_at();
create trigger deliverables_updated_at before update on public.deliverables
for each row execute function public.set_updated_at();
create trigger content_items_updated_at before update on public.content_items
for each row execute function public.set_updated_at();
create trigger invoices_updated_at before update on public.invoices
for each row execute function public.set_updated_at();
create trigger transactions_updated_at before update on public.transactions
for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger deliverables_owner_guard before insert or update on public.deliverables
for each row execute function public.ensure_same_owner_collaboration();
create trigger content_items_owner_guard before insert or update on public.content_items
for each row execute function public.ensure_same_owner_collaboration();
create trigger invoices_owner_guard before insert or update on public.invoices
for each row execute function public.ensure_same_owner_collaboration();
create trigger transactions_collab_guard before insert or update on public.transactions
for each row execute function public.ensure_same_owner_collaboration();
create trigger transactions_invoice_guard before insert or update on public.transactions
for each row execute function public.ensure_same_owner_invoice();

create index collaborations_user_id_idx on public.collaborations (user_id);
create index collaborations_status_idx on public.collaborations (user_id, status);
create index collaborations_deadline_idx on public.collaborations (user_id, deadline);
create index deliverables_user_id_idx on public.deliverables (user_id);
create index deliverables_due_date_idx on public.deliverables (user_id, due_date);
create index deliverables_collaboration_id_idx on public.deliverables (collaboration_id);
create index content_items_user_id_idx on public.content_items (user_id);
create index content_items_scheduled_date_idx on public.content_items (user_id, scheduled_date);
create index invoices_user_id_idx on public.invoices (user_id);
create index invoices_status_idx on public.invoices (user_id, status);
create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_date_idx on public.transactions (user_id, transaction_date);
create index transactions_invoice_id_idx on public.transactions (invoice_id);
create unique index transactions_one_income_per_invoice_idx
  on public.transactions (user_id, invoice_id)
  where invoice_id is not null and type = 'income';
create index ai_recommendations_user_id_idx on public.ai_recommendations (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.collaborations enable row level security;
alter table public.deliverables enable row level security;
alter table public.content_items enable row level security;
alter table public.invoices enable row level security;
alter table public.transactions enable row level security;
alter table public.ai_recommendations enable row level security;

create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id);
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);

create policy collaborations_all_own on public.collaborations for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy deliverables_all_own on public.deliverables for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy content_items_all_own on public.content_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy invoices_all_own on public.invoices for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy transactions_all_own on public.transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy ai_recommendations_all_own on public.ai_recommendations for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(pg_catalog.left(pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 80), ''),
      nullif(pg_catalog.left(pg_catalog.split_part(coalesce(new.email, ''), '@', 1), 80), ''),
      'Creator'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
