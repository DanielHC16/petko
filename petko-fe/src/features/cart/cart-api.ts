import { supabase } from '@/lib/supabase'
import type { CartItem } from '@/store/cart.store'

interface RemoteProduct {
  id: string
  name: string
  price: number
  stock: number
  image_url: string
}

interface RemoteCartRow {
  product_id: string
  quantity: number
  products: RemoteProduct | null
}

export async function fetchRemoteCart(userId: string): Promise<CartItem[]> {
  const { data, error } = await supabase
    .from('cart_items')
    .select('product_id, quantity, products (id, name, price, stock, image_url)')
    .eq('user_id', userId)

  if (error || !data) return []

  return (data as unknown as RemoteCartRow[])
    .filter((row) => row.products !== null)
    .map((row) => ({
      product_id: row.product_id,
      name: row.products!.name,
      price: Number(row.products!.price),
      quantity: row.quantity,
      image_url: row.products!.image_url,
      stock: row.products!.stock,
    }))
}

export async function syncRemoteCartItem(
  userId: string,
  productId: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) {
    await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId)
  } else {
    await supabase.from('cart_items').upsert(
      { user_id: userId, product_id: productId, quantity },
      { onConflict: 'user_id,product_id' },
    )
  }
}

export async function removeRemoteCartItem(
  userId: string,
  productId: string,
): Promise<void> {
  await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId)
}

export async function clearRemoteCart(userId: string): Promise<void> {
  await supabase.from('cart_items').delete().eq('user_id', userId)
}
