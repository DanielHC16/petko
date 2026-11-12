import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCatalog, driveImageId, seedSql, rollbackSql } from './catalog.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const products = buildCatalog()
await mkdir(resolve(root, '.tmp/catalog-images'), { recursive: true })
let next = 0
let downloaded = 0
async function download() {
  while (next < products.length) {
    const product = products[next++]
    const path = resolve(root, `.tmp/catalog-images/${product.sku.toLowerCase()}.png`)
    try {
      const bytes = await readFile(path)
      if (bytes.length > 1000 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) continue
    } catch { /* Missing or invalid files are fetched again. */ }
    let lastError
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(`https://lh3.googleusercontent.com/d/${driveImageId(product.source_image_url)}`, { signal: AbortSignal.timeout(30000) })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const bytes = Buffer.from(await response.arrayBuffer())
        if (bytes.length < 1000 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Expected a valid PNG image')
        await writeFile(path, bytes)
        downloaded++
        lastError = undefined
        break
      } catch (error) { lastError = error }
    }
    if (lastError) throw new Error(`Could not download image for ${product.sku}`, { cause: lastError })
  }
}
await Promise.all(Array.from({ length: 6 }, download))
await writeFile(resolve(root, 'petko-be/data/catalog-products.json'), JSON.stringify(products, null, 2) + '\n')
await writeFile(resolve(root, 'petko-be/supabase/seed-catalog-20261112.sql'), seedSql())
await writeFile(resolve(root, 'petko-be/supabase/rollback-catalog-20261112.sql'), rollbackSql())
console.log(`Prepared ${products.length} variants / 50 families; downloaded ${downloaded} PNG images. Seed and rollback SQL generated.`)
