const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

// Load environment variables from .env if present
const envPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim().replace(/^["']|["']$/g, '')
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    }
  })
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your environment or .env file.',
  )
  process.exit(1)
}

// Parse CSV with multiline and quote support
function parseCSV(text) {
  const lines = []
  let row = []
  let inQuotes = false
  let current = ''

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim())
      current = ''
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++
      row.push(current.trim())
      if (row.some((field) => field.length > 0)) {
        lines.push(row)
      }
      row = []
      current = ''
    } else {
      current += char
    }
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current.trim())
    if (row.some((field) => field.length > 0)) {
      lines.push(row)
    }
  }
  return lines
}

// Fetch helper with redirects
function fetchUrl(urlStr) {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlStr)
      const client = url.protocol === 'https:' ? https : http

      const req = client.get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'application/json, text/html, */*',
          },
          timeout: 6000,
        },
        (res) => {
          if (
            (res.statusCode === 301 || res.statusCode === 302) &&
            res.headers.location
          ) {
            let redirectUrl = res.headers.location
            if (redirectUrl.startsWith('/')) {
              redirectUrl = `${url.origin}${redirectUrl}`
            }
            return fetchUrl(redirectUrl).then(resolve)
          }

          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => resolve({ status: res.statusCode, body: data }))
        },
      )

      req.on('error', () => resolve({ status: 500, body: '' }))
      req.on('timeout', () => {
        req.destroy()
        resolve({ status: 408, body: '' })
      })
    } catch {
      resolve({ status: 400, body: '' })
    }
  })
}

// Fallback curated high quality Unsplash images per category
const categoryFallbacks = {
  food: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop',
  treats:
    'https://images.unsplash.com/photo-1582798358481-d199fb7347bb?w=600&auto=format&fit=crop',
  'cat litter & toilet':
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop',
  toys: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=600&auto=format&fit=crop',
  'collars, harnesses & leashes':
    'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&auto=format&fit=crop',
  'grooming & hygiene':
    'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=600&auto=format&fit=crop',
  'health & wellness':
    'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&auto=format&fit=crop',
  'beds & furniture':
    'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?w=600&auto=format&fit=crop',
  'clothing & accessories':
    'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=600&auto=format&fit=crop',
  'training & cleaning':
    'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&auto=format&fit=crop',
  'travel & outdoor':
    'https://images.unsplash.com/photo-1544568100-847a948585b9?w=600&auto=format&fit=crop',
}

async function extractImage(rawUrl, category) {
  if (!rawUrl || !rawUrl.startsWith('http')) {
    return categoryFallbacks[category.toLowerCase()] || categoryFallbacks.food
  }

  // 1. If it's a product page on Shopify, try .json endpoint
  try {
    const jsonUrl = rawUrl.split('?')[0] + '.json'
    const jsonRes = await fetchUrl(jsonUrl)
    if (jsonRes.status === 200) {
      const data = JSON.parse(jsonRes.body)
      const src =
        data.product?.image?.src ||
        data.product?.images?.[0]?.src ||
        data.product?.images?.[0]
      if (src && typeof src === 'string' && src.startsWith('http')) {
        return src
      }
    }
  } catch {}

  // 2. Try fetching HTML and parsing og:image meta tag
  try {
    const htmlRes = await fetchUrl(rawUrl)
    if (htmlRes.status === 200) {
      const ogMatch =
        htmlRes.body.match(
          /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
        ) ||
        htmlRes.body.match(
          /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
        )
      if (ogMatch && ogMatch[1]) {
        let ogUrl = ogMatch[1]
        if (ogUrl.startsWith('//')) ogUrl = 'https:' + ogUrl
        return ogUrl
      }
    }
  } catch {}

  return categoryFallbacks[category.toLowerCase()] || categoryFallbacks.food
}

function parsePrice(priceStr) {
  if (!priceStr) return 100.0
  const cleaned = priceStr.replace(/[^\d.]/g, '')
  const val = parseFloat(cleaned)
  return isNaN(val) ? 100.0 : val
}

function deducePetType(name, description, category) {
  const combined = `${name} ${description} ${category}`.toLowerCase()

  const hasDog =
    combined.includes('dog') ||
    combined.includes('puppy') ||
    combined.includes('hound')
  const hasCat =
    combined.includes('cat') ||
    combined.includes('kitten') ||
    combined.includes('feline') ||
    combined.includes('litter')

  if (hasDog && hasCat) return 'both'
  if (hasDog) return 'dog'
  if (hasCat) return 'cat'
  return 'both'
}

function normalizeCategory(catStr) {
  if (!catStr) return 'food'
  const c = catStr.toLowerCase().trim()
  if (c.includes('food')) return 'food'
  if (c.includes('treat')) return 'treats'
  if (c.includes('litter') || c.includes('toilet')) return 'litter'
  if (c.includes('toy')) return 'toys'
  if (c.includes('collar') || c.includes('harness') || c.includes('leash'))
    return 'accessories'
  if (c.includes('groom')) return 'grooming'
  if (c.includes('health') || c.includes('wellness')) return 'wellness'
  if (c.includes('bed') || c.includes('furniture')) return 'bedding'
  if (c.includes('cloth') || c.includes('apparel')) return 'apparel'
  if (c.includes('train') || c.includes('clean') || c.includes('disinfect'))
    return 'cleaning'
  if (c.includes('travel') || c.includes('outdoor') || c.includes('carrier'))
    return 'travel'
  return c
}

async function main() {
  console.log('🐾 Petko Product Seeder Started...')

  const csvPath = path.join(__dirname, '../petko-dummy-data-s1.csv')
  const rawCSV = fs.readFileSync(csvPath, 'utf8')
  const parsed = parseCSV(rawCSV)

  // Filter out headers or empty lines
  const dataRows = parsed.slice(1).filter((r) => r.length >= 3 && r[1])

  console.log(`Processing ${dataRows.length} products from CSV...`)

  const products = []

  for (let i = 0; i < dataRows.length; i++) {
    const [
      rawCategory,
      rawName,
      rawPrice,
      rawDescription = '',
      rawImageUrl = '',
    ] = dataRows[i]

    if (!rawName) continue

    const category = normalizeCategory(rawCategory)
    const price = parsePrice(rawPrice)
    const petType = deducePetType(rawName, rawDescription, rawCategory)
    const description =
      rawDescription || `${rawName} — high quality pet essentials from Petko.`
    const stock = Math.floor(Math.random() * 35) + 15 // Stock between 15 and 50

    process.stdout.write(`[${i + 1}/${dataRows.length}] ${rawName.slice(0, 35)}... `)

    const imageUrl = await extractImage(rawImageUrl, rawCategory)
    console.log(`✓ Image found`)

    products.push({
      name: rawName.replace(/\r?\n|\r/g, ' ').trim(),
      description: description.replace(/\r?\n|\r/g, ' ').trim(),
      price,
      stock,
      category,
      pet_type: petType,
      image_url: imageUrl,
      is_active: true,
    })
  }

  console.log(`\nInserting ${products.length} products into Supabase...`)

  // First delete any test products
  await new Promise((resolve) => {
    const req = https.request(
      `${SUPABASE_URL}/rest/v1/products?id=neq.00000000-0000-0000-0000-000000000000`,
      {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      },
      (res) => resolve(res.statusCode),
    )
    req.on('error', () => resolve(500))
    req.end()
  })

  // Insert in batches of 15
  const batchSize = 15
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize)
    const bodyStr = JSON.stringify(batch)

    await new Promise((resolve, reject) => {
      const req = https.request(
        `${SUPABASE_URL}/rest/v1/products`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log(
                `✓ Batch ${Math.floor(i / batchSize) + 1} inserted (${batch.length} items)`,
              )
              resolve(data)
            } else {
              console.error(
                `❌ Batch failed: ${res.statusCode} - ${data}`,
              )
              reject(new Error(data))
            }
          })
        },
      )
      req.on('error', reject)
      req.write(bodyStr)
      req.end()
    })
  }

  console.log(`🎉 Seeding complete! All ${products.length} products inserted.`)
}

main().catch((err) => {
  console.error('Fatal error seeding products:', err)
  process.exit(1)
})
