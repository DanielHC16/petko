-- ============================================================
-- Petko — Migration 002: admin access emails
--
-- WHAT IT DOES
--   Creates public.admin_access_emails, the editable list of emails
--   that get admin access (and the customer/admin view toggle).
--   The NestJS AuthGuard treats a signed-in user whose confirmed
--   email is in this table as an admin. Seeds the initial three
--   emails.
--
-- WHY
--   Admin access can be granted and revoked from the app
--   (/admin/users → "Admin access list") without a redeploy or
--   hand-editing public.users.role.
--
--   The table is service-role only: RLS is enabled with NO
--   policies, and table privileges are revoked from anon and
--   authenticated (Supabase grants them by default). Only the
--   backend, using the service role key, can read or change it.
--
-- HOW TO APPLY
--   Supabase Dashboard → SQL Editor → New Query, or
--   `npx supabase db query --linked "$(cat this-file)"`.
--   Safe to re-run (create if not exists, on conflict do nothing).
-- ============================================================

begin;

create table if not exists public.admin_access_emails (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique
              check (email = lower(btrim(email)) and email <> ''),
  added_by    uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.admin_access_emails enable row level security;

-- Deliberately no policies: anon/authenticated must never read or write
-- this table. The service role bypasses RLS and grants.
revoke all on public.admin_access_emails from anon, authenticated;

insert into public.admin_access_emails (email) values
  ('danielcamacho0416@gmail.com'),
  ('ilaurenaubrey@gmail.com'),
  ('sancheztriciap@gmail.com')
on conflict (email) do nothing;

commit;
