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
