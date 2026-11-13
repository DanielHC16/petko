import { create } from 'zustand'
import toast from 'react-hot-toast'
import { useAuthStore } from './auth.store'
import { getApiErrorMessage } from '@/lib/api-error'
import { fetchRemoteCart, syncRemoteCartItem, removeRemoteCartItem, clearRemoteCart } from '@/features/cart/cart-api'

export interface CartItem {
  product_id: string
  name: string
  price: number
  quantity: number
  image_url: string
  stock: number
}

interface CartState {
  items: CartItem[]
  ownerId: string | null
  isLoading: boolean
  error: string | null
  isCheckingOut: boolean
  beginCheckout: () => number | null
  endCheckout: (token: number) => void
  setOwner: (userId: string | null) => void
  addItem: (item: CartItem) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalItems: () => number
  totalPrice: () => number
  syncWithRemote: (userId: string) => Promise<void>
  flushPending: () => Promise<void>
  consumePurchased: (items: { product_id: string; quantity: number }[]) => void
}

// The server owns the cart. Retire the old browser cache with unknown ownership.
try { localStorage.removeItem('petko-cart') } catch { /* Storage may be disabled. */ }

let generation = 0
let revision = 0
let refresh = 0
let pending: Promise<void> = Promise.resolve()
let writeFailed = false
let checkoutSequence = 0
let checkoutToken: number | null = null

export const useCartStore = create<CartState>((set, get) => {
  function enqueue(operation: (userId: string) => Promise<void>): void {
    const userId = get().ownerId
    if (!userId || useAuthStore.getState().profile?.id !== userId) return
    const ticket = generation
    const previous = pending
    pending = (async () => {
      await previous
      if (ticket !== generation || get().ownerId !== userId) return
      try {
        await operation(userId)
      } catch (err: unknown) {
        if (ticket !== generation) return
        writeFailed = true
        const message = getApiErrorMessage(err, 'Could not save your cart. Please refresh and try again.')
        set({ error: message })
        toast.error(message)
      }
    })()
  }

  return {
    items: [], ownerId: null, isLoading: false, error: null, isCheckingOut: false,
    beginCheckout: () => {
      if (get().isCheckingOut || !get().ownerId || get().isLoading || get().error) return null
      checkoutToken = ++checkoutSequence
      set({ isCheckingOut: true })
      return checkoutToken
    },
    endCheckout: (token) => {
      if (checkoutToken !== token) return
      checkoutToken = null
      set({ isCheckingOut: false })
    },
    setOwner: (userId) => {
      if (get().ownerId === userId) return
      generation++
      revision++
      pending = Promise.resolve()
      writeFailed = false
      checkoutToken = null
      set({ ownerId: userId, items: [], error: null, isLoading: Boolean(userId), isCheckingOut: false })
    },
    addItem: (item) => {
      if (!get().ownerId || get().isLoading || get().error || get().isCheckingOut) return
      const existing = get().items.find(line => line.product_id === item.product_id)
      const quantity = Math.min((existing?.quantity ?? 0) + item.quantity, item.stock)
      if (quantity <= 0) return
      revision++
      set({ items: existing
        ? get().items.map(line => line.product_id === item.product_id ? { ...item, quantity } : line)
        : [...get().items, { ...item, quantity }] })
      enqueue(userId => syncRemoteCartItem(userId, item.product_id, quantity))
    },
    removeItem: (productId) => {
      if (get().isCheckingOut) return
      revision++
      set({ items: get().items.filter(line => line.product_id !== productId) })
      enqueue(userId => removeRemoteCartItem(userId, productId))
    },
    updateQuantity: (productId, requested) => {
      if (get().isCheckingOut) return
      const item = get().items.find(line => line.product_id === productId)
      if (!item) return
      const quantity = Math.max(0, Math.min(requested, item.stock))
      if (quantity === 0) { get().removeItem(productId); return }
      revision++
      set({ items: get().items.map(line => line.product_id === productId ? { ...line, quantity } : line) })
      enqueue(userId => syncRemoteCartItem(userId, productId, quantity))
    },
    clearCart: () => {
      if (get().isCheckingOut) return
      revision++
      set({ items: [] })
      enqueue(clearRemoteCart)
    },
    totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    flushPending: async () => {
      let observed: Promise<void>
      do { observed = pending; await observed } while (observed !== pending)
      if (writeFailed) throw new Error(get().error ?? 'Could not save your cart. Please refresh and try again.')
    },
    syncWithRemote: async (userId) => {
      if (useAuthStore.getState().profile?.id !== userId) return
      get().setOwner(userId)
      const ticket = generation
      const refreshId = ++refresh
      const atRevision = revision
      const writes = pending
      try {
        await writes
        const items = await fetchRemoteCart(userId)
        if (ticket !== generation || refreshId !== refresh || get().ownerId !== userId || atRevision !== revision) return
        writeFailed = false
        set({ items, error: null })
      } catch (err: unknown) {
        if (ticket === generation && refreshId === refresh) set({ error: getApiErrorMessage(err, 'Could not load your cart. Please try again.') })
      } finally {
        if (ticket === generation && refreshId === refresh) set({ isLoading: false })
      }
    },
    consumePurchased: (purchased) => {
      revision++
      set({ items: get().items.flatMap(item => {
        const quantity = item.quantity - (purchased.find(line => line.product_id === item.product_id)?.quantity ?? 0)
        return quantity > 0 ? [{ ...item, quantity }] : []
      }) })
    },
  }
})
