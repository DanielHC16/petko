-- Isolated test database only, after applying migration 005 twice.
-- Exercises actual profile grants/RLS and scoped service-role updates.
-- All fixtures roll back; never execute this file against production.
begin;

do $$
declare
  v_owner uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_count integer;
begin
  if not exists (
    select 1 from pg_attribute a join pg_attrdef d
      on d.adrelid=a.attrelid and d.adnum=a.attnum
    where a.attrelid='public.users'::regclass and a.attname='tos_accepted'
      and a.atttypid='boolean'::regtype and a.attnotnull
      and pg_get_expr(d.adbin,d.adrelid)='false'
  ) then raise exception 'Acceptance must be a nonnull boolean defaulting false'; end if;
  if not (select relrowsecurity from pg_class where oid='public.users'::regclass) then
    raise exception 'User RLS must remain enabled';
  end if;
  if has_column_privilege('anon','public.users','tos_accepted','UPDATE')
    or has_column_privilege('authenticated','public.users','tos_accepted','UPDATE')
    or has_column_privilege('anon','public.users','role','UPDATE')
    or has_column_privilege('authenticated','public.users','role','UPDATE') then
    raise exception 'Browsers must not write acceptance or role';
  end if;
  if not has_column_privilege('service_role','public.users','tos_accepted','UPDATE')
    or not has_column_privilege('authenticated','public.users','full_name','UPDATE')
    or not has_column_privilege('authenticated','public.users','avatar_url','UPDATE') then
    raise exception 'Backend and existing display-field privileges must remain available';
  end if;

  insert into auth.users(id,email,raw_user_meta_data) values
    (v_owner,v_owner::text || '@tos-test.invalid','{}'),
    (v_other,v_other::text || '@tos-test.invalid','{}');
  if (select count(*) from public.users where id in (v_owner,v_other) and not tos_accepted)<>2 then
    raise exception 'New profiles must default to unaccepted';
  end if;

  perform set_config('request.jwt.claim.sub',v_owner::text,true);
  execute 'set local role authenticated';
  select count(*) into v_count from public.users where id in (v_owner,v_other);
  if v_count<>1 then raise exception 'Authenticated users must only read their own profile'; end if;
  if not exists(select 1 from public.users where id=v_owner and not tos_accepted) then
    raise exception 'Own profile must expose false acceptance';
  end if;
  begin
    update public.users set tos_accepted=true where id=v_owner;
    raise exception 'Client acceptance update unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  begin
    update public.users set role='admin' where id=v_owner;
    raise exception 'Client role update unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  update public.users set full_name='Allowed display update' where id=v_owner;
  execute 'reset role';

  execute 'set local role anon';
  select count(*) into v_count from public.users where id in (v_owner,v_other);
  if v_count<>0 then raise exception 'Anonymous callers must not read user profiles'; end if;
  begin
    update public.users set tos_accepted=true where id=v_owner;
    raise exception 'Anonymous acceptance update unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  execute 'reset role';

  execute 'set local role service_role';
  update public.users set tos_accepted=true where id=v_owner;
  update public.users set tos_accepted=true where id=v_owner;
  execute 'reset role';
  if not (select tos_accepted and role='customer' and full_name='Allowed display update' from public.users where id=v_owner) then
    raise exception 'Acceptance update must persist true without changing role or display fields';
  end if;
  if (select tos_accepted or role<>'customer' from public.users where id=v_other) then
    raise exception 'Scoped acceptance must not alter a different account';
  end if;

  -- Reapplying the migration's additive DDL cannot reset a saved agreement.
  alter table public.users add column if not exists tos_accepted boolean not null default false;
  if not (select tos_accepted from public.users where id=v_owner) then
    raise exception 'Reapplication must preserve acceptance';
  end if;
end;
$$;

rollback;
