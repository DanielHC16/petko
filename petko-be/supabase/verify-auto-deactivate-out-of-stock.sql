-- Isolated verification script for migration-006 (auto-deactivate out-of-stock products).
-- Rollback at the end ensures zero residual state in the database.
-- Run in Supabase SQL editor or linked CLI.

begin;

-- Create test product with stock = 0 and is_active = true
insert into public.products (id, name, description, price, stock, category, pet_type, image_url, is_active)
values (
  'ffffffff-0000-4000-8000-000000000001',
  'Verification Test Item Out of Stock',
  'Should automatically be inactive',
  99.00,
  0,
  'food',
  'cat',
  'https://example.com/test.png',
  true
);

-- Assertion 1: Inserting with stock = 0 must result in is_active = false
do $$
declare
  v_active boolean;
begin
  select is_active into v_active from public.products where id = 'ffffffff-0000-4000-8000-000000000001';
  if v_active is not false then
    raise exception 'Assertion 1 failed: product with stock=0 was not set to is_active=false on insert';
  end if;
end $$;

-- Assertion 2: Updating stock from 5 to 0 on an active product must set is_active = false
insert into public.products (id, name, description, price, stock, category, pet_type, image_url, is_active)
values (
  'ffffffff-0000-4000-8000-000000000002',
  'Verification Test Item Stock Depletion',
  'Will be updated to 0 stock',
  150.00,
  5,
  'toys',
  'dog',
  'https://example.com/toy.png',
  true
);

update public.products set stock = 0 where id = 'ffffffff-0000-4000-8000-000000000002';

do $$
declare
  v_active boolean;
begin
  select is_active into v_active from public.products where id = 'ffffffff-0000-4000-8000-000000000002';
  if v_active is not false then
    raise exception 'Assertion 2 failed: product stock reduced to 0 was not set to is_active=false on update';
  end if;
end $$;

-- Assertion 3: Attempting to update is_active to true on a product with stock = 0 must stay is_active = false
update public.products set is_active = true where id = 'ffffffff-0000-4000-8000-000000000001';

do $$
declare
  v_active boolean;
begin
  select is_active into v_active from public.products where id = 'ffffffff-0000-4000-8000-000000000001';
  if v_active is not false then
    raise exception 'Assertion 3 failed: product with stock=0 was allowed to be set is_active=true';
  end if;
end $$;

-- Assertion 4: Product with stock > 0 can be active or inactive
update public.products set stock = 10, is_active = true where id = 'ffffffff-0000-4000-8000-000000000001';

do $$
declare
  v_active boolean;
begin
  select is_active into v_active from public.products where id = 'ffffffff-0000-4000-8000-000000000001';
  if v_active is not true then
    raise exception 'Assertion 4 failed: product with stock=10 could not be set is_active=true';
  end if;
end $$;

-- Clean rollback
rollback;
