-- Council — adds a lightweight email + password login.
--
-- This is NOT real security: the app is friends-only with no sensitive data.
-- Passwords are SHA-256 hashed client-side, but this table is readable via the
-- public anon key like every other table (permissive RLS, invite code is the
-- real gate). No Supabase Auth, no OAuth, no Edge Functions.
--
-- Safe to re-run.

create extension if not exists "pgcrypto";

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- Link memberships to an account so a user's campaigns follow them across devices.
alter table if exists campaign_members
  add column if not exists account_id uuid;

create index if not exists idx_members_account on campaign_members(account_id);

-- RLS: permissive, consistent with the rest of the schema.
alter table accounts enable row level security;

do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'accounts'
  loop
    execute format('drop policy %I on public.accounts', r.policyname);
  end loop;
end $$;

create policy "accounts all" on accounts for all using (true) with check (true);
