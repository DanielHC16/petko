-- ============================================================
-- Petko — Security patch 001: lock public.users.role
--
-- WHAT IT FIXES
--   The RLS policy "Users can update their own profile" lets any
--   signed-in user update ANY column of their own row. Because the
--   frontend ships the public anon key, a user could call the Supabase
--   REST API directly (PATCH /rest/v1/users?id=eq.<own id>) with
--   {"role":"admin"} and promote themselves to admin.
--
--   This patch keeps the policy (own row only) but limits which
--   columns the client roles may update. `role` can then only be
--   changed by the NestJS backend (service role, which bypasses
--   these grants) through the admin-only /api/users endpoints.
--
-- HOW TO APPLY
--   Run once in: Supabase Dashboard → SQL Editor → New Query.
--   Safe to re-run (revoke/grant are idempotent).
-- ============================================================

revoke update on public.users from anon, authenticated;
grant update (full_name, avatar_url) on public.users to authenticated;
