export const PRODUCT_CATEGORIES = [
  { id: 'food', label: 'Pet Food' },
  { id: 'treats', label: 'Treats' },
  { id: 'litter', label: 'Litter & Toilet' },
  { id: 'feeding', label: 'Feeding Supplies' },
  { id: 'accessories', label: 'Collars & Leashes' },
  { id: 'toys', label: 'Toys' },
  { id: 'grooming', label: 'Grooming & Hygiene' },
  { id: 'wellness', label: 'Health & Wellness' },
  { id: 'bedding', label: 'Beds & Furniture' },
  { id: 'apparel', label: 'Clothing & Accessories' },
  { id: 'cleaning', label: 'Training & Cleaning' },
  { id: 'travel', label: 'Travel & Outdoor' },
] as const

export const VARIANT_FIELDS = [
  { key: 'size', label: 'Size / pack count' },
  { key: 'color', label: 'Color' },
  { key: 'weight_volume', label: 'Weight / volume' },
  { key: 'flavor_scent', label: 'Flavor / scent' },
  { key: 'style', label: 'Style / shape / form' },
] as const

export const PRODUCT_DETAIL_FIELDS = [
  { key: 'ingredients_materials', label: 'Ingredients / materials' },
  { key: 'guaranteed_analysis', label: 'Guaranteed analysis' },
  { key: 'usage_instructions', label: 'Feeding / usage instructions' },
  { key: 'safety_warnings', label: 'Safety warnings' },
] as const

export type VariantAttributes = Partial<Record<(typeof VARIANT_FIELDS)[number]['key'], string>>

export interface Product {
  id: string
  name: string
  description: string
  price: number
  stock: number
  category: string
  pet_type: 'cat' | 'dog' | 'both'
  image_url: string
  is_active: boolean
  created_at: string
  sku: string | null
  parent_product_name: string
  variant_attributes: VariantAttributes
  ingredients_materials: string
  guaranteed_analysis: string
  usage_instructions: string
  safety_warnings: string
}

export interface ProductFamily {
  product: Product
  name: string
  variants: Product[]
  minPrice: number
  maxPrice: number
  stock: number
}

export function productFamilyKey(product: Product): string {
  return product.parent_product_name?.trim() ? `family:${product.parent_product_name}` : `product:${product.id}`
}

export function variantLabel(product: Product): string {
  const values = VARIANT_FIELDS.map(({ key }) => product.variant_attributes?.[key]?.trim()).filter(Boolean)
  return [...new Set(values)].join(' · ') || product.name
}

export function variantProductName(parentName: string, attributes: VariantAttributes, standaloneName: string): string {
  const parent = parentName.trim()
  if (!parent) return standaloneName.trim()
  const values = VARIANT_FIELDS.map(({ key }) => attributes[key]?.trim()).filter(Boolean)
  const suffix = [...new Set(values)].join(' / ')
  return suffix ? `${parent} (${suffix})` : parent
}

/** Keep the incoming sort order, while retaining every real combination in a family. */
export function groupProductFamilies(products: Product[], sortBy?: 'price_asc' | 'price_desc' | 'name' | 'newest'): ProductFamily[] {
  const groups = new Map<string, ProductFamily>()
  for (const product of products) {
    const key = productFamilyKey(product)
    const existing = groups.get(key)
    if (existing) {
      existing.variants.push(product)
      existing.minPrice = Math.min(existing.minPrice, Number(product.price))
      existing.maxPrice = Math.max(existing.maxPrice, Number(product.price))
      existing.stock += product.stock
    } else {
      groups.set(key, {
        product,
        name: product.parent_product_name || product.name,
        variants: [product],
        minPrice: Number(product.price),
        maxPrice: Number(product.price),
        stock: product.stock,
      })
    }
  }
  const families = [...groups.values()]
  if (sortBy === 'price_asc') families.sort((left, right) => left.minPrice - right.minPrice)
  if (sortBy === 'price_desc') families.sort((left, right) => right.minPrice - left.minPrice)
  if (sortBy === 'name') families.sort((left, right) => left.name.localeCompare(right.name))
  return families
}
