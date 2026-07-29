-- ============================================================
-- Null Island — Supabase schema
-- Paste this into your Supabase project: SQL Editor → New query
-- ============================================================

-- Enable Row Level Security helpers
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- user_state
-- One row per user. Stores the entire app state as JSONB so
-- the client can push/pull without schema migrations as the
-- game evolves. Individual columns are added for things we
-- might query or index later (level, xp, updated_at).
-- ─────────────────────────────────────────────────────────────
create table if not exists public.user_state (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- quick-access columns (denormalised from state JSON)
  level       int  not null default 1,
  xp          int  not null default 0,
  -- full app state blob
  state       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One row per user
create unique index if not exists user_state_user_id_idx on public.user_state(user_id);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_state_updated_at on public.user_state;
create trigger user_state_updated_at
  before update on public.user_state
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- Users can only read and write their own row.
-- ─────────────────────────────────────────────────────────────
alter table public.user_state enable row level security;

drop policy if exists "Users can view own state"   on public.user_state;
drop policy if exists "Users can insert own state" on public.user_state;
drop policy if exists "Users can update own state" on public.user_state;

create policy "Users can view own state"
  on public.user_state for select
  using (auth.uid() = user_id);

create policy "Users can insert own state"
  on public.user_state for insert
  with check (auth.uid() = user_id);

create policy "Users can update own state"
  on public.user_state for update
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- Upsert helper (called from the app's sync layer)
-- ─────────────────────────────────────────────────────────────
create or replace function public.upsert_user_state(
  p_user_id uuid,
  p_state   jsonb,
  p_level   int  default 1,
  p_xp      int  default 0
)
returns void language plpgsql security definer as $$
begin
  insert into public.user_state (user_id, state, level, xp)
  values (p_user_id, p_state, p_level, p_xp)
  on conflict (user_id)
  do update set
    state      = excluded.state,
    level      = excluded.level,
    xp         = excluded.xp,
    updated_at = now();
end;
$$;
