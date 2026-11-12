import { supabase } from '@/lib/supabase'
import { groupProductFamilies, type Product } from '@/lib/product-catalog'
export type { Product } from '@/lib/product-catalog'

export interface ProductFilterParams {
  category?: string
  pet_type?: string
  search?: string
  sortBy?: 'price_asc' | 'price_desc' | 'name' | 'newest'
}

export async function fetchProducts(
  params: ProductFilterParams = {},
): Promise<Product[]> {
  let query = supabase.from('products').select('*').eq('is_active', true)

  if (params.category && params.category !== 'all') {
    query = query.eq('category', params.category)
  }
  if (params.pet_type && params.pet_type !== 'all') {
    query = query.or(`pet_type.eq.${params.pet_type},pet_type.eq.both`)
  }
  if (params.sortBy === 'price_asc') {
    query = query.order('price', { ascending: true })
  } else if (params.sortBy === 'price_desc') {
    query = query.order('price', { ascending: false })
  } else if (params.sortBy === 'name') {
    query = query.order('name', { ascending: true })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  // Supabase returns the products row shape declared in the shared catalog type.
  const products = (data as Product[]) || []
  const term = params.search?.trim().toLowerCase()
  if (!term) return products
  // A match on a color/flavor retains the complete family and its price range.
  return groupProductFamilies(products)
    .filter((family) => family.variants.some((product) =>
      [product.name, product.parent_product_name, product.description, product.sku,
        ...Object.values(product.variant_attributes || {})]
        .some((value) => value?.toLowerCase().includes(term)),
    ))
    .flatMap((family) => family.variants)
}

export async function fetchProductById(id: string): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) throw new Error(error?.message || 'Product not found')
  // The selected row contains the shared Product columns.
  return data as Product
}

export async function fetchProductVariants(product: Product): Promise<Product[]> {
  if (!product.parent_product_name) return [product]
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .eq('parent_product_name', product.parent_product_name)
    .order('price', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  // The bounded exact-parent query returns Product rows protected by product RLS.
  return (data as Product[]) || []
}
