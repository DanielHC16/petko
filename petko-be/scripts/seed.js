// Safe default: inspect the catalog. No credentials, .env reads, or live writes.
// Generate assets/SQL with: node scripts/prepare-catalog.mjs
// Apply reviewed SQL using the authenticated Supabase SQL editor or CLI.
async function main() {
  const { buildCatalog, SEED_KEY } = await import('./catalog.mjs')
  const products = buildCatalog()
  console.log(JSON.stringify({ seed: SEED_KEY, variants: products.length,
    families: new Set(products.map((product) => product.parent_product_name)).size,
    categories: [...new Set(products.map((product) => product.category))],
    generated_stock: products.filter((product) => product.sku.endsWith('-49')).map(({ sku, stock }) => ({ sku, stock })),
  }, null, 2))
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 })
