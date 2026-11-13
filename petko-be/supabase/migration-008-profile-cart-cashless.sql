-- WHAT: Owner profile deletion, account carts, and simulated cashless order placement.
-- WHY: Preserve transactional stock/cart behavior, privacy, and accurate collected sales.
-- HOW TO APPLY: After migration-007, before deploying application code. Safe to rerun.
-- Verify only in an isolated database with verify-profile-cart-cashless.sql.
-- Rollback: roll back app deployment; retain nullable ownership, flags, and privacy protections.
begin;

alter table public.orders alter column user_id drop not null;
-- Keep ON DELETE RESTRICT: only the redaction transaction may unlink ordered accounts.
alter table public.orders add column if not exists payment_simulated boolean not null default false;
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('cod','gcash','maya','card'));

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
  -- Coordinate checkout with account deletion before taking any product/cart locks.
  perform 1 from public.users where id=p_user_id for key share;
  if p_user_id is null or not found then
    raise exception using errcode='P4040', message='User not found';
  end if;
  if coalesce(p_payload->>'payment_method','') not in ('cod','gcash','maya','card')
     or coalesce(p_payload->>'checkout_source','direct') not in ('cart','direct')
     or p_payload ? 'payment_simulated'
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
  insert into public.orders(user_id,status,fulfillment_status,total_amount,subtotal_amount,shipping_fee,payment_method,payment_simulated,delivery_method,shipping,checkout_request_id,checkout_payload,stock_reserved)
  values(p_user_id,case when p_payload->>'payment_method'='cod' then 'pending' else 'paid' end,'placed',v_subtotal+v_shipping,v_subtotal,v_shipping,p_payload->>'payment_method',p_payload->>'payment_method'<>'cod',p_payload->>'delivery_method',p_payload->'shipping',v_request,p_payload,true)
  returning id into v_id;
  for v_item in select value from jsonb_array_elements(p_payload->'items') loop
    update public.products set stock=stock-(v_item->>'quantity')::integer where id=(v_item->>'product_id')::uuid;
    insert into public.order_items(order_id,product_id,quantity,unit_price,product_name,image_url)
    select v_id,id,(v_item->>'quantity')::integer,price,name,image_url from public.products where id=(v_item->>'product_id')::uuid;
  end loop;
  -- Consumption belongs to the initial transaction only: idempotent retries return above.
  if coalesce(p_payload->>'checkout_source','direct')='cart' then
    perform 1 from public.cart_items where user_id=p_user_id
      and product_id in (select (value->>'product_id')::uuid from jsonb_array_elements(p_payload->'items'))
      order by product_id for update;
    for v_item in select value from jsonb_array_elements(p_payload->'items') loop
      delete from public.cart_items where user_id=p_user_id
        and product_id=(v_item->>'product_id')::uuid
        and quantity <= (v_item->>'quantity')::integer;
      update public.cart_items set quantity=quantity-(v_item->>'quantity')::integer
        where user_id=p_user_id and product_id=(v_item->>'product_id')::uuid;
    end loop;
  end if;
  insert into public.order_tracking_events(order_id,version,event_type,to_status,actor_id,actor_role)
  values(v_id,0,'order_placed','placed',p_user_id,'customer');
  return v_id;
end;
$$;
revoke execute on function public.petko_create_order(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.petko_create_order(uuid,jsonb) to service_role;

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
    select id,user_id,subtotal_amount,created_at,delivery_confirmed_at,payment_simulated
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
      count(*) as orders,sum(subtotal_amount) filter (where not payment_simulated) as value
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
      'completedSales',(select coalesce(sum(subtotal_amount) filter (where not payment_simulated),0) from completed),
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

revoke all on function public.petko_admin_analytics(date,date) from public,anon,authenticated;
grant execute on function public.petko_admin_analytics(date,date) to service_role;

-- Permit only removal of identifying fields inside the dedicated deletion transaction.
-- Statuses, sequence, timestamps and event records remain immutable.
create or replace function public.petko_protect_order_event() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_user text := current_setting('petko.deleting_user', true);
begin
  if tg_op='UPDATE' and v_user is not null and v_user<>''
    and (old.actor_id::text=v_user or exists (
      select 1 from public.orders where id=old.order_id and user_id::text=v_user
    ))
    and (to_jsonb(new)-'actor_id'-'note')=(to_jsonb(old)-'actor_id'-'note')
    and (new.actor_id is not distinct from old.actor_id
      or (old.actor_id::text=v_user and new.actor_id is null))
    and new.note is null then
    return new;
  end if;
  raise exception using errcode='P4091', message='Order tracking history is immutable';
end;
$$;
revoke execute on function public.petko_protect_order_event() from public,anon,authenticated;

create or replace function public.petko_delete_own_account(p_user_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_user public.users%rowtype;
  v_email text;
  v_effective_admin boolean;
  v_admin_count integer;
begin
  -- Serialize deletion and role/access mutations while deciding last-admin protection.
  lock table public.users in share row exclusive mode;
  lock table public.admin_access_emails in share row exclusive mode;
  select * into v_user from public.users where id=p_user_id for update;
  if not found then raise exception using errcode='P4040', message='Account not found'; end if;

  select lower(btrim(coalesce(a.email,v_user.email))),
    v_user.role='admin' or (a.email_confirmed_at is not null and exists (
      select 1 from public.admin_access_emails ae where ae.email=lower(btrim(a.email))
    ))
    into v_email,v_effective_admin from auth.users a where a.id=p_user_id;
  if not found then raise exception using errcode='P4040', message='Auth account not found'; end if;
  if v_effective_admin then
    select count(*) into v_admin_count from public.users u join auth.users a on a.id=u.id
      where u.role='admin' or (a.email_confirmed_at is not null and exists (
        select 1 from public.admin_access_emails ae where ae.email=lower(btrim(a.email))
      ));
    if v_admin_count<=1 then
      raise exception using errcode='P4095', message='Last effective admin';
    end if;
  end if;

  perform 1 from public.orders where user_id=p_user_id order by id for update;
  if exists (select 1 from public.orders where user_id=p_user_id and (
    (fulfillment_status<>'cancelled' and delivery_confirmed_at is null)
    or (delivery_issue is not null and delivery_issue->>'resolved_at' is null)
  )) then
    raise exception using errcode='P4094', message='Active orders prevent deletion';
  end if;

  perform set_config('petko.deleting_user', p_user_id::text, true);
  update public.order_tracking_events e set
    actor_id=case when e.actor_id=p_user_id then null else e.actor_id end,
    note=null
    where e.actor_id=p_user_id or exists (
      select 1 from public.orders o where o.id=e.order_id and o.user_id=p_user_id
    );
  update public.orders set user_id=null,shipping=null,checkout_payload=null,
    checkout_request_id=null,delivery_issue=null,courier_name=null,tracking_number=null,
    payment_reference=null where user_id=p_user_id;
  perform set_config('petko.deleting_user','',true);
  delete from public.admin_access_emails where email=v_email;
  -- Auth sessions, identities, profile and cart cascade in the same transaction.
  delete from auth.users where id=p_user_id;
  if not found then raise exception using errcode='P4040', message='Auth account not found'; end if;
  return true;
end;
$$;
revoke all on function public.petko_delete_own_account(uuid) from public,anon,authenticated;
grant execute on function public.petko_delete_own_account(uuid) to service_role;

-- Recheck at the write boundary: an HTTP preflight may have counted an admin
-- who deleted their account before the queued role/list mutation could commit.
create or replace function public.petko_protect_last_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_loses_access boolean := false;
begin
  if tg_table_name='users' then
    if tg_op='UPDATE' then
      v_loses_access := old.role='admin' and new.role<>'admin';
    else
      v_loses_access := old.role='admin' or exists (
        select 1 from public.admin_access_emails where email=lower(btrim(old.email))
      );
    end if;
  else
    v_loses_access := exists (
      select 1 from auth.users a join public.users u on u.id=a.id
      where lower(btrim(a.email))=old.email and a.email_confirmed_at is not null
    );
  end if;
  if v_loses_access then
    perform pg_advisory_xact_lock(hashtextextended('petko-admin-membership',0));
    if not exists (
      select 1 from public.users u join auth.users a on a.id=u.id
      where u.role='admin' or (a.email_confirmed_at is not null and exists (
        select 1 from public.admin_access_emails ae where ae.email=lower(btrim(a.email))
      ))
    ) then
      raise exception using errcode='P4095', message='Last effective admin';
    end if;
  end if;
  return null;
end;
$$;
revoke all on function public.petko_protect_last_admin() from public,anon,authenticated;
drop trigger if exists protect_last_user_admin on public.users;
create trigger protect_last_user_admin after update of role or delete on public.users
  for each row execute function public.petko_protect_last_admin();
drop trigger if exists protect_last_list_admin on public.admin_access_emails;
create trigger protect_last_list_admin after update or delete on public.admin_access_emails
  for each row execute function public.petko_protect_last_admin();

commit;
