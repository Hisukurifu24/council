-- Council — broadcast campaign updates over Realtime.
--
-- DM member management (kick / ban / transfer DM) writes to `campaigns`
-- (host_id, settings.banned). Publishing the table lets other open clients see
-- a new DM or a ban immediately instead of on next load. The app works without
-- this migration; it just syncs those changes later.
--
-- Safe to re-run.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'campaigns'
  ) then
    alter publication supabase_realtime add table public.campaigns;
  end if;
end $$;
