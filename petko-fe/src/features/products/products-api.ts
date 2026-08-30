import { supabase } from '@/lib/supabase'

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
}

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

  if (params.search && params.search.trim()) {
    const term = params.search.trim()
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`)
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

  if (error) {
    throw new Error(error.message)
  }

  return (data as Product[]) || []
}

export async function fetchProductById(id: string): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Product not found')
  }

  return data as Product
}
