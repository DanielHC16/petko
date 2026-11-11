-- WHAT: Remember explicit TOS agreement on each user's profile.
-- WHY: Browser storage cannot persist acceptance across devices, and old flags
--      also came from simply closing the read-only terms. Do not backfill them.
-- HOW TO APPLY: Apply after migration 004 before deploying the TOS feature.
-- Safe to rerun; retain this additive column and saved values on app rollback.
begin;

alter table public.users
  add column if not exists tos_accepted boolean not null default false;

-- Preserve security patch 001: browsers may edit display fields only.
-- Column revokes also cover any older explicit column grants.
revoke update on public.users from public, anon, authenticated;
revoke update (role, tos_accepted) on public.users from public, anon, authenticated;
grant update (full_name, avatar_url) on public.users to authenticated;
grant select (tos_accepted), update (tos_accepted) on public.users to service_role;

commit;
