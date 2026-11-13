-- ISOLATED DATABASE ONLY. All synthetic reviews/purchases/identities roll back.
begin;
do $$
#variable_conflict use_variable
declare
  owner_id uuid:=gen_random_uuid(); other_id uuid:=gen_random_uuid();
  product_id uuid:=gen_random_uuid(); sibling_id uuid:=gen_random_uuid(); unrelated_id uuid:=gen_random_uuid();
  order_id uuid:=gen_random_uuid(); second_order uuid:=gen_random_uuid(); cancelled_order uuid:=gen_random_uuid();
  item_id uuid:=gen_random_uuid(); sibling_item uuid:=gen_random_uuid(); repeated_item uuid:=gen_random_uuid();
  cancelled_item uuid:=gen_random_uuid(); review_id uuid; sibling_review uuid; result jsonb; context jsonb;
  parent_name text:='Review family '||gen_random_uuid(); fn record;
begin
  if not (select relrowsecurity from pg_class where oid='public.product_reviews'::regclass)
    or exists(select 1 from pg_policy where polrelid='public.product_reviews'::regclass)
    or has_table_privilege('anon','public.product_reviews','select')
    or has_table_privilege('authenticated','public.product_reviews','insert') then
    raise exception 'Review table is not private';
  end if;
  for fn in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and proname in ('petko_review_projection','petko_product_reviews','petko_review_context',
      'petko_save_product_review','petko_withdraw_product_review','petko_admin_product_reviews','petko_moderate_product_review') loop
    if has_function_privilege('anon',fn.oid,'execute') or has_function_privilege('authenticated',fn.oid,'execute')
      or not has_function_privilege('service_role',fn.oid,'execute') then
      raise exception 'Review function is not private: %',fn.oid::regprocedure;
    end if;
  end loop;
  insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values
    (owner_id,owner_id::text||'@review-test.invalid','{"full_name":"Alex Example"}',now()),
    (other_id,other_id::text||'@review-test.invalid','{"full_name":"Bea Buyer"}',now());
  insert into public.products(id,name,parent_product_name,variant_attributes,price,stock,category,pet_type) values
    (product_id,'Food small',parent_name,'{"size":"Small"}',100,40,'food','both'),
    (sibling_id,'Food large',parent_name,'{"size":"Large"}',200,40,'food','both'),
    (unrelated_id,'Other product','','{}',90,40,'food','both');
  insert into public.orders(id,user_id,total_amount,subtotal_amount,fulfillment_status) values
    (order_id,owner_id,500,500,'shipped'),(second_order,owner_id,100,100,'delivered'),
    (cancelled_order,owner_id,100,100,'cancelled');
  update public.orders set status='cancelled' where id=cancelled_order;
  insert into public.order_items(id,order_id,product_id,quantity,unit_price) values
    (item_id,order_id,product_id,1,100),(sibling_item,order_id,sibling_id,2,200),
    (repeated_item,second_order,product_id,1,100),(cancelled_item,cancelled_order,product_id,1,100);
  insert into public.cart_items(user_id,product_id,quantity) values(owner_id,product_id,3);
  context:=public.petko_review_context(owner_id,product_id);
  if (context->>'eligible')::boolean or context->>'reason'<>'receipt_required' then raise exception 'Shipped/delivered purchase qualified early'; end if;
  begin
    perform public.petko_save_product_review(owner_id,product_id,item_id,5,'Too early',null);
    raise exception 'Unconfirmed shipped review accepted';
  exception when sqlstate 'P4091' then null; end;
  begin
    perform public.petko_save_product_review(owner_id,product_id,repeated_item,5,'Too early',null);
    raise exception 'Admin delivered review accepted';
  exception when sqlstate 'P4091' then null; end;
  begin
    perform public.petko_save_product_review(other_id,product_id,item_id,5,'Foreign',null);
    raise exception 'Foreign purchase accepted';
  exception when sqlstate 'P4040' then null; end;
  begin
    perform public.petko_review_context(other_id,product_id,order_id);
    raise exception 'Foreign order context accepted';
  exception when sqlstate 'P4040' then null; end;
  begin
    perform public.petko_save_product_review(owner_id,unrelated_id,item_id,5,'Wrong product',null);
    raise exception 'Mismatched product accepted';
  exception when sqlstate 'P4040' then null; end;
  begin
    perform public.petko_save_product_review(owner_id,product_id,cancelled_item,5,'Cancelled',null);
    raise exception 'Cancelled purchase accepted';
  exception when sqlstate 'P4091' then null; end;
  update public.orders set fulfillment_status='delivered' where id=order_id;
  perform public.petko_mutate_order(order_id,owner_id,'customer','confirm_receipt',0,'{}');
  perform public.petko_mutate_order(second_order,owner_id,'customer','confirm_receipt',0,'{}');
  context:=public.petko_review_context(owner_id,product_id,order_id);
  if not (context->>'eligible')::boolean or context->>'order_item_id'<>item_id::text then raise exception 'Confirmed purchase not eligible'; end if;
  if public.petko_review_context(other_id,unrelated_id)->>'reason'<>'purchase_required' then raise exception 'No-purchase reason incorrect'; end if;
  begin
    perform public.petko_save_product_review(owner_id,product_id,item_id,0,'',null);
    raise exception 'Zero rating accepted';
  exception when sqlstate 'P4000' then null; end;
  begin
    perform public.petko_save_product_review(owner_id,product_id,item_id,6,'',null);
    raise exception 'High rating accepted';
  exception when sqlstate 'P4000' then null; end;
  begin
    perform public.petko_save_product_review(owner_id,product_id,item_id,5,repeat('x',2001),null);
    raise exception 'Oversized review accepted';
  exception when sqlstate 'P4000' then null; end;
  result:=public.petko_save_product_review(owner_id,product_id,item_id,5,'  <script>inert text</script>  ',null);
  review_id:=(result->>'id')::uuid;
  if result->>'comment'<>'<script>inert text</script>' or result->>'author_name'<>'Alex E.' then raise exception 'Normalization/projection incorrect'; end if;
  begin
    perform public.petko_save_product_review(owner_id,product_id,item_id,4,'Repeat same item',null);
    raise exception 'Repeat same item added without version';
  exception when sqlstate 'P4090' then null; end;
  result:=public.petko_save_product_review(owner_id,product_id,repeated_item,4,'Second order review',null);
  if result->>'comment'<>'Second order review' then raise exception 'Repeat order review failed'; end if;
  result:=public.petko_save_product_review(owner_id,sibling_id,sibling_item,3,'',null);
  sibling_review:=(result->>'id')::uuid;
  update public.products set stock=0 where id=sibling_id;
  result:=public.petko_product_reviews(product_id,1,10);
  if (result->>'total')::integer<>3 or (result#>>'{summary,average_rating}')::numeric<>4
    or result#>>'{summary,ratings,3}'<>'1' or result->>'scope'<>'family' then raise exception 'Family aggregates lost inactive sibling'; end if;
  if result->'reviews'->0 ?| array['user_id','order_id','order_item_id','is_hidden','version','withdrawn_at','email','avatar_url'] then
    raise exception 'Public projection leaked private information';
  end if;
  result:=public.petko_product_reviews(product_id,2,1);
  if jsonb_array_length(result->'reviews')<>1 or result->>'totalPages'<>'2' then raise exception 'Pagination incorrect'; end if;
  begin
    perform public.petko_product_reviews(sibling_id,1,10);
    raise exception 'Inactive review root accepted';
  exception when sqlstate 'P4040' then null; end;
  perform public.petko_moderate_product_review(review_id,true,0);
  if public.petko_product_reviews(product_id,1,10)#>>'{summary,average_rating}'<>'3.00' then raise exception 'Hidden rating contributed'; end if;
  begin
    perform public.petko_save_product_review(owner_id,product_id,item_id,4,'Stale',0);
    raise exception 'Stale owner write accepted';
  exception when sqlstate 'P4090' then null; end;
  result:=public.petko_save_product_review(owner_id,product_id,repeated_item,4,'Edited hidden',1);
  if not (result->>'is_hidden')::boolean or result->>'version'<>'2' then raise exception 'Edit bypassed moderation'; end if;
  begin
    perform public.petko_withdraw_product_review(other_id,review_id,2);
    raise exception 'Foreign withdrawal accepted';
  exception when sqlstate 'P4040' then null; end;
  perform public.petko_withdraw_product_review(owner_id,review_id,2);
  result:=public.petko_save_product_review(owner_id,product_id,item_id,2,'Reposted',3);
  if not (result->>'is_hidden')::boolean or result->'withdrawn_at'<>'null'::jsonb then raise exception 'Repost bypassed hidden state'; end if;
  begin
    perform public.petko_moderate_product_review(review_id,false,3);
    raise exception 'Stale moderation accepted';
  exception when sqlstate 'P4090' then null; end;
  perform public.petko_moderate_product_review(review_id,false,4);
  if public.petko_product_reviews(product_id,1,10)#>>'{summary,total_reviews}'<>'2' then raise exception 'Unhide did not restore'; end if;
  perform public.petko_withdraw_product_review(owner_id,review_id,5);
  if public.petko_product_reviews(product_id,1,10)#>>'{summary,total_reviews}'<>'1' then raise exception 'Withdrawn review contributed'; end if;
  if public.petko_admin_product_reviews(1,20,'all')->>'total'<>'2'
    or public.petko_admin_product_reviews(1,20,'visible')->>'total'<>'1' then raise exception 'Admin filters incorrect'; end if;
  if (select stock from public.products where id=product_id)<>40
    or (select quantity from public.cart_items c where c.user_id=owner_id and c.product_id=product_id)<>3
    or (select tracking_version from public.orders where id=order_id)<>1 then raise exception 'Review changed stock/cart/tracking'; end if;
  perform public.petko_record_analytics_event(gen_random_uuid(),gen_random_uuid(),'catalog',null,false);
  perform public.petko_record_analytics_event(gen_random_uuid(),gen_random_uuid(),'product',null,false);
  begin
    perform public.petko_record_analytics_event(gen_random_uuid(),gen_random_uuid(),'checkout',null,false);
    raise exception 'Anonymous private analytics accepted';
  exception when sqlstate 'P4000' then null; end;
  perform public.petko_delete_own_account(owner_id);
  if exists(select 1 from public.product_reviews where id in(review_id,sibling_review))
    or exists(select 1 from auth.users where id=owner_id)
    or exists(select 1 from public.orders where id in(order_id,second_order,cancelled_order) and user_id is not null)
    or public.petko_product_reviews(product_id,1,10)#>>'{summary,total_reviews}'<>'0' then
    raise exception 'Account deletion retained reviews/identity or changed anonymization';
  end if;
  raise notice 'PASS review eligibility, isolation, moderation, family aggregates, grants, analytics and account cascade';
end;
$$;
rollback;
