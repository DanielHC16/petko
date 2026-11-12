import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

export const SEED_KEY = 'petko-catalog-2026-11-12-v1'
const readData = (name) => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url), 'utf8'))
const categories = {
  'Pet Food': 'food', Treats: 'treats', 'Cat Litter & Toilet': 'litter',
  'Feeding Supplies': 'feeding', 'Collars, Harnesses & Leashes': 'accessories',
  Toys: 'toys', 'Grooming & Hygiene': 'grooming', 'Health & Wellness': 'wellness',
  'Beds & Furniture': 'bedding', 'Clothing & Accessories': 'apparel',
  'Training & Cleaning': 'cleaning', 'Travel & Outdoor': 'travel',
}
const petTypes = { Dogs: 'dog', Cats: 'cat', 'All Pets': 'both' }

export function productId(sku) {
  const hash = createHash('sha256').update(`${SEED_KEY}:${sku}`).digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

export function driveImageId(url) {
  const parsed = new URL(url)
  const id = parsed.searchParams.get('id') ?? parsed.pathname.split('/d/')[1]?.split('/')[0]
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) throw new Error(`Invalid image URL: ${url}`)
  return id
}

function finalize(product) {
  const dimensions = [...new Set(Object.values(product.variant_attributes))]
  return { ...product, id: productId(product.sku),
    name: `${product.parent_product_name} (${dimensions.join(' / ')})`,
    image_url: `https://lh3.googleusercontent.com/d/${driveImageId(product.source_image_url)}`, is_active: product.stock > 0 }
}

export function buildCatalog() {
  const primary = readData('catalog-primary.json').values.slice(1)
  const supplemental = readData('catalog-supplemental.json').values.slice(1)
  const corrections = readData('catalog-corrections.json')
  const products = primary.map((row) => {
    const [sku, category, parent, , petType, image, price, size, color, weight,
      flavor, style, stock, ingredients, analysis, usage, safety, description] = row
    const correction = corrections[sku] ?? {}
    const attrs = { size, color, weight_volume: weight,
      flavor_scent: correction.flavor_scent ?? flavor, style }
    return finalize({ sku, parent_product_name: correction.parent_product_name ?? parent,
      description: correction.description ?? description,
      price: Number(price.replaceAll(',', '')), stock: Number(stock),
      category: categories[category], pet_type: petTypes[petType],
      variant_attributes: Object.fromEntries(Object.entries(attrs).filter(([, value]) => value)),
      ingredients_materials: correction.ingredients_materials ?? ingredients ?? '',
      guaranteed_analysis: correction.guaranteed_analysis ?? analysis ?? '',
      usage_instructions: usage ?? '', safety_warnings: safety ?? '', source_image_url: image })
  })
  // Only this family is absent from the complete sheet. Stock is a documented
  // seed default; missing ingredients/nutrition refer to the physical packaging.
  for (const row of supplemental.filter((entry) => entry[1].startsWith('PetKo Kagat ng Saya Dog Biscuits '))) {
    const large = row[1].includes('300g')
    products.push(finalize({ sku: large ? 'PK-TRE-300G-BIS-49' : 'PK-TRE-150G-BIS-49',
      parent_product_name: 'PetKo Kagat ng Saya Dog Biscuits', description: row[3],
      price: Number(row[2].replace(/[^0-9.]/g, '')), stock: 25, category: 'treats', pet_type: 'dog',
      variant_attributes: { weight_volume: large ? '300g' : '150g', style: large ? 'Jar' : 'Pouch' },
      ingredients_materials: 'See the product packaging for the complete ingredient list.',
      guaranteed_analysis: 'See the product packaging for guaranteed nutritional analysis.',
      usage_instructions: 'Offer as an occasional treat or training reward. Follow the serving guidance on the packaging and provide fresh drinking water.',
      safety_warnings: 'Supervise your dog while feeding. Treats are not a replacement for a complete diet. Store sealed in a cool, dry place.',
      source_image_url: row[4] }))
  }
  const skus = new Set()
  for (const product of products) {
    if (!product.sku || skus.has(product.sku)) throw new Error(`Duplicate/missing SKU: ${product.sku}`)
    skus.add(product.sku)
    if (!product.category || !product.pet_type || !product.parent_product_name || !product.description
      || !Number.isFinite(product.price) || product.price < 0
      || !Number.isSafeInteger(product.stock) || product.stock < 0) throw new Error(`Invalid catalog row: ${product.sku}`)
    driveImageId(product.source_image_url)
  }
  if (products.length !== 100 || new Set(products.map((p) => p.parent_product_name)).size !== 50)
    throw new Error('Expected exactly 100 variants and 50 families; inspect changed source data before importing.')
  return products
}

export const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`

export function seedSql(products = buildCatalog()) {
  const rows = products.map(({ source_image_url: _source, ...product }) => product)
  return `-- Generated by scripts/seed.js. Apply migration-007 first.
-- Transactional catalog replacement. Retains order references and a backend-only
-- backup. Re-running this import never resets sold stock.
begin;
lock table public.products in share row exclusive mode;
create table if not exists public.catalog_import_runs (seed_key text primary key, applied_at timestamptz not null default now(), product_count integer not null);
alter table public.catalog_import_runs enable row level security;
revoke all on public.catalog_import_runs from public, anon, authenticated;
create table if not exists public.catalog_backup_20261112 (like public.products including defaults);
alter table public.catalog_backup_20261112 enable row level security;
revoke all on public.catalog_backup_20261112 from public, anon, authenticated;
do $seed$
begin
  if exists (select 1 from public.catalog_import_runs where seed_key = '${SEED_KEY}') then
    raise notice 'Catalog already imported; inventory left unchanged';
    return;
  end if;
  if exists(select 1 from public.catalog_backup_20261112) then
    raise exception 'Existing backup without import record; review before reimporting';
  end if;
  insert into public.catalog_backup_20261112 select * from public.products;
  -- Old cart rows are discarded with the old catalog.
  delete from public.cart_items;
  update public.products set is_active = false;
  delete from public.products p where not exists (select 1 from public.order_items oi where oi.product_id = p.id);
  insert into public.products (id,name,description,price,stock,category,pet_type,image_url,is_active,sku,parent_product_name,variant_attributes,ingredients_materials,guaranteed_analysis,usage_instructions,safety_warnings)
  select id,name,description,price,stock,category,pet_type,image_url,is_active,sku,parent_product_name,variant_attributes,ingredients_materials,guaranteed_analysis,usage_instructions,safety_warnings
  from jsonb_populate_recordset(null::public.products, ${sqlLiteral(JSON.stringify(rows))}::jsonb);
  if (select count(*) from public.products where is_active) <> 100 then
    raise exception 'Catalog verification failed: expected 100 active variants';
  end if;
  insert into public.catalog_import_runs(seed_key,product_count) values ('${SEED_KEY}',100);
end;
$seed$;
notify pgrst, 'reload schema';
commit;
select count(*) filter(where is_active) as active_variants, count(distinct parent_product_name) filter(where is_active) as active_families from public.products;
`
}

export function rollbackSql() {
  const ids = JSON.stringify(buildCatalog().map(({id}) => ({id})))
  return `-- Restore the previous catalog; keep all orders and current inventory.
-- Review inventory reconciliation before rollback after substantial live trading.
begin;
lock table public.products in share row exclusive mode;
do $rollback$
begin
  if not exists (select 1 from public.catalog_import_runs where seed_key = '${SEED_KEY}') then
    raise exception 'Catalog import is not recorded; rollback refused';
  end if;
  update public.products set is_active = false where id in (select (value->>'id')::uuid from jsonb_array_elements(${sqlLiteral(ids)}::jsonb));
  -- Preserve current stock on retained rows (orders may have been cancelled).
  insert into public.products select * from public.catalog_backup_20261112
    on conflict(id) do update set is_active = excluded.is_active and public.products.stock > 0;
  delete from public.catalog_import_runs where seed_key = '${SEED_KEY}';
end;
$rollback$;
commit;
`
}
