import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildCatalog, productId, seedSql, rollbackSql, sqlLiteral } from './catalog.mjs'

test('catalog preserves 100 distinct variants in 50 families and all 12 categories', () => {
  const products = buildCatalog()
  assert.equal(products.length, 100)
  assert.equal(new Set(products.map((p) => p.id)).size, 100)
  assert.equal(new Set(products.map((p) => p.sku)).size, 100)
  assert.equal(new Set(products.map((p) => p.parent_product_name)).size, 50)
  assert.equal(new Set(products.map((p) => p.category)).size, 12)
  for (const p of products) {
    assert.equal(p.id, productId(p.sku))
    assert.ok(Number.isSafeInteger(p.stock) && p.stock > 0)
    assert.ok(p.price >= 0)
    assert.match(p.image_url, /^https:\/\/lh3\.googleusercontent\.com\/d\/[\w-]+$/)
    assert.ok(p.name.startsWith(p.parent_product_name))
    for (const value of Object.values(p.variant_attributes)) assert.ok(p.name.includes(value))
  }
})

test('complete source prices/stock take precedence and supplemental-only family is included', () => {
  const products = buildCatalog()
  const jerky = products.find((p) => p.sku === 'PK-TRE-80G-CHI-00')
  assert.equal(jerky.price, 189)
  assert.equal(jerky.stock, 25)
  const biscuits = products.filter((p) => p.parent_product_name === 'PetKo Kagat ng Saya Dog Biscuits')
  assert.deepEqual(biscuits.map((p) => p.price), [129, 239])
  assert.deepEqual(biscuits.map((p) => p.stock), [25, 25])
  assert.ok(biscuits.every((p) => p.guaranteed_analysis.includes('packaging')))
})

test('dry food identities agree with verified packaging and pet types', () => {
  const products = buildCatalog()
  for (const p of products.filter((p) => p.sku.endsWith('-39'))) {
    assert.equal(p.pet_type, 'cat')
    assert.equal(p.parent_product_name, 'PetKo Busog at Liksi Cat Dry Food')
    assert.ok(!p.description.includes('dog'))
  }
  for (const p of products.filter((p) => p.sku.endsWith('-42'))) {
    assert.equal(p.pet_type, 'dog')
    assert.equal(p.parent_product_name, 'PetKo Masaganang Sigla Dog Dry Food')
    assert.ok(!p.description.includes('cat'))
  }
})

test('generated SQL escapes source apostrophes and excludes provenance-only columns', () => {
  assert.equal(sqlLiteral("Kuko't Ngipin"), "'Kuko''t Ngipin'")
  const sql = seedSql()
  assert.ok(sql.includes("Kuko''t Ngipin"))
  assert.ok(!sql.includes('source_image_url'))
})

test('rollback identifies imported products by immutable ID even after SKU edits', () => {
  const sql = rollbackSql()
  assert.ok(sql.includes(buildCatalog()[0].id))
  assert.ok(!sql.includes('where sku in'))
})
