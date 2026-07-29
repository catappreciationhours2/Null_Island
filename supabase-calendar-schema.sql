-- ============================================================
-- Null Island — Google Calendar accounts schema
-- Paste into Supabase SQL Editor → Run
-- Run AFTER supabase-schema.sql
-- ============================================================

-- Stores one row per linked Google Calendar account per user.
-- Tokens are stored as-is (protected by RLS + Supabase auth).
create table if not exists public.calendar_accounts (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  google_email        text not null,
  access_token        text not null,
  refresh_token       text not null,
  token_expiry        timestamptz,
  -- JSON array of {id, name, color, enabled} objects
  selected_calendars  jsonb not null default '[]'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- One row per (user, google account)
create unique index if not exists cal_accounts_user_email
  on public.calendar_accounts(user_id, google_email);

-- Auto-update updated_at
drop trigger if exists cal_accounts_updated_at on public.calendar_accounts;
create trigger cal_accounts_updated_at
  before update on public.calendar_accounts
  for each row execute function public.set_updated_at();

-- RLS — users can only see/manage their own linked accounts
alter table public.calendar_accounts enable row level security;

drop policy if exists "Users manage own calendar accounts" on public.calendar_accounts;
create policy "Users manage own calendar accounts"
  on public.calendar_accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
