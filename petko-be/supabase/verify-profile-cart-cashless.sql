-- ISOLATED TEST DATABASE ONLY. All synthetic identities/orders roll back.
-- Run after schema.sql/migration-008 with an administrative SQL connection.
begin;
create table public.account_deletion_failure_fixture (
  user_id uuid references auth.users(id) on delete restrict
);
do $$
declare
  v_owner uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_admin uuid := gen_random_uuid();
  v_second_admin uuid := gen_random_uuid();
  v_product uuid := gen_random_uuid();
  v_second_product uuid := gen_random_uuid();
  v_order uuid;
  v_direct uuid;
  v_cancel uuid;
  v_payload jsonb;
  v_direct_payload jsonb;
  v_stats jsonb;
  v_baseline jsonb;
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_count bigint;
begin
  if has_function_privilege('anon','public.petko_delete_own_account(uuid)','execute')
    or has_function_privilege('authenticated','public.petko_delete_own_account(uuid)','execute')
    or not has_function_privilege('service_role','public.petko_delete_own_account(uuid)','execute') then
    raise exception 'Account deletion must be service-role only';
  end if;
  if has_function_privilege('authenticated','public.petko_create_order(uuid,jsonb)','execute')
    or has_table_privilege('authenticated','public.order_tracking_events','update') then
    raise exception 'Checkout/history privileges are not protected';
  end if;
  v_baseline := public.petko_admin_analytics(v_today,v_today);
  insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values
    (v_owner,v_owner::text || '@account-test.invalid','{"saved_shipping":{"full_name":"Fixture"}}',now()),
    (v_other,v_other::text || '@account-test.invalid','{}',now()),
    (v_admin,v_admin::text || '@account-test.invalid','{}',now()),
    (v_second_admin,v_second_admin::text || '@account-test.invalid','{}',now());
  update public.users set role='admin' where id in (v_admin,v_second_admin);
  insert into public.products(id,name,price,stock,category,pet_type) values
    (v_product,'Account checkout fixture',100,50,'food','both'),
    (v_second_product,'Unpurchased fixture',200,50,'food','both');
  insert into public.cart_items(user_id,product_id,quantity) values
    (v_owner,v_product,5),(v_owner,v_second_product,3),(v_other,v_product,8);
  v_payload := jsonb_build_object(
    'checkout_request_id',gen_random_uuid(),'payment_method','gcash','checkout_source','cart',
    'delivery_method','standard','shipping',jsonb_build_object(
      'full_name','Fixture Customer','email','fixture@account-test.invalid','phone','09171234567',
      'address_line1','Fixture Street','address_line2','','city','Manila','province','Metro Manila','postal_code','1000'),
    'items',jsonb_build_array(jsonb_build_object('product_id',v_product,'quantity',2)));
  v_order := public.petko_create_order(v_owner,v_payload);
  if (select not payment_simulated or payment_method<>'gcash' or status<>'paid'
      or total_amount<>299 from public.orders where id=v_order) then
    raise exception 'Cashless method/flag/status or server pricing incorrect';
  end if;
  if (select quantity from public.cart_items where user_id=v_owner and product_id=v_product)<>3
    or (select quantity from public.cart_items where user_id=v_owner and product_id=v_second_product)<>3
    or (select quantity from public.cart_items where user_id=v_other and product_id=v_product)<>8 then
    raise exception 'Checkout did not consume only purchased owner quantities';
  end if;
  if public.petko_create_order(v_owner,v_payload)<>v_order
    or (select stock from public.products where id=v_product)<>48
    or (select quantity from public.cart_items where user_id=v_owner and product_id=v_product)<>3 then
    raise exception 'Idempotent checkout consumed cart or stock twice';
  end if;
  begin
    perform public.petko_create_order(v_owner,v_payload || '{"payment_method":"maya"}');
    raise exception 'Changed method reused checkout request';
  exception when sqlstate 'P4093' then null; end;
  begin
    perform public.petko_create_order(v_owner,v_payload || jsonb_build_object(
      'checkout_request_id',gen_random_uuid(),'payment_simulated',false));
    raise exception 'Client forged simulation flag';
  exception when sqlstate 'P4000' then null; end;
  v_direct_payload := v_payload || jsonb_build_object(
    'checkout_request_id',gen_random_uuid(),'payment_method','card','checkout_source','direct');
  v_direct := public.petko_create_order(v_owner,v_direct_payload);
  if (select quantity from public.cart_items where user_id=v_owner and product_id=v_product)<>3 then
    raise exception 'Direct purchase modified cart';
  end if;
  begin
    perform public.petko_delete_own_account(v_owner);
    raise exception 'Active account was deleted';
  exception when sqlstate 'P4094' then null; end;
  if not exists (select 1 from auth.users where id=v_owner)
    or (select user_id from public.orders where id=v_order)<>v_owner then
    raise exception 'Blocked deletion partially changed identity or orders';
  end if;

  perform public.petko_mutate_order(v_order,v_admin,'admin','fulfillment',0,'{"status":"processing"}');
  perform public.petko_mutate_order(v_order,v_admin,'admin','fulfillment',1,'{"status":"shipped","tracking_number":"private-tracking"}');
  perform public.petko_mutate_order(v_order,v_admin,'admin','fulfillment',2,'{"status":"out_for_delivery"}');
  perform public.petko_mutate_order(v_order,v_admin,'admin','fulfillment',3,'{"status":"delivered"}');
  begin
    perform public.petko_delete_own_account(v_owner);
    raise exception 'Delivered but unconfirmed account was deleted';
  exception when sqlstate 'P4094' then null; end;
  perform public.petko_mutate_order(v_order,v_owner,'customer','report_issue',4,'{"message":"My phone is private"}');
  perform public.petko_mutate_order(v_order,v_owner,'customer','confirm_receipt',5,'{}');
  perform public.petko_mutate_order(v_direct,v_admin,'admin','fulfillment',0,'{"status":"cancelled"}');
  update public.orders set delivery_issue='{"message":"Unresolved legacy issue","resolved_at":null}'
    where id=v_order;
  begin
    perform public.petko_delete_own_account(v_owner);
    raise exception 'Unresolved issue allowed deletion of a completed account';
  exception when sqlstate 'P4094' then null; end;
  update public.orders set delivery_issue=delivery_issue || jsonb_build_object('resolved_at',now())
    where id=v_order;
  -- Include a completed COD purchase: counts retain simulated orders, cash totals do not.
  v_cancel := public.petko_create_order(v_other,v_payload || jsonb_build_object(
    'checkout_request_id',gen_random_uuid(),'payment_method','cod','checkout_source','direct'));
  perform public.petko_mutate_order(v_cancel,v_admin,'admin','fulfillment',0,'{"status":"processing"}');
  perform public.petko_mutate_order(v_cancel,v_admin,'admin','fulfillment',1,'{"status":"shipped"}');
  perform public.petko_mutate_order(v_cancel,v_admin,'admin','fulfillment',2,'{"status":"out_for_delivery"}');
  perform public.petko_mutate_order(v_cancel,v_admin,'admin','fulfillment',3,'{"status":"delivered"}');
  perform public.petko_mutate_order(v_cancel,v_other,'customer','confirm_receipt',4,'{}');
  v_stats := public.petko_admin_analytics(v_today,v_today);
  if (v_stats#>>'{summary,completedSales}')::numeric-(v_baseline#>>'{summary,completedSales}')::numeric<>200
    or (v_stats#>>'{summary,completedOrders}')::integer-(v_baseline#>>'{summary,completedOrders}')::integer<>2
    or (v_stats#>>'{daily,0,completedSales}')::numeric-(v_baseline#>>'{daily,0,completedSales}')::numeric<>200 then
    raise exception 'Simulated sales affected cash totals or normal order counts';
  end if;

  select count(*) into v_count from public.order_tracking_events where order_id in (v_order,v_direct);
  -- An unexpected Auth deletion error must roll back the earlier privacy writes as well.
  insert into account_deletion_failure_fixture(user_id) values(v_owner);
  begin
    perform public.petko_delete_own_account(v_owner);
    raise exception 'Fixture foreign key should have prevented Auth deletion';
  exception when foreign_key_violation then null; end;
  if (select user_id from public.orders where id=v_order) is distinct from v_owner
    or (select shipping is null from public.orders where id=v_order)
    or not exists (select 1 from public.order_tracking_events where actor_id=v_owner) then
    raise exception 'Failed Auth deletion partially anonymized the account';
  end if;
  delete from account_deletion_failure_fixture;
  perform public.petko_delete_own_account(v_owner);
  if exists (select 1 from auth.users where id=v_owner)
    or exists (select 1 from public.users where id=v_owner)
    or exists (select 1 from public.cart_items where user_id=v_owner) then
    raise exception 'Deleted identity/profile/cart survived';
  end if;
  if exists (select 1 from public.orders where id in (v_order,v_direct) and
    (user_id is not null or shipping is not null or checkout_payload is not null
      or checkout_request_id is not null or delivery_issue is not null or tracking_number is not null))
    or exists (select 1 from public.order_tracking_events where
      (order_id in (v_order,v_direct) and note is not null) or actor_id=v_owner) then
    raise exception 'Identifying order data survived anonymization';
  end if;
  if (select count(*) from public.order_tracking_events where order_id in (v_order,v_direct))<>v_count then
    raise exception 'Anonymization destroyed event history';
  end if;
  begin
    update public.order_tracking_events set note='tampered' where order_id=v_order;
    raise exception 'Event immutability was lost';
  exception when sqlstate 'P4091' then null; end;

  -- In this isolated transaction make the remaining admin access list the only effective grant.
  delete from public.admin_access_emails;
  insert into public.admin_access_emails(email) values(v_admin::text || '@account-test.invalid');
  update public.users set role='customer';
  begin
    perform public.petko_delete_own_account(v_admin);
    raise exception 'Last list-granted admin was deleted';
  exception when sqlstate 'P4095' then null; end;
  update public.users set role='admin' where id=v_second_admin;
  perform public.petko_delete_own_account(v_admin);
  if exists (select 1 from public.admin_access_emails where email=v_admin::text || '@account-test.invalid')
    or exists (select 1 from public.order_tracking_events where actor_id=v_admin) then
    raise exception 'Deleted admin grant/history identity survived';
  end if;
  begin
    update public.users set role='customer' where id=v_second_admin;
    raise exception 'A stale demotion preflight removed the remaining admin';
  exception when sqlstate 'P4095' then null; end;
end;
$$;
rollback;
