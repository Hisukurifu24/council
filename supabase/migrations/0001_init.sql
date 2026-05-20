-- Council — D&D Session Planner — schema for a free, friends-only app.
-- Apply with: supabase db push  (or paste into the Supabase SQL editor).
--
-- No accounts. Everyone uses the public anon key; the unguessable invite code
-- is the access control (like When2Meet / Doodle). RLS is enabled with
-- permissive policies so the anon client can read and write.
--
-- This script is SAFE TO RE-RUN. It cleans up any earlier version of the schema
-- (older auth-based tables/policies) and converges the database to the current
-- shape, whether the DB is empty or partially set up.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Remove leftovers from the earlier auth-based version (if present)
-- ---------------------------------------------------------------------------
drop table if exists notifications cascade;
drop table if exists member_secrets cascade;
alter table if exists campaign_members drop column if exists profile_id cascade;
drop table if exists profiles cascade;
drop function if exists is_campaign_member(uuid) cascade;
drop function if exists is_campaign_dm(uuid) cascade;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  host_id uuid not null,                       -- campaign_members.id of the DM
  invite_code text not null unique,
  timezone text not null default 'UTC',
  settings jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns on delete cascade,
  guest_name text,
  role text not null default 'player' check (role in ('dm','player')),
  color text not null default '#a78bfa',
  joined_at timestamptz not null default now()
);

create table if not exists scheduling_rounds (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns on delete cascade,
  title text not null default 'This week',
  dates date[] not null,
  time_slots text[] not null default '{morning,afternoon,evening}',
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now()
);

create table if not exists availability_entries (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references scheduling_rounds on delete cascade,
  member_id uuid not null references campaign_members on delete cascade,
  date date not null,
  time_slot text not null check (time_slot in ('morning','afternoon','evening')),
  status text not null check (status in ('available','maybe','unavailable')),
  updated_at timestamptz not null default now(),
  unique (round_id, member_id, date, time_slot)
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns on delete cascade,
  round_id uuid references scheduling_rounds on delete set null,
  date date not null,
  time_slot text not null check (time_slot in ('morning','afternoon','evening')),
  status text not null default 'confirmed' check (status in ('confirmed','tentative','canceled')),
  notes text,
  locked boolean not null default false,
  confirmed_by uuid references campaign_members on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_members_campaign on campaign_members(campaign_id);
create index if not exists idx_entries_round on availability_entries(round_id);
create index if not exists idx_rounds_campaign on scheduling_rounds(campaign_id);
create index if not exists idx_sessions_campaign on sessions(campaign_id);

-- ---------------------------------------------------------------------------
-- Realtime — add tables to the publication only if not already present
-- (re-adding throws an error, which would otherwise abort the script).
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['availability_entries','campaign_members','sessions'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS — enabled, with permissive policies for the anon role.
-- This is a private app shared by invite link; the invite code is the gate.
-- We first drop ANY existing policy on these tables so re-runs (and old
-- auth-based policies) converge cleanly to the permissive set below.
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('campaigns','campaign_members','scheduling_rounds','availability_entries','sessions')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table campaigns enable row level security;
alter table campaign_members enable row level security;
alter table scheduling_rounds enable row level security;
alter table availability_entries enable row level security;
alter table sessions enable row level security;

create policy "campaigns all" on campaigns for all using (true) with check (true);
create policy "members all" on campaign_members for all using (true) with check (true);
create policy "rounds all" on scheduling_rounds for all using (true) with check (true);
create policy "availability all" on availability_entries for all using (true) with check (true);
create policy "sessions all" on sessions for all using (true) with check (true);
