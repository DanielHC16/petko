-- WHAT: Automatically deem out-of-stock items as INACTIVE (is_active = false).
-- WHY:  Out-of-stock items should not remain active or purchasable in the storefront.
--       Ensures database-level consistency across direct API updates, order fulfillment,
--       and checkout stock deductions.
-- HOW TO APPLY: Apply after migration 005 via Supabase SQL Editor or linked CLI.
-- Safe to rerun; idempotent trigger function and update.
begin;

-- 1. Trigger function: when stock is 0 or less, force is_active to false
create or replace function public.handle_product_stock_status()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.stock <= 0 then
    new.is_active := false;
  end if;
  return new;
end;
$$;

-- 2. Trigger on products before insert or update of stock or is_active
drop trigger if exists trg_product_stock_status on public.products;
create trigger trg_product_stock_status
  before insert or update of stock, is_active
  on public.products
  for each row
  execute function public.handle_product_stock_status();

-- 3. Synchronize existing products: deactivate any that are currently out-of-stock
update public.products
  set is_active = false
  where stock <= 0 and is_active = true;

commit;
