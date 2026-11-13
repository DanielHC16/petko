import type { CartItem } from '@/store/cart.store'

function selectionKey(userId: string): string { return `petko-checkout-selection:${userId}` }
function directKey(userId: string): string { return `petko-direct-checkout:${userId}` }

export function saveCheckoutSelection(userId: string, productIds: string[]): void {
  sessionStorage.setItem(selectionKey(userId), JSON.stringify(productIds))
}
export function readCheckoutSelection(userId: string): string[] | null {
  try {
    const raw = sessionStorage.getItem(selectionKey(userId))
    if (raw === null) return null
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) && value.every(id => typeof id === 'string') ? value : []
  } catch { return [] }
}
export function clearCheckoutSelection(userId: string): void { sessionStorage.removeItem(selectionKey(userId)) }
export function saveDirectCheckout(userId: string, item: CartItem): void {
  sessionStorage.setItem(directKey(userId), JSON.stringify(item))
}
export function readDirectCheckout(userId: string): CartItem | null {
  try {
    const raw = sessionStorage.getItem(directKey(userId))
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return null
    if (!('product_id' in value) || typeof value.product_id !== 'string' ||
      !('name' in value) || typeof value.name !== 'string' ||
      !('image_url' in value) || typeof value.image_url !== 'string' ||
      !('price' in value) || typeof value.price !== 'number' || !Number.isFinite(value.price) ||
      !('quantity' in value) || typeof value.quantity !== 'number' || !Number.isInteger(value.quantity) || value.quantity <= 0 ||
      !('stock' in value) || typeof value.stock !== 'number') return null
    return { product_id: value.product_id, name: value.name, image_url: value.image_url,
      price: value.price, quantity: value.quantity, stock: value.stock }
  } catch { return null }
}
export function clearDirectCheckout(userId: string): void { sessionStorage.removeItem(directKey(userId)) }

export function selectCheckoutItems(items: CartItem[], selectedIds: string[] | null): CartItem[] {
  return selectedIds === null ? items : items.filter(item => selectedIds.includes(item.product_id))
}
