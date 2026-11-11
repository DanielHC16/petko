-- Run only in an isolated local/test database AFTER migration-003.
-- Assertions exercise the actual PostgreSQL functions; all fixtures roll back.
begin;

do $$
declare
  v_owner uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_admin uuid := gen_random_uuid();
  v_product uuid := gen_random_uuid();
  v_order uuid;
  v_cancel uuid;
  v_request uuid := gen_random_uuid();
  v_payload jsonb;
  v_before integer;
  v_version integer;
begin
  if has_function_privilege('anon','public.petko_create_order(uuid,jsonb)','execute')
     or has_function_privilege('authenticated','public.petko_create_order(uuid,jsonb)','execute')
     or has_function_privilege('anon','public.petko_mutate_order(uuid,uuid,text,text,integer,jsonb)','execute')
     or has_function_privilege('authenticated','public.petko_mutate_order(uuid,uuid,text,text,integer,jsonb)','execute') then
    raise exception 'Public callers must not execute privileged checkout/tracking functions';
  end if;
  if not has_function_privilege('service_role','public.petko_create_order(uuid,jsonb)','execute') then
    raise exception 'Backend service role must be allowed to create orders';
  end if;
  if has_table_privilege('authenticated','public.order_tracking_events','insert') or has_table_privilege('anon','public.orders','update') then
    raise exception 'Client write grants must remain revoked';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.order_tracking_events'::regclass) then
    raise exception 'Event history needs RLS';
  end if;

  insert into auth.users(id,email,raw_user_meta_data) values
    (v_owner,v_owner::text || '@order-test.invalid','{}'),
    (v_other,v_other::text || '@order-test.invalid','{}'),
    (v_admin,v_admin::text || '@order-test.invalid','{}');
  insert into public.users(id,email,role) values
    (v_owner,v_owner::text || '@order-test.invalid','customer'),
    (v_other,v_other::text || '@order-test.invalid','customer'),
    (v_admin,v_admin::text || '@order-test.invalid','admin')
  on conflict(id) do nothing;
  insert into public.products(id,name,price,stock,category,pet_type) values(v_product,'Tracking verification fixture',500,10,'food','both');
  v_payload := jsonb_build_object(
    'checkout_request_id',v_request,'payment_method','cod','delivery_method','standard',
    'shipping',jsonb_build_object('full_name','Test Customer','email','test@example.invalid','phone','09171234567','address_line1','Test street','address_line2','','city','Manila','province','Metro Manila','postal_code','1000'),
    'items',jsonb_build_array(jsonb_build_object('product_id',v_product,'quantity',2)));
  v_order := public.petko_create_order(v_owner,v_payload);
  if (select total_amount<>1000 or shipping_fee<>0 or subtotal_amount<>1000 or status<>'pending' from public.orders where id=v_order) then
    raise exception 'Server prices, standard free-shipping threshold or COD status are incorrect';
  end if;
  if (select stock from public.products where id=v_product)<>8 then raise exception 'Stock reservation failed'; end if;
  if public.petko_create_order(v_owner,v_payload)<>v_order or (select stock from public.products where id=v_product)<>8 then
    raise exception 'Same checkout retry must not create a second order or reserve stock twice';
  end if;
  begin
    perform public.petko_create_order(v_owner,v_payload || '{"delivery_method":"express"}');
    raise exception 'Changed payload reused a checkout request';
  exception when sqlstate 'P4093' then null; end;
  begin
    perform public.petko_mutate_order(v_order,v_other,'customer','confirm_receipt',0,'{}');
    raise exception 'Another owner confirmed this order';
  exception when sqlstate 'P4040' then null; end;
  begin
    perform public.petko_mutate_order(v_order,v_admin,'admin','confirm_receipt',0,'{}');
    raise exception 'Admin confirmed a customer order';
  exception when sqlstate 'P4040' then null; end;
  begin
    perform public.petko_mutate_order(v_order,v_owner,'customer','confirm_receipt',0,'{}');
    raise exception 'Owner confirmed before reported delivery';
  exception when sqlstate 'P4091' then null; end;
  begin
    perform public.petko_mutate_order(v_order,v_admin,'admin','fulfillment',0,'{"status":"delivered"}');
    raise exception 'Admin skipped fulfillment steps';
  exception when sqlstate 'P4091' then null; end;

  perform public.petko_mutate_order(v_order,v_admin,'admin','fulfillment',0,'{"status":"processing"}');
  begin
    perform public.petko_mutate_order(v_order,v_admin,'admin','fulfillment',0,'{"status":"shipped"}');
    raise exception 'Stale version was accepted';
  exception when sqlstate 'P4090' then null; end;
  perform public.petko_mutate_order(v_order,v_admin,'admin','fulfillment',1,'{"status":"shipped","courier_name":"Test Courier","tracking_number":"TEST-123"}');
  begin
    perform public.petko_mutate_order(v_order,v_admin,'admin','fulfillment',2,'{"status":"cancelled"}');
    raise exception 'Shipped order was cancelled';
  exception when sqlstate 'P4091' then null; end;
  perform public.petko_mutate_order(v_order,v_admin,'admin','fulfillment',2,'{"status":"out_for_delivery"}');
  perform public.petko_mutate_order(v_order,v_admin,'admin','fulfillment',3,'{"status":"delivered"}');
  if (select delivery_confirmed_at is not null from public.orders where id=v_order) then raise exception 'Admin delivery must not confirm customer receipt'; end if;
  perform public.petko_mutate_order(v_order,v_owner,'customer','report_issue',4,'{"message":"I have not received this parcel"}');
  perform public.petko_mutate_order(v_order,v_admin,'admin','resolve_issue',5,'{"resolution":"Courier will contact the customer"}');
  if (select delivery_confirmed_at is not null or delivery_issue->>'resolved_at' is null from public.orders where id=v_order) then raise exception 'Issue resolution must leave receipt unconfirmed'; end if;
  perform public.petko_mutate_order(v_order,v_owner,'customer','report_issue',6,'{"message":"Still not received"}');
  perform public.petko_mutate_order(v_order,v_owner,'customer','confirm_receipt',7,'{}');
  perform public.petko_mutate_order(v_order,v_owner,'customer','confirm_receipt',7,'{}');
  if (select delivery_confirmed_at is null or tracking_version<>8 or delivery_issue->>'resolved_at' is null from public.orders where id=v_order) then raise exception 'Owner confirmation/retry/issue closure failed'; end if;
  if (select count(*) from public.order_tracking_events where order_id=v_order and event_type='receipt_confirmed')<>1 then raise exception 'Receipt retry duplicated history'; end if;
  begin
    update public.order_tracking_events set note='tampered' where order_id=v_order;
    raise exception 'History was editable';
  exception when sqlstate 'P4091' then null; end;

  v_payload := jsonb_set(v_payload,'{checkout_request_id}',to_jsonb(gen_random_uuid()));
  v_payload := jsonb_set(v_payload,'{items,0,quantity}','1');
  v_cancel := public.petko_create_order(v_owner,v_payload);
  if (select total_amount<>599 or shipping_fee<>99 from public.orders where id=v_cancel) then raise exception 'Standard shipping under threshold is incorrect'; end if;
  perform public.petko_mutate_order(v_cancel,v_admin,'admin','fulfillment',0,'{"status":"cancelled"}');
  select stock into v_before from public.products where id=v_product;
  begin
    perform public.petko_mutate_order(v_cancel,v_admin,'admin','fulfillment',1,'{"status":"cancelled"}');
    raise exception 'Cancelled order was mutated again';
  exception when sqlstate 'P4091' then null; end;
  if v_before<>8 or (select stock from public.products where id=v_product)<>8 then raise exception 'Cancellation must restore stock exactly once'; end if;

  v_payload := jsonb_set(v_payload,'{checkout_request_id}',to_jsonb(gen_random_uuid()));
  v_payload := jsonb_set(v_payload,'{delivery_method}','"express"');
  v_cancel := public.petko_create_order(v_owner,v_payload);
  if (select total_amount<>699 or shipping_fee<>199 from public.orders where id=v_cancel) then raise exception 'Express shipping is incorrect'; end if;
  select count(*) into v_before from public.orders where user_id=v_owner;
  v_payload := jsonb_set(v_payload,'{checkout_request_id}',to_jsonb(gen_random_uuid()));
  v_payload := jsonb_set(v_payload,'{items,0,quantity}','999');
  begin
    perform public.petko_create_order(v_owner,v_payload);
    raise exception 'Oversold stock';
  exception when sqlstate 'P4092' then null; end;
  if (select count(*) from public.orders where user_id=v_owner)<>v_before or (select stock from public.products where id=v_product)<>7 then raise exception 'Unavailable checkout must leave no partial writes'; end if;
  select tracking_version into v_version from public.orders where id=v_cancel;
  if v_version<>0 then raise exception 'Unmodified order should remain at initial version'; end if;
end $$;

-- Force an event failure after the order update to prove transactional rollback.
create function public.petko_test_reject_event() returns trigger language plpgsql as $$
begin raise exception using errcode='P4000', message='Test event failure'; end;
$$;
create trigger test_reject_order_event before insert on public.order_tracking_events for each row execute function public.petko_test_reject_event();
do $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where fulfillment_status='placed' and checkout_payload->'shipping'->>'email'='test@example.invalid' limit 1;
  begin
    perform public.petko_mutate_order(v_order.id,v_order.user_id,'admin','fulfillment',v_order.tracking_version,'{"status":"processing"}');
    raise exception 'Expected history insert to fail';
  exception when sqlstate 'P4000' then null; end;
  if (select fulfillment_status<>'placed' or tracking_version<>v_order.tracking_version from public.orders where id=v_order.id) then
    raise exception 'History failure must roll back the order transition';
  end if;
end $$;
drop trigger test_reject_order_event on public.order_tracking_events;
drop function public.petko_test_reject_event();

rollback;
