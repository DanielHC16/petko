-- WHAT: Add SKU, product-family grouping, bounded variant dimensions, and product details.
-- WHY: Keep each sellable variant as a product ID so checkout, stock reservation,
--      cart uniqueness, cancellation, and purchase-time snapshots remain atomic.
-- HOW TO APPLY: Apply after migration-006 with the SQL editor or linked Supabase CLI.
-- Safe to rerun. No catalog data, cart rows, orders, grants, or RLS policies are removed.
-- ROLLBACK: Roll back application code and retain these additive columns and indexes.

begin;

create or replace function public.petko_valid_variant_attributes(attributes jsonb)
returns boolean
language plpgsql
immutable
strict
security invoker
set search_path = ''
as $$
declare
  attribute record;
begin
  if jsonb_typeof(attributes) <> 'object' then
    return false;
  end if;
  for attribute in select key, value from jsonb_each(attributes) loop
    if attribute.key not in ('size', 'color', 'weight_volume', 'flavor_scent', 'style')
       or jsonb_typeof(attribute.value) <> 'string'
       or length(btrim(attribute.value #>> '{}')) not between 1 and 100 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

revoke all on function public.petko_valid_variant_attributes(jsonb) from public, anon, authenticated;
grant execute on function public.petko_valid_variant_attributes(jsonb) to service_role;

alter table public.products
  add column if not exists sku text,
  add column if not exists parent_product_name text not null default '',
  add column if not exists variant_attributes jsonb not null default '{}'::jsonb,
  add column if not exists ingredients_materials text not null default '',
  add column if not exists guaranteed_analysis text not null default '',
  add column if not exists usage_instructions text not null default '',
  add column if not exists safety_warnings text not null default '';

do $$
begin
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.products'::regclass and conname = 'products_sku_valid') then
    alter table public.products add constraint products_sku_valid
      check (sku is null or (sku = btrim(sku) and length(sku) between 1 and 100));
  end if;
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.products'::regclass and conname = 'products_parent_name_valid') then
    alter table public.products add constraint products_parent_name_valid
      check (parent_product_name = btrim(parent_product_name) and length(parent_product_name) <= 240);
  end if;
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.products'::regclass and conname = 'products_variant_attributes_valid') then
    alter table public.products add constraint products_variant_attributes_valid
      check (public.petko_valid_variant_attributes(variant_attributes));
  end if;
end;
$$;

create unique index if not exists products_sku_unique
  on public.products (sku) where sku is not null;
create index if not exists products_parent_product_name_idx
  on public.products (parent_product_name) where parent_product_name <> '';

comment on column public.products.parent_product_name is
  'Variants share this exact parent name. Empty means a standalone product.';
comment on column public.products.variant_attributes is
  'Available dimensions for this SKU: size, color, weight_volume, flavor_scent, style.';

notify pgrst, 'reload schema';
commit;
