-- Isolated verification script for migration-009 (Customer Order Cancellation).
-- Assertions exercise petko_mutate_order with p_action = 'cancel'; all fixtures roll back.
begin;

do $$
declare
  v_owner uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_admin uuid := gen_random_uuid();
  v_product uuid := gen_random_uuid();
  v_order uuid;
  v_shipped_order uuid;
  v_request1 uuid := gen_random_uuid();
  v_request2 uuid := gen_random_uuid();
  v_payload jsonb;
  v_initial_stock integer := 15;
  v_order_qty integer := 3;
begin
  -- Privilege check
  if has_function_privilege('anon','public.petko_mutate_order(uuid,uuid,text,text,integer,jsonb)','execute')
     or has_function_privilege('authenticated','public.petko_mutate_order(uuid,uuid,text,text,integer,jsonb)','execute') then
    raise exception 'Public callers must not execute petko_mutate_order';
  end if;

  -- Create test users
  insert into auth.users(id,email,raw_user_meta_data) values
    (v_owner,v_owner::text || '@cancel-test.invalid','{}'),
    (v_other,v_other::text || '@cancel-test.invalid','{}'),
    (v_admin,v_admin::text || '@cancel-test.invalid','{}');
  insert into public.users(id,email,role) values
    (v_owner,v_owner::text || '@cancel-test.invalid','customer'),
    (v_other,v_other::text || '@cancel-test.invalid','customer'),
    (v_admin,v_admin::text || '@cancel-test.invalid','admin')
  on conflict(id) do nothing;

  -- Create test product with initial stock
  insert into public.products(id,name,price,stock,category,pet_type,is_active)
  values(v_product,'Cancellation verification fixture',250,v_initial_stock,'treats','dog',true);

  -- Place order 1
  v_payload := jsonb_build_object(
    'checkout_request_id',v_request1,'payment_method','cod','delivery_method','standard',
    'shipping',jsonb_build_object('full_name','Customer One','email','test@example.invalid','phone','09171234567','address_line1','Street 1','address_line2','','city','Manila','province','Metro Manila','postal_code','1000'),
    'items',jsonb_build_array(jsonb_build_object('product_id',v_product,'quantity',v_order_qty)));
  v_order := public.petko_create_order(v_owner,v_payload);

  -- Stock should be deducted
  if (select stock from public.products where id=v_product) <> (v_initial_stock - v_order_qty) then
    raise exception 'Stock was not reserved upon order creation';
  end if;

  -- Non-owner cannot cancel the order
  begin
    perform public.petko_mutate_order(v_order,v_other,'customer','cancel',0,'{"reason":"Not my order"}');
    raise exception 'Non-owner must not be able to cancel an order';
  exception when sqlstate 'P4040' then
    null;
  end;

  -- Owner cancels their own order while 'placed'
  perform public.petko_mutate_order(v_order,v_owner,'customer','cancel',0,'{"reason":"Ordered by mistake"}');

  -- Verify order status and stock restoration
  if (select fulfillment_status from public.orders where id=v_order) <> 'cancelled' then
    raise exception 'Order fulfillment_status was not updated to cancelled';
  end if;
  if (select status from public.orders where id=v_order) <> 'cancelled' then
    raise exception 'Order status was not updated to cancelled';
  end if;
  if (select stock_reserved from public.orders where id=v_order) is not false then
    raise exception 'stock_reserved was not set to false';
  end if;
  if (select stock from public.products where id=v_product) <> v_initial_stock then
    raise exception 'Product stock was not restored after cancellation';
  end if;

  -- Verify tracking event
  if not exists (
    select 1 from public.order_tracking_events
    where order_id=v_order
      and event_type='status_changed'
      and to_status='cancelled'
      and actor_role='customer'
      and note='Ordered by mistake'
  ) then
    raise exception 'Cancellation tracking event was not recorded properly';
  end if;

  -- Cannot cancel an already cancelled order
  begin
    perform public.petko_mutate_order(v_order,v_owner,'customer','cancel',1,'{}');
    raise exception 'Terminal cancelled order must reject further cancellations';
  exception when sqlstate 'P4091' then
    null;
  end;

  -- Test order that is shipped cannot be cancelled by customer
  v_payload := jsonb_build_object(
    'checkout_request_id',v_request2,'payment_method','cod','delivery_method','standard',
    'shipping',jsonb_build_object('full_name','Customer Two','email','test2@example.invalid','phone','09171234567','address_line1','Street 2','address_line2','','city','Manila','province','Metro Manila','postal_code','1000'),
    'items',jsonb_build_array(jsonb_build_object('product_id',v_product,'quantity',1)));
  v_shipped_order := public.petko_create_order(v_owner,v_payload);

  -- Admin marks as processing, then shipped
  perform public.petko_mutate_order(v_shipped_order,v_admin,'admin','fulfillment',0,'{"status":"processing"}');
  perform public.petko_mutate_order(v_shipped_order,v_admin,'admin','fulfillment',1,'{"status":"shipped"}');

  -- Customer attempts to cancel shipped order -> must fail
  begin
    perform public.petko_mutate_order(v_shipped_order,v_owner,'customer','cancel',2,'{}');
    raise exception 'Shipped order must not be cancellable by customer';
  exception when sqlstate 'P4091' then
    null;
  end;

end $$;

rollback;
