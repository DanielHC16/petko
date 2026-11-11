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
