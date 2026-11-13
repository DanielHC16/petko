-- WHAT: Verified-purchase product reviews and public storefront analytics.
-- WHY: Allow guest review reads without exposing purchase/identity data; keep
-- owner edits, moderation and account deletion consistent under concurrency.
-- APPLY: Supabase SQL editor or CLI, before the review application release.
-- Idempotent/additive. Rollback application code; retain review data and grants.
begin;

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 2000),
  is_hidden boolean not null default false,
  withdrawn_at timestamptz,
  version integer not null default 0 check (version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id,product_id)
);
create index if not exists product_reviews_visible_idx
  on public.product_reviews(product_id,created_at desc,id desc)
  where not is_hidden and withdrawn_at is null;
create index if not exists product_reviews_order_item_idx on public.product_reviews(order_item_id);
create index if not exists product_reviews_admin_idx on public.product_reviews(created_at desc,id desc);
create index if not exists order_items_product_order_idx on public.order_items(product_id,order_id);
alter table public.product_reviews enable row level security;
revoke all on public.product_reviews from public,anon,authenticated;
grant select,insert,update,delete on public.product_reviews to service_role;
-- Explicit read grants also support fresh projects without Supabase defaults.
-- The existing tos_accepted column grant provides the owner row-lock privilege.
grant select on public.users,public.products to service_role;

-- This private projection deliberately omits owner/order/item identifiers.
create or replace function public.petko_review_projection(p_review public.product_reviews)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'id',p_review.id,'product_id',p_review.product_id,'product_name',p.name,
    'variant_label',coalesce(nullif((
      select string_agg(value,' · ' order by first_position)
      from (
        select btrim(p.variant_attributes->>key) as value,min(position) as first_position
        from (values ('size',1),('color',2),('weight_volume',3),('flavor_scent',4),('style',5)) k(key,position)
        where nullif(btrim(p.variant_attributes->>key),'') is not null
        group by btrim(p.variant_attributes->>key)
      ) parts
    ),''),p.name),
    'author_name',case
      when btrim(u.full_name)='' or u.full_name ~ '[@[:cntrl:]]' then 'Petko customer'
      else left(split_part(btrim(regexp_replace(u.full_name,'\s+',' ','g')),' ',1),30)
        || case when position(' ' in btrim(u.full_name))>0 then
          ' ' || left(regexp_replace(btrim(u.full_name),'^.*\s+',''),1) || '.' else '' end
    end,
    'rating',p_review.rating,'comment',p_review.comment,
    'created_at',p_review.created_at,'updated_at',p_review.updated_at,
    'version',p_review.version,'is_hidden',p_review.is_hidden,'withdrawn_at',p_review.withdrawn_at
  ) from public.products p join public.users u on u.id=p_review.user_id
  where p.id=p_review.product_id;
$$;

create or replace function public.petko_product_reviews(p_product_id uuid,p_page integer,p_limit integer)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_parent text; v_result jsonb;
begin
  if p_page is null or p_page<1 or p_page>100000 or p_limit is null or p_limit<1 or p_limit>50 then
    raise exception using errcode='P4000',message='Invalid review pagination';
  end if;
  select parent_product_name into v_parent from public.products where id=p_product_id and is_active;
  if not found then raise exception using errcode='P4040',message='Product not found'; end if;
  with visible as materialized (
    select r.* from public.product_reviews r join public.products p on p.id=r.product_id
    where not r.is_hidden and r.withdrawn_at is null
      and (p.id=p_product_id or (nullif(btrim(v_parent),'') is not null and p.parent_product_name=v_parent))
  ), page_rows as (
    select * from visible order by created_at desc,id desc offset (p_page-1)*p_limit limit p_limit
  ), stats as (
    select count(*) as total,round(avg(rating),2) as average,
      count(*) filter(where rating=1) as r1,count(*) filter(where rating=2) as r2,
      count(*) filter(where rating=3) as r3,count(*) filter(where rating=4) as r4,
      count(*) filter(where rating=5) as r5 from visible
  ) select jsonb_build_object(
    'reviews',coalesce((select jsonb_agg(public.petko_review_projection(r) - array['version','is_hidden','withdrawn_at']
      order by r.created_at desc,r.id desc) from page_rows r),'[]'::jsonb),
    'summary',jsonb_build_object('average_rating',s.average,'total_reviews',s.total,
      'ratings',jsonb_build_object('1',s.r1,'2',s.r2,'3',s.r3,'4',s.r4,'5',s.r5)),
    'page',p_page,'limit',p_limit,'total',s.total,'totalPages',ceil(s.total::numeric/p_limit),
    'scope',case when nullif(btrim(v_parent),'') is null then 'product' else 'family' end
  ) into v_result from stats s;
  return v_result;
end;
$$;

create or replace function public.petko_review_context(p_user_id uuid,p_product_id uuid,p_order_id uuid default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_item uuid; v_purchased boolean; v_review public.product_reviews%rowtype;
begin
  if not exists(select 1 from public.users where id=p_user_id)
    or not exists(select 1 from public.products where id=p_product_id) then
    raise exception using errcode='P4040',message='Account or product not found';
  end if;
  if p_order_id is not null and not exists(
    select 1 from public.orders o join public.order_items i on i.order_id=o.id
    where o.id=p_order_id and o.user_id=p_user_id and i.product_id=p_product_id
  ) then raise exception using errcode='P4040',message='Purchase not found'; end if;
  select i.id into v_item from public.orders o join public.order_items i on i.order_id=o.id
    where o.user_id=p_user_id and i.product_id=p_product_id
      and (p_order_id is null or o.id=p_order_id)
      and o.delivery_confirmed_at is not null and o.fulfillment_status<>'cancelled' and o.status<>'cancelled'
    order by o.delivery_confirmed_at desc,i.id limit 1;
  v_purchased := exists(select 1 from public.orders o join public.order_items i on i.order_id=o.id
    where o.user_id=p_user_id and i.product_id=p_product_id
      and (p_order_id is null or o.id=p_order_id) and o.fulfillment_status<>'cancelled' and o.status<>'cancelled');
  select * into v_review from public.product_reviews where user_id=p_user_id and product_id=p_product_id;
  return jsonb_build_object('eligible',v_item is not null,
    'reason',case when v_item is not null then 'eligible' when v_purchased then 'receipt_required' else 'purchase_required' end,
    'order_item_id',v_item,'review',case when v_review.id is not null then public.petko_review_projection(v_review) else null end);
end;
$$;

create or replace function public.petko_save_product_review(
  p_user_id uuid,p_product_id uuid,p_order_item_id uuid,p_rating integer,p_comment text,p_expected_version integer default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_order_id uuid; v_order public.orders%rowtype; v_review public.product_reviews%rowtype;
begin
  if p_rating is null or p_rating<1 or p_rating>5 or p_comment is null or char_length(btrim(p_comment))>2000
    or (p_expected_version is not null and (p_expected_version<0 or p_expected_version>2147483646)) then
    raise exception using errcode='P4000',message='Invalid review';
  end if;
  -- Serialize owner writes and identity deletion before locking the purchase/review.
  perform 1 from public.users where id=p_user_id for update;
  if not found then raise exception using errcode='P4040',message='Account not found'; end if;
  select order_id into v_order_id from public.order_items where id=p_order_item_id and product_id=p_product_id;
  if not found then raise exception using errcode='P4040',message='Purchase not found'; end if;
  select * into v_order from public.orders where id=v_order_id and user_id=p_user_id for update;
  if not found then raise exception using errcode='P4040',message='Purchase not found'; end if;
  if v_order.delivery_confirmed_at is null or v_order.fulfillment_status='cancelled' or v_order.status='cancelled' then
    raise exception using errcode='P4091',message='Confirmed receipt required';
  end if;
  select * into v_review from public.product_reviews where user_id=p_user_id and product_id=p_product_id for update;
  if found then
    if p_expected_version is null or p_expected_version<>v_review.version then
      raise exception using errcode='P4090',message='Review changed';
    end if;
    update public.product_reviews set rating=p_rating,comment=btrim(p_comment),order_item_id=p_order_item_id,
      withdrawn_at=null,version=version+1,updated_at=clock_timestamp()
      where id=v_review.id returning * into v_review;
  else
    if p_expected_version is not null then raise exception using errcode='P4090',message='Review changed'; end if;
    insert into public.product_reviews(user_id,product_id,order_item_id,rating,comment)
      values(p_user_id,p_product_id,p_order_item_id,p_rating,btrim(p_comment)) returning * into v_review;
  end if;
  return public.petko_review_projection(v_review);
end;
$$;

create or replace function public.petko_withdraw_product_review(p_user_id uuid,p_review_id uuid,p_expected_version integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_review public.product_reviews%rowtype;
begin
  if p_expected_version is null or p_expected_version<0 or p_expected_version>2147483646 then
    raise exception using errcode='P4000',message='Invalid review version';
  end if;
  perform 1 from public.users where id=p_user_id for update;
  if not found then raise exception using errcode='P4040',message='Account not found'; end if;
  select * into v_review from public.product_reviews where id=p_review_id and user_id=p_user_id for update;
  if not found then raise exception using errcode='P4040',message='Review not found'; end if;
  if v_review.version<>p_expected_version then raise exception using errcode='P4090',message='Review changed'; end if;
  update public.product_reviews set withdrawn_at=clock_timestamp(),version=version+1,updated_at=clock_timestamp()
    where id=p_review_id;
  return true;
end;
$$;

create or replace function public.petko_admin_product_reviews(p_page integer,p_limit integer,p_visibility text)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_result jsonb;
begin
  if p_page is null or p_page<1 or p_page>100000 or p_limit is null or p_limit<1 or p_limit>50
    or p_visibility is null or p_visibility not in ('all','visible','hidden') then
    raise exception using errcode='P4000',message='Invalid review filter';
  end if;
  with filtered as materialized (
    select * from public.product_reviews where p_visibility='all'
      or (p_visibility='hidden' and is_hidden)
      or (p_visibility='visible' and not is_hidden and withdrawn_at is null)
  ), page_rows as (
    select * from filtered order by created_at desc,id desc offset (p_page-1)*p_limit limit p_limit
  ) select jsonb_build_object(
    'reviews',coalesce((select jsonb_agg(public.petko_review_projection(r) order by r.created_at desc,r.id desc) from page_rows r),'[]'::jsonb),
    'total',count(*),'page',p_page,'limit',p_limit,'totalPages',ceil(count(*)::numeric/p_limit)
  ) into v_result from filtered;
  return v_result;
end;
$$;

create or replace function public.petko_moderate_product_review(p_review_id uuid,p_is_hidden boolean,p_expected_version integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_review public.product_reviews%rowtype;
begin
  if p_is_hidden is null or p_expected_version is null or p_expected_version<0 or p_expected_version>2147483646 then
    raise exception using errcode='P4000',message='Invalid moderation';
  end if;
  select * into v_review from public.product_reviews where id=p_review_id for update;
  if not found then raise exception using errcode='P4040',message='Review not found'; end if;
  if v_review.version<>p_expected_version then raise exception using errcode='P4090',message='Review changed'; end if;
  update public.product_reviews set is_hidden=p_is_hidden,version=version+1,updated_at=clock_timestamp()
    where id=p_review_id returning * into v_review;
  return public.petko_review_projection(v_review);
end;
$$;

revoke all on function public.petko_review_projection(public.product_reviews),
  public.petko_product_reviews(uuid,integer,integer),public.petko_review_context(uuid,uuid,uuid),
  public.petko_save_product_review(uuid,uuid,uuid,integer,text,integer),
  public.petko_withdraw_product_review(uuid,uuid,integer),public.petko_admin_product_reviews(integer,integer,text),
  public.petko_moderate_product_review(uuid,boolean,integer) from public,anon,authenticated;
grant execute on function public.petko_review_projection(public.product_reviews),
  public.petko_product_reviews(uuid,integer,integer),public.petko_review_context(uuid,uuid,uuid),
  public.petko_save_product_review(uuid,uuid,uuid,integer,text,integer),
  public.petko_withdraw_product_review(uuid,uuid,integer),public.petko_admin_product_reviews(integer,integer,text),
  public.petko_moderate_product_review(uuid,boolean,integer) to service_role;

-- Keep analytics identity rotation/idempotency/admin exclusion unchanged.
create or replace function public.petko_record_analytics_event(
  p_session_id uuid,p_event_id uuid,p_page text,p_actor_id uuid,p_is_admin boolean
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_session public.analytics_sessions%rowtype; v_event public.analytics_events%rowtype; v_audience text;
begin
  if p_session_id is null or p_event_id is null or p_page is null
    or p_page not in ('login','catalog','product','cart','checkout','orders','identify')
    or p_is_admin is null or (p_actor_id is null and (p_page not in ('login','catalog','product') or p_is_admin)) then
    raise exception using errcode='P4000',message='Invalid analytics event';
  end if;
  insert into public.analytics_sessions(id) values(p_session_id) on conflict do nothing;
  select * into strict v_session from public.analytics_sessions where id=p_session_id for update;
  if v_session.user_id is not null and p_actor_id is not null and v_session.user_id<>p_actor_id then
    raise exception using errcode='P4094',message='Analytics session identity changed';
  end if;
  if v_session.excluded then return false; end if;
  if v_session.user_id is not null and p_actor_id is null then
    raise exception using errcode='P4094',message='Analytics session identity changed';
  end if;
  v_audience := case when p_is_admin then 'admin' when p_actor_id is not null then 'customer' else 'guest' end;
  insert into public.analytics_events(id,session_id,page,audience)
    values(p_event_id,p_session_id,p_page,v_audience) on conflict do nothing;
  select * into strict v_event from public.analytics_events where id=p_event_id;
  if v_event.session_id<>p_session_id or v_event.page<>p_page or v_event.audience<>v_audience then
    raise exception using errcode='P4094',message='Analytics event already used';
  end if;
  update public.analytics_sessions set user_id=coalesce(user_id,p_actor_id),excluded=excluded or p_is_admin,
    last_seen_at=greatest(last_seen_at,clock_timestamp()) where id=p_session_id;
  return not p_is_admin;
end;
$$;
revoke all on function public.petko_record_analytics_event(uuid,uuid,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.petko_record_analytics_event(uuid,uuid,text,uuid,boolean) to service_role;
commit;
