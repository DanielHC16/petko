-- WHAT: Per-order product reviews and unreviewed purchase prioritization.
-- WHY: Allow customers to leave distinct reviews for the same product across different orders.
-- APPLY: Supabase SQL editor or CLI.
-- Idempotent/additive. Rollback application code; retain review data and grants.
begin;

-- 1. Replace unique constraint on (user_id, product_id) with unique constraint on (order_item_id)
alter table public.product_reviews drop constraint if exists product_reviews_user_id_product_id_key;
drop index if exists public.product_reviews_user_id_product_id_key;
alter table public.product_reviews drop constraint if exists product_reviews_order_item_id_key;
alter table public.product_reviews add constraint product_reviews_order_item_id_key unique (order_item_id);

-- 2. Update petko_review_context to support per-order scoping and unreviewed purchase prioritization
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

  if p_order_id is not null then
    -- Scoped to a specific order
    select i.id into v_item from public.orders o join public.order_items i on i.order_id=o.id
      where o.user_id=p_user_id and i.product_id=p_product_id and o.id=p_order_id
        and o.delivery_confirmed_at is not null and o.fulfillment_status<>'cancelled' and o.status<>'cancelled'
      order by o.delivery_confirmed_at desc,i.id limit 1;
    v_purchased := exists(select 1 from public.orders o join public.order_items i on i.order_id=o.id
      where o.user_id=p_user_id and i.product_id=p_product_id and o.id=p_order_id
        and o.fulfillment_status<>'cancelled' and o.status<>'cancelled');
    if v_item is not null then
      select * into v_review from public.product_reviews where user_id=p_user_id and order_item_id=v_item;
    end if;
  else
    -- Global product scope: prefer unreviewed delivered purchase first, otherwise latest delivered purchase
    select i.id into v_item from public.orders o join public.order_items i on i.order_id=o.id
      left join public.product_reviews r on r.order_item_id=i.id and r.user_id=p_user_id and r.withdrawn_at is null
      where o.user_id=p_user_id and i.product_id=p_product_id
        and o.delivery_confirmed_at is not null and o.fulfillment_status<>'cancelled' and o.status<>'cancelled'
        and r.id is null
      order by o.delivery_confirmed_at desc,i.id limit 1;
    if v_item is null then
      select i.id into v_item from public.orders o join public.order_items i on i.order_id=o.id
        where o.user_id=p_user_id and i.product_id=p_product_id
          and o.delivery_confirmed_at is not null and o.fulfillment_status<>'cancelled' and o.status<>'cancelled'
        order by o.delivery_confirmed_at desc,i.id limit 1;
    end if;
    v_purchased := exists(select 1 from public.orders o join public.order_items i on i.order_id=o.id
      where o.user_id=p_user_id and i.product_id=p_product_id
        and o.fulfillment_status<>'cancelled' and o.status<>'cancelled');
    if v_item is not null then
      select * into v_review from public.product_reviews where user_id=p_user_id and order_item_id=v_item;
    end if;
  end if;

  return jsonb_build_object('eligible',v_item is not null,
    'reason',case when v_item is not null then 'eligible' when v_purchased then 'receipt_required' else 'purchase_required' end,
    'order_item_id',v_item,'review',case when v_review.id is not null then public.petko_review_projection(v_review) else null end);
end;
$$;

-- 3. Update petko_save_product_review to check and update by order_item_id
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
  select * into v_review from public.product_reviews where user_id=p_user_id and order_item_id=p_order_item_id for update;
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

commit;
