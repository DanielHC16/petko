-- ============================================================
-- Petko — Initial Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. USERS
-- Mirrors auth.users — stores role and profile info.
-- A trigger auto-inserts a row here after Google SSO sign-in.
-- ────────────────────────────────────────────────────────────
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text not null default '',
  avatar_url  text not null default '',
  role        text not null default 'customer' check (role in ('admin', 'customer')),
  tos_accepted boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Row Level Security — users can only read/edit their own row
alter table public.users enable row level security;

create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- Column-level lock (see security-patch-001-lock-user-role.sql):
-- clients may only edit their display fields, never `role`.
-- Role changes go through the NestJS backend (service role) only.
revoke update on public.users from public, anon, authenticated;
grant update (full_name, avatar_url) on public.users to authenticated;

-- Also expand existing schemas without resetting a previous agreement.
alter table public.users add column if not exists tos_accepted boolean not null default false;
revoke update (role, tos_accepted) on public.users from public, anon, authenticated;
grant select (tos_accepted), update (tos_accepted) on public.users to service_role;

-- ────────────────────────────────────────────────────────────
-- 2. AUTO-INSERT TRIGGER
-- When a user signs in with Google SSO for the first time,
-- Supabase creates a row in auth.users. This trigger
-- automatically creates the corresponding public.users row.
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop and recreate to ensure idempotency
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 3. PRODUCTS
-- ────────────────────────────────────────────────────────────
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  price       numeric(10,2) not null check (price >= 0),
  stock       integer not null default 0 check (stock >= 0),
  category    text not null,
  pet_type    text not null check (pet_type in ('cat', 'dog', 'both')),
  image_url   text not null default '',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.products enable row level security;

-- Anyone can view active products
create policy "Anyone can view active products"
  on public.products for select
  using (is_active = true);

-- Auto-deactivate out-of-stock products trigger
create or replace function public.handle_product_stock_status()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.stock <= 0 then
    new.is_active := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_product_stock_status on public.products;
create trigger trg_product_stock_status
  before insert or update of stock, is_active
  on public.products
  for each row
  execute function public.handle_product_stock_status();

-- Only service role (NestJS backend) can insert/update/delete
-- (Enforced by the backend — no public write RLS needed)

-- ────────────────────────────────────────────────────────────
-- 4. CART ITEMS
-- ────────────────────────────────────────────────────────────
create table if not exists public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  quantity    integer not null default 1 check (quantity > 0),
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.cart_items enable row level security;

create policy "Users can manage their own cart"
  on public.cart_items for all
  using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 5. ORDERS
-- ────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete restrict,
  status            text not null default 'pending'
                      check (status in ('pending', 'paid', 'shipped', 'cancelled')),
  total_amount      numeric(10,2) not null check (total_amount >= 0),
  payment_reference text,           -- Gateway reference — TBA
  created_at        timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "Users can view their own orders"
  on public.orders for select
  using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 6. ORDER ITEMS
-- ────────────────────────────────────────────────────────────
create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete restrict,
  quantity    integer not null check (quantity > 0),
  unit_price  numeric(10,2) not null check (unit_price >= 0)  -- Snapshot at purchase time
);

alter table public.order_items enable row level security;

create policy "Users can view items from their own orders"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- 7. SEED — Admin user placeholder
-- After your first Google SSO sign-in, run this to promote
-- yourself to admin. Replace the email with your own.
-- ────────────────────────────────────────────────────────────
-- update public.users
-- set role = 'admin'
-- where email = 'your-email@gmail.com';

-- ────────────────────────────────────────────────────────────
-- 8. ADMIN ACCESS EMAILS
-- Emails listed here are treated as admins by the backend
-- (AuthGuard) once the account's email is confirmed. Managed in
-- the app at /admin/users → "Admin access list".
-- Service-role only: RLS on with NO policies, and client grants
-- revoked. Same as migration-002-admin-access-emails.sql.
-- ────────────────────────────────────────────────────────────
create table if not exists public.admin_access_emails (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique
              check (email = lower(btrim(email)) and email <> ''),
  added_by    uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.admin_access_emails enable row level security;
-- Deliberately no policies: anon/authenticated must never read or write this.
revoke all on public.admin_access_emails from anon, authenticated;

insert into public.admin_access_emails (email) values
  ('danielcamacho0416@gmail.com'),
  ('ilaurenaubrey@gmail.com'),
  ('sancheztriciap@gmail.com')
on conflict (email) do nothing;

-- Order tracking expansion (same definitions as migration-003-order-tracking.sql).
-- WHAT: Add real COD checkout, admin-controlled fulfillment and owner receipt confirmation.
-- WHY: Orders need atomic stock reservation, a truthful history and protected customer data.
-- HOW TO APPLY: Run after migration-002 in the Supabase SQL editor before deploying the app.
-- Safe to rerun. Roll back application code while retaining these additive columns/history.
begin;

alter table public.orders
  add column if not exists fulfillment_status text,
  add column if not exists tracking_version integer not null default 0 check (tracking_version >= 0),
  add column if not exists subtotal_amount numeric(10,2),
  add column if not exists shipping_fee numeric(10,2) not null default 0 check (shipping_fee >= 0),
  add column if not exists payment_method text check (payment_method = 'cod'),
  add column if not exists delivery_method text check (delivery_method in ('standard', 'express')),
  add column if not exists shipping jsonb,
  add column if not exists courier_name text,
  add column if not exists tracking_number text,
  add column if not exists updated_at timestamptz,
  add column if not exists delivery_confirmed_at timestamptz,
  add column if not exists delivery_issue jsonb,
  add column if not exists checkout_request_id uuid,
  add column if not exists checkout_payload jsonb,
  add column if not exists stock_reserved boolean not null default false;

update public.orders set
  fulfillment_status = case status when 'shipped' then 'shipped' when 'cancelled' then 'cancelled' else 'placed' end
where fulfillment_status is null;
update public.orders set subtotal_amount = total_amount where subtotal_amount is null;
update public.orders set updated_at = created_at where updated_at is null;
alter table public.orders alter column fulfillment_status set default 'placed';
alter table public.orders alter column fulfillment_status set not null;
alter table public.orders alter column subtotal_amount set not null;
alter table public.orders alter column updated_at set default now();
alter table public.orders alter column updated_at set not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.orders'::regclass and conname = 'orders_fulfillment_status_check') then
    alter table public.orders add constraint orders_fulfillment_status_check check (fulfillment_status in ('placed','processing','shipped','out_for_delivery','delivered','cancelled'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.orders'::regclass and conname = 'orders_confirmation_check') then
    alter table public.orders add constraint orders_confirmation_check check (delivery_confirmed_at is null or fulfillment_status = 'delivered');
  end if;
end $$;

create unique index if not exists orders_checkout_request_idx on public.orders(user_id, checkout_request_id) where checkout_request_id is not null;
create index if not exists orders_owner_created_idx on public.orders(user_id, created_at desc, id desc);
create index if not exists orders_fulfillment_created_idx on public.orders(fulfillment_status, created_at desc, id desc);
create index if not exists orders_created_idx on public.orders(created_at desc, id desc);
create index if not exists orders_open_delivery_issue_idx on public.orders(created_at desc) where delivery_issue is not null and delivery_issue->>'resolved_at' is null;

alter table public.order_items add column if not exists product_name text;
alter table public.order_items add column if not exists image_url text;
-- Legacy item names/images are current product data, not invented purchase-time snapshots.
update public.order_items i set product_name = coalesce(i.product_name, p.name), image_url = coalesce(i.image_url, p.image_url)
from public.products p where p.id = i.product_id and (i.product_name is null or i.image_url is null);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_product_idx on public.order_items(product_id);

create table if not exists public.order_tracking_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  version integer not null check (version >= 0),
  event_type text not null check (event_type in ('status_changed','receipt_confirmed','delivery_issue_reported','delivery_issue_resolved','order_placed','imported')),
  from_status text check (from_status in ('placed','processing','shipped','out_for_delivery','delivered','cancelled')),
  to_status text not null check (to_status in ('placed','processing','shipped','out_for_delivery','delivered','cancelled')),
  actor_id uuid,
  actor_role text not null check (actor_role in ('admin','customer','system')),
  created_at timestamptz not null default now(),
  note text check (length(note) <= 1000),
  unique(order_id, version)
);
alter table public.order_tracking_events enable row level security;
revoke all on public.order_tracking_events from public, anon, authenticated;
grant select, insert on public.order_tracking_events to service_role;
revoke insert, update, delete on public.orders, public.order_items from anon, authenticated;
grant all on public.orders, public.order_items to service_role;

create or replace function public.petko_protect_order_event() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = 'P4091', message = 'Order tracking history is immutable';
end;
$$;
drop trigger if exists protect_order_tracking_history on public.order_tracking_events;
create trigger protect_order_tracking_history before update or delete on public.order_tracking_events
for each row execute function public.petko_protect_order_event();
revoke execute on function public.petko_protect_order_event() from public, anon, authenticated;

insert into public.order_tracking_events(order_id,version,event_type,from_status,to_status,actor_role,note)
select id,0,'imported',null,fulfillment_status,'system','Tracking began from the existing order status; earlier milestone dates are unavailable.'
from public.orders o where not exists (select 1 from public.order_tracking_events e where e.order_id=o.id)
on conflict (order_id,version) do nothing;

create or replace function public.petko_create_order(p_user_id uuid, p_payload jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_product public.products%rowtype;
  v_item jsonb;
  v_id uuid;
  v_request uuid;
  v_subtotal numeric(10,2) := 0;
  v_shipping numeric(10,2);
  v_count integer := 0;
begin
  if p_user_id is null or not exists (select 1 from public.users where id=p_user_id) then
    raise exception using errcode='P4040', message='User not found';
  end if;
  if p_payload->>'payment_method' is distinct from 'cod'
     or coalesce(p_payload->>'delivery_method','') not in ('standard','express')
     or jsonb_typeof(p_payload->'items') is distinct from 'array'
     or jsonb_typeof(p_payload->'shipping') is distinct from 'object' then
    raise exception using errcode='P4000', message='Invalid checkout payload';
  end if;
  if jsonb_array_length(p_payload->'items') not between 1 and 50 then
    raise exception using errcode='P4000', message='Invalid item count';
  end if;
  v_request := (p_payload->>'checkout_request_id')::uuid;
  if v_request is null then raise exception using errcode='P4000', message='Missing checkout request'; end if;
  -- Serialize the same user's request key before reserving stock or creating records.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || v_request::text,0));
  select * into v_order from public.orders where user_id=p_user_id and checkout_request_id=v_request;
  if found then
    if v_order.checkout_payload is distinct from p_payload then
      raise exception using errcode='P4093', message='Checkout request payload differs';
    end if;
    return v_order.id;
  end if;
  if (select count(distinct value->>'product_id') from jsonb_array_elements(p_payload->'items')) <> jsonb_array_length(p_payload->'items') then
    raise exception using errcode='P4000', message='Duplicate product';
  end if;
  -- Lock all referenced products in stable order so competing checkouts cannot oversell.
  for v_product in
    select p.* from public.products p where p.id in
      (select (value->>'product_id')::uuid from jsonb_array_elements(p_payload->'items'))
    order by p.id for update
  loop
    select value into v_item from jsonb_array_elements(p_payload->'items') where (value->>'product_id')::uuid=v_product.id;
    if (v_item->>'quantity')::integer not between 1 and 999 or not v_product.is_active or v_product.stock < (v_item->>'quantity')::integer then
      raise exception using errcode='P4092', message='Unavailable product or insufficient stock';
    end if;
    v_subtotal := v_subtotal + v_product.price * (v_item->>'quantity')::integer;
    v_count := v_count+1;
  end loop;
  if v_count <> jsonb_array_length(p_payload->'items') then
    raise exception using errcode='P4092', message='Product not found';
  end if;
  v_shipping := case when p_payload->>'delivery_method'='express' then 199 when v_subtotal >=999 then 0 else 99 end;
  insert into public.orders(user_id,status,fulfillment_status,total_amount,subtotal_amount,shipping_fee,payment_method,delivery_method,shipping,checkout_request_id,checkout_payload,stock_reserved)
  values(p_user_id,'pending','placed',v_subtotal+v_shipping,v_subtotal,v_shipping,'cod',p_payload->>'delivery_method',p_payload->'shipping',v_request,p_payload,true)
  returning id into v_id;
  for v_item in select value from jsonb_array_elements(p_payload->'items') loop
    update public.products set stock=stock-(v_item->>'quantity')::integer where id=(v_item->>'product_id')::uuid;
    insert into public.order_items(order_id,product_id,quantity,unit_price,product_name,image_url)
    select v_id,id,(v_item->>'quantity')::integer,price,name,image_url from public.products where id=(v_item->>'product_id')::uuid;
  end loop;
  insert into public.order_tracking_events(order_id,version,event_type,to_status,actor_id,actor_role)
  values(v_id,0,'order_placed','placed',p_user_id,'customer');
  return v_id;
end;
$$;
revoke execute on function public.petko_create_order(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.petko_create_order(uuid,jsonb) to service_role;

create or replace function public.petko_mutate_order(p_order_id uuid,p_actor_id uuid,p_actor_role text,p_action text,p_expected_version integer,p_payload jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_status text;
  v_event text;
  v_note text;
  v_role text;
  v_item record;
begin
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception using errcode='P4040', message='Order not found'; end if;
  if p_action in ('confirm_receipt','report_issue') then
    if p_actor_id is distinct from v_order.user_id then raise exception using errcode='P4040', message='Order not found'; end if;
    v_role := 'customer';
  elsif p_action in ('fulfillment','resolve_issue') then
    if p_actor_role is distinct from 'admin' then raise exception using errcode='P4040', message='Order not found'; end if;
    v_role := 'admin';
  else
    raise exception using errcode='P4000', message='Invalid order action';
  end if;
  if p_actor_id is null or not exists (select 1 from public.users where id=p_actor_id) then
    raise exception using errcode='P4040', message='Actor not found';
  end if;
  -- A successful owner confirmation is safe to retry, even after its version changed.
  if p_action='confirm_receipt' and v_order.delivery_confirmed_at is not null then return v_order.id; end if;
  if p_expected_version is distinct from v_order.tracking_version then
    raise exception using errcode='P4090', message='Stale order version';
  end if;
  if v_order.fulfillment_status='cancelled' or v_order.delivery_confirmed_at is not null then
    raise exception using errcode='P4091', message='Order is terminal';
  end if;
  v_status := v_order.fulfillment_status;
  if p_action='fulfillment' then
    v_status := p_payload->>'status';
    if not (
      (v_order.fulfillment_status='placed' and v_status in ('processing','cancelled')) or
      (v_order.fulfillment_status='processing' and v_status in ('shipped','cancelled')) or
      (v_order.fulfillment_status='shipped' and v_status='out_for_delivery') or
      (v_order.fulfillment_status='out_for_delivery' and v_status='delivered')
    ) then raise exception using errcode='P4091', message='Invalid fulfillment transition'; end if;
    if length(coalesce(p_payload->>'courier_name',''))>100 or length(coalesce(p_payload->>'tracking_number',''))>100 then
      raise exception using errcode='P4000', message='Tracking information too long';
    end if;
    update public.orders set fulfillment_status=v_status,
      status=case when v_status='cancelled' then 'cancelled' else status end,
      courier_name=case when p_payload ? 'courier_name' then nullif(p_payload->>'courier_name','') else courier_name end,
      tracking_number=case when p_payload ? 'tracking_number' then nullif(p_payload->>'tracking_number','') else tracking_number end
    where id=p_order_id;
    if v_status='cancelled' and v_order.stock_reserved then
      for v_item in select product_id,quantity from public.order_items where order_id=p_order_id order by product_id loop
        update public.products set stock=stock+v_item.quantity where id=v_item.product_id;
      end loop;
      update public.orders set stock_reserved=false where id=p_order_id;
    end if;
    v_event := 'status_changed';
  elsif p_action='confirm_receipt' then
    if v_status<>'delivered' then raise exception using errcode='P4091', message='Order is not delivered'; end if;
    update public.orders set delivery_confirmed_at=now(),
      delivery_issue=case when delivery_issue is not null and delivery_issue->>'resolved_at' is null then
        delivery_issue || jsonb_build_object('resolution','Customer confirmed receipt','resolved_at',now()) else delivery_issue end
    where id=p_order_id;
    v_event := 'receipt_confirmed';
  elsif p_action='report_issue' then
    if v_status<>'delivered' or (v_order.delivery_issue is not null and v_order.delivery_issue->>'resolved_at' is null) then
      raise exception using errcode='P4091', message='Delivery report unavailable';
    end if;
    v_note := btrim(p_payload->>'message');
    if v_note is null or length(v_note) not between 1 and 1000 then raise exception using errcode='P4000', message='Invalid message'; end if;
    update public.orders set delivery_issue=jsonb_build_object('message',v_note,'reported_at',now(),'resolution',null,'resolved_at',null) where id=p_order_id;
    v_event := 'delivery_issue_reported';
  elsif p_action='resolve_issue' then
    if v_order.delivery_issue is null or v_order.delivery_issue->>'resolved_at' is not null then
      raise exception using errcode='P4091', message='No open delivery issue';
    end if;
    v_note := btrim(p_payload->>'resolution');
    if v_note is null or length(v_note) not between 1 and 1000 then raise exception using errcode='P4000', message='Invalid resolution'; end if;
    update public.orders set delivery_issue=delivery_issue || jsonb_build_object('resolution',v_note,'resolved_at',now()) where id=p_order_id;
    v_event := 'delivery_issue_resolved';
  end if;
  update public.orders set tracking_version=tracking_version+1,updated_at=now() where id=p_order_id;
  insert into public.order_tracking_events(order_id,version,event_type,from_status,to_status,actor_id,actor_role,note)
  values(p_order_id,v_order.tracking_version+1,v_event,v_order.fulfillment_status,v_status,p_actor_id,v_role,v_note);
  return p_order_id;
end;
$$;
revoke execute on function public.petko_mutate_order(uuid,uuid,text,text,integer,jsonb) from public, anon, authenticated;
grant execute on function public.petko_mutate_order(uuid,uuid,text,text,integer,jsonb) to service_role;

commit;

-- Admin analytics: apply after migration-003, before deploying analytics code.
-- Additive and safe to rerun. Roll back application code while retaining data.
-- No historical traffic is invented. All reads/writes go through the backend.
begin;

create table if not exists public.analytics_settings (
  singleton boolean primary key default true check (singleton),
  collection_started_at timestamptz not null default now()
);
insert into public.analytics_settings(singleton) values(true) on conflict do nothing;

create table if not exists public.analytics_sessions (
  id uuid primary key,
  user_id uuid references public.users(id) on delete set null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  excluded boolean not null default false
);

-- Identity events share the same event-ID namespace, but never count as views.
create table if not exists public.analytics_events (
  id uuid primary key,
  session_id uuid not null references public.analytics_sessions(id) on delete cascade,
  page text not null check (page in ('login','catalog','product','cart','checkout','orders','identify')),
  audience text not null check (audience in ('guest','customer','admin')),
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_created_idx on public.analytics_events(created_at,session_id) where page <> 'identify';
create index if not exists analytics_events_session_idx on public.analytics_events(session_id);
create index if not exists analytics_sessions_user_idx on public.analytics_sessions(user_id) where user_id is not null;
create index if not exists orders_confirmed_idx on public.orders(delivery_confirmed_at) where delivery_confirmed_at is not null;

alter table public.analytics_settings enable row level security;
alter table public.analytics_sessions enable row level security;
alter table public.analytics_events enable row level security;
revoke all on public.analytics_settings, public.analytics_sessions, public.analytics_events from public, anon, authenticated;
grant select, insert, update, delete on public.analytics_settings, public.analytics_sessions, public.analytics_events to service_role;

create or replace function public.petko_record_analytics_event(
  p_session_id uuid, p_event_id uuid, p_page text,
  p_actor_id uuid, p_is_admin boolean
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_session public.analytics_sessions%rowtype;
  v_event public.analytics_events%rowtype;
  v_audience text;
begin
  if p_session_id is null or p_event_id is null or p_page is null
     or p_page not in ('login','catalog','product','cart','checkout','orders','identify')
     or p_is_admin is null or (p_actor_id is null and (p_page <> 'login' or p_is_admin)) then
    raise exception using errcode='P4000', message='Invalid analytics event';
  end if;

  insert into public.analytics_sessions(id) values(p_session_id) on conflict do nothing;
  select * into strict v_session from public.analytics_sessions where id=p_session_id for update;

  -- A browser UUID is not authorization to change an already linked identity.
  if v_session.user_id is not null and p_actor_id is not null and v_session.user_id <> p_actor_id then
    raise exception using errcode='P4094', message='Analytics session identity changed';
  end if;
  if v_session.excluded then return false; end if;
  if v_session.user_id is not null and p_actor_id is null then
    raise exception using errcode='P4094', message='Analytics session identity changed';
  end if;

  v_audience := case when p_is_admin then 'admin' when p_actor_id is not null then 'customer' else 'guest' end;
  insert into public.analytics_events(id,session_id,page,audience)
    values(p_event_id,p_session_id,p_page,v_audience) on conflict do nothing;
  select * into strict v_event from public.analytics_events where id=p_event_id;
  if v_event.session_id <> p_session_id or v_event.page <> p_page or v_event.audience <> v_audience then
    raise exception using errcode='P4094', message='Analytics event already used';
  end if;

  update public.analytics_sessions set
    user_id=coalesce(user_id,p_actor_id),
    excluded=excluded or p_is_admin,
    last_seen_at=greatest(last_seen_at,clock_timestamp())
  where id=p_session_id;
  return not p_is_admin;
end;
$$;

create or replace function public.petko_admin_analytics(p_start date, p_end date)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_start timestamptz;
  v_end timestamptz;
  v_result jsonb;
begin
  if p_start is null or p_end is null or p_start > p_end or p_end-p_start > 365
     or p_end > (now() at time zone 'Asia/Manila')::date then
    raise exception using errcode='P4000', message='Invalid analytics date range';
  end if;
  v_start := p_start::timestamp at time zone 'Asia/Manila';
  v_end := (p_end+1)::timestamp at time zone 'Asia/Manila';

  with qualifying as materialized (
    select id,user_id,subtotal_amount,created_at,delivery_confirmed_at
    from public.orders
    where status <> 'cancelled' and fulfillment_status <> 'cancelled'
  ), placed as materialized (
    select * from qualifying where created_at >= v_start and created_at < v_end
  ), completed as materialized (
    select * from qualifying where delivery_confirmed_at >= v_start and delivery_confirmed_at < v_end
  ), buyers as (
    select q.user_id,min(q.created_at) as first_order
    from qualifying q
    where q.user_id in (select user_id from placed)
    group by q.user_id
  ), views as materialized (
    select e.session_id,e.created_at,e.audience,s.user_id
    from public.analytics_events e
    join public.analytics_sessions s on s.id=e.session_id
    where e.created_at >= v_start and e.created_at < v_end
      and e.page <> 'identify' and e.audience <> 'admin' and not s.excluded
      and not exists (
        select 1 from public.users u
        left join auth.users a on a.id=u.id
        where u.id=s.user_id and (
          u.role='admin' or (
            a.email_confirmed_at is not null and exists (
              select 1 from public.admin_access_emails ae where ae.email=lower(btrim(a.email))
            )
          )
        )
      )
  ), placed_daily as (
    select (created_at at time zone 'Asia/Manila')::date as day,
      count(*) as orders,sum(subtotal_amount) as value
    from placed group by 1
  ), completed_daily as (
    select (delivery_confirmed_at at time zone 'Asia/Manila')::date as day,
      count(*) as orders,sum(subtotal_amount) as value
    from completed group by 1
  ), traffic_daily as (
    select (created_at at time zone 'Asia/Manila')::date as day,
      count(distinct session_id) as sessions,count(*) as views
    from views group by 1
  ), daily as (
    select p_start+n as day,
      coalesce(p.orders,0) as placed_orders,coalesce(p.value,0) as placed_value,
      coalesce(c.orders,0) as completed_orders,coalesce(c.value,0) as completed_sales,
      coalesce(t.sessions,0) as sessions,coalesce(t.views,0) as page_views
    from generate_series(0,p_end-p_start) n
    left join placed_daily p on p.day=p_start+n
    left join completed_daily c on c.day=p_start+n
    left join traffic_daily t on t.day=p_start+n
  ), ranked_products as (
    select i.product_id,
      coalesce(
        (array_agg(nullif(btrim(i.product_name),'') order by o.created_at desc,o.id desc,i.id desc)
          filter(where nullif(btrim(i.product_name),'') is not null))[1],
        max(p.name),'Unknown product'
      ) as name,
      sum(i.quantity) as units,sum(i.quantity*i.unit_price) as value
    from placed o
    join public.order_items i on i.order_id=o.id
    left join public.products p on p.id=i.product_id
    group by i.product_id
    order by units desc,value desc,i.product_id
    limit 10
  )
  select jsonb_build_object(
    'range',jsonb_build_object('start',p_start,'end',p_end,'timezone','Asia/Manila'),
    'generatedAt',now(),
    'collectionStartedAt',(select collection_started_at from public.analytics_settings where singleton),
    'summary',jsonb_build_object(
      'placedOrders',(select count(*) from placed),
      'placedValue',(select coalesce(sum(subtotal_amount),0) from placed),
      'completedOrders',(select count(*) from completed),
      'completedSales',(select coalesce(sum(subtotal_amount),0) from completed),
      'buyers',(select count(*) from buyers),
      'newBuyers',(select count(*) from buyers where first_order >= v_start),
      'returningBuyers',(select count(*) from buyers where first_order < v_start),
      'sessions',(select count(distinct session_id) from views),
      'guestSessions',(select count(distinct session_id) from views where user_id is null),
      'customerSessions',(select count(distinct session_id) from views where user_id is not null),
      'pageViews',(select count(*) from views),
      'guestPageViews',(select count(*) from views where audience='guest'),
      'customerPageViews',(select count(*) from views where audience='customer')
    ),
    'daily',(select coalesce(jsonb_agg(jsonb_build_object(
      'date',day,'placedOrders',placed_orders,'placedValue',placed_value,
      'completedOrders',completed_orders,'completedSales',completed_sales,
      'sessions',sessions,'pageViews',page_views
    ) order by day),'[]'::jsonb) from daily),
    'topProducts',(select coalesce(jsonb_agg(jsonb_build_object(
      'productId',product_id,'name',name,'units',units,'placedValue',value
    ) order by units desc,value desc,product_id),'[]'::jsonb) from ranked_products)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.petko_record_analytics_event(uuid,uuid,text,uuid,boolean) from public,anon,authenticated;
revoke all on function public.petko_admin_analytics(date,date) from public,anon,authenticated;
grant execute on function public.petko_record_analytics_event(uuid,uuid,text,uuid,boolean) to service_role;
grant execute on function public.petko_admin_analytics(date,date) to service_role;

commit;
