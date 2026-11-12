-- Run only in an isolated database after migration-007. Never run against production.
-- Fixtures and all changes roll back at the end.
begin;

insert into public.products
  (id, name, price, stock, category, pet_type, sku, parent_product_name, variant_attributes)
values
  ('fffffff7-0000-4000-8000-000000000001', 'Verification Collar (Blue)', 249, 12,
   'accessories', 'both', 'VERIFY-COLLAR-BLUE', 'Verification Collar', '{"color":"Blue"}'),
  ('fffffff7-0000-4000-8000-000000000002', 'Verification Collar (Red)', 299, 8,
   'accessories', 'both', 'VERIFY-COLLAR-RED', 'Verification Collar', '{"color":"Red"}'),
  ('fffffff7-0000-4000-8000-000000000003', 'Verification standalone', 99, 1,
   'accessories', 'both', null, '', '{}');

do $$
declare
  invalid jsonb;
begin
  if (select count(*) from public.products where parent_product_name = 'Verification Collar') <> 2 then
    raise exception 'Variants must share a family and preserve separate product IDs';
  end if;
  if not (select price = 249 and stock = 12 from public.products where sku = 'VERIFY-COLLAR-BLUE') then
    raise exception 'Variant price and stock were not preserved';
  end if;
  if not (select ingredients_materials = '' and guaranteed_analysis = ''
    and usage_instructions = '' and safety_warnings = ''
    from public.products where id = 'fffffff7-0000-4000-8000-000000000003') then
    raise exception 'Standalone product compatibility defaults missing';
  end if;

  begin
    update public.products set sku = 'VERIFY-COLLAR-BLUE'
      where id = 'fffffff7-0000-4000-8000-000000000002';
    raise exception 'Duplicate SKU was accepted';
  exception when unique_violation then null;
  end;

  for invalid in select value from jsonb_array_elements(
    '[[],null,"Blue",{"arbitrary":"Blue"},{"color":null},{"color":3},
      {"color":{"name":"Blue"}},{"color":["Blue"]},{"color":"   "}]'::jsonb
  ) loop
    begin
      update public.products set variant_attributes = invalid
        where id = 'fffffff7-0000-4000-8000-000000000001';
      raise exception 'Invalid variation attributes accepted: %', invalid;
    exception when check_violation then null;
    end;
  end loop;
  begin
    update public.products set variant_attributes = jsonb_build_object('color', repeat('B',101))
      where id = 'fffffff7-0000-4000-8000-000000000001';
    raise exception 'Unbounded variation attributes accepted';
  exception when check_violation then null;
  end;
end;
$$;

-- Adjusting one variation must leave the other variation's stock unchanged.
update public.products set stock = stock - 2 where sku = 'VERIFY-COLLAR-BLUE';
do $$
begin
  if not (select stock = 10 from public.products where sku = 'VERIFY-COLLAR-BLUE')
     or not (select stock = 8 from public.products where sku = 'VERIFY-COLLAR-RED') then
    raise exception 'Variant stock is not independent';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.products'::regclass) then
    raise exception 'Product RLS must remain enabled';
  end if;
end;
$$;

-- Exercise actual checkout, retry and cancellation RPCs with two variants in one order.
do $$
declare
  owner_id uuid := gen_random_uuid();
  admin_id uuid := gen_random_uuid();
  v_order_id uuid;
  payload jsonb;
begin
  insert into auth.users(id, email, raw_user_meta_data) values
    (owner_id, owner_id::text || '@variation-test.invalid', '{}'),
    (admin_id, admin_id::text || '@variation-test.invalid', '{}');
  update public.users set role = 'admin' where id = admin_id;
  payload := jsonb_build_object(
    'checkout_request_id', gen_random_uuid(), 'payment_method', 'cod',
    'delivery_method', 'standard',
    'shipping', jsonb_build_object(
      'full_name', 'Variation Test Customer', 'email', 'test@example.invalid',
      'phone', '09171234567', 'address_line1', 'Test street',
      'city', 'Manila', 'province', 'Metro Manila', 'postal_code', '1000'),
    'items', jsonb_build_array(
      jsonb_build_object('product_id', 'fffffff7-0000-4000-8000-000000000001', 'quantity', 2),
      jsonb_build_object('product_id', 'fffffff7-0000-4000-8000-000000000002', 'quantity', 3)));
  v_order_id := public.petko_create_order(owner_id, payload);
  if not (select subtotal_amount = 1395 and total_amount = 1395 and shipping_fee = 0
    from public.orders where id = v_order_id) then
    raise exception 'Checkout must calculate totals from each selected variant price';
  end if;
  if not (select stock = 8 from public.products where sku = 'VERIFY-COLLAR-BLUE')
     or not (select stock = 5 from public.products where sku = 'VERIFY-COLLAR-RED') then
    raise exception 'Checkout must reserve each selected variant independently';
  end if;
  if (select count(*) from public.order_items i where i.order_id = v_order_id) <> 2
     or not exists (select 1 from public.order_items i where i.order_id = v_order_id
       and i.product_id = 'fffffff7-0000-4000-8000-000000000001'
       and i.quantity = 2 and i.unit_price = 249 and i.product_name = 'Verification Collar (Blue)')
     or not exists (select 1 from public.order_items i where i.order_id = v_order_id
       and i.product_id = 'fffffff7-0000-4000-8000-000000000002'
       and i.quantity = 3 and i.unit_price = 299 and i.product_name = 'Verification Collar (Red)') then
    raise exception 'Purchase snapshots must retain variant identity and unit price';
  end if;

  update public.products set name = 'Changed after purchase', price = 999
    where sku = 'VERIFY-COLLAR-BLUE';
  if public.petko_create_order(owner_id, payload) <> v_order_id
     or (select stock from public.products where sku = 'VERIFY-COLLAR-BLUE') <> 8
     or (select stock from public.products where sku = 'VERIFY-COLLAR-RED') <> 5
     or (select count(*) from public.orders where user_id = owner_id) <> 1 then
    raise exception 'Retry must return the original order and reserve neither variant twice';
  end if;
  if not exists (select 1 from public.order_items i where i.order_id = v_order_id
    and i.product_id = 'fffffff7-0000-4000-8000-000000000001'
    and i.unit_price = 249 and i.product_name = 'Verification Collar (Blue)') then
    raise exception 'Later catalog edits must not alter variant purchase snapshots';
  end if;
  begin
    perform public.petko_create_order(owner_id, payload || '{"delivery_method":"express"}');
    raise exception 'Retry key must reject changed checkout payload';
  exception when sqlstate 'P4093' then null;
  end;
  perform public.petko_mutate_order(v_order_id, admin_id, 'admin', 'fulfillment', 0, '{"status":"cancelled"}');
  if not (select stock = 10 from public.products where sku = 'VERIFY-COLLAR-BLUE')
     or not (select stock = 8 from public.products where sku = 'VERIFY-COLLAR-RED') then
    raise exception 'Cancellation must restore the original quantities for both variants';
  end if;
  begin
    perform public.petko_mutate_order(v_order_id, admin_id, 'admin', 'fulfillment', 1, '{"status":"cancelled"}');
    raise exception 'Repeated cancellation must not restore stock twice';
  exception when sqlstate 'P4091' then null;
  end;
  if not (select stock = 10 from public.products where sku = 'VERIFY-COLLAR-BLUE')
     or not (select stock = 8 from public.products where sku = 'VERIFY-COLLAR-RED') then
    raise exception 'Repeated cancellation changed variant stock';
  end if;
end;
$$;

rollback;
