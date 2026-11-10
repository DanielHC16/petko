import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuthStore } from './auth.store'
import {
  fetchRemoteCart,
  syncRemoteCartItem,
  removeRemoteCartItem,
  clearRemoteCart,
} from '@/features/cart/cart-api'

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
  addItem: (item: CartItem) => void
  removeItem: (product_id: string) => void
  updateQuantity: (product_id: string, quantity: number) => void
  clearCart: () => void
  totalItems: () => number
  totalPrice: () => number
  syncWithRemote: (userId: string) => Promise<void>
}

function getUserId(): string | null {
  return useAuthStore.getState().profile?.id ?? null
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        let finalQuantity = item.quantity
        set((state) => {
          const existing = state.items.find((i) => i.product_id === item.product_id)
          if (existing) {
            finalQuantity = Math.min(existing.quantity + item.quantity, item.stock)
            return {
              items: state.items.map((i) =>
                i.product_id === item.product_id
                  ? { ...i, quantity: finalQuantity }
                  : i,
              ),
            }
          }
          finalQuantity = Math.min(item.quantity, item.stock)
          return {
            items: [...state.items, { ...item, quantity: finalQuantity }],
          }
        })

        const userId = getUserId()
        if (userId) {
          void syncRemoteCartItem(userId, item.product_id, finalQuantity).catch(
            () => undefined,
          )
        }
      },

      removeItem: (product_id) => {
        set((state) => ({
          items: state.items.filter((i) => i.product_id !== product_id),
        }))

        const userId = getUserId()
        if (userId) {
          void removeRemoteCartItem(userId, product_id).catch(() => undefined)
        }
      },

      updateQuantity: (product_id, quantity) => {
        let finalQuantity = quantity
        set((state) => ({
          items: state.items.map((i) => {
            if (i.product_id === product_id) {
              finalQuantity = Math.min(quantity, i.stock)
              return { ...i, quantity: finalQuantity }
            }
            return i
          }),
        }))

        const userId = getUserId()
        if (userId) {
          void syncRemoteCartItem(userId, product_id, finalQuantity).catch(
            () => undefined,
          )
        }
      },

      clearCart: () => {
        set({ items: [] })

        const userId = getUserId()
        if (userId) {
          void clearRemoteCart(userId).catch(() => undefined)
        }
      },

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      syncWithRemote: async (userId: string) => {
        try {
          const remoteItems = await fetchRemoteCart(userId)
          const localItems = get().items

          // Merge: remote takes precedence, local unique items are synced up
          const mergedMap = new Map<string, CartItem>()

          for (const item of remoteItems) {
            mergedMap.set(item.product_id, item)
          }

          for (const localItem of localItems) {
            if (!mergedMap.has(localItem.product_id)) {
              mergedMap.set(localItem.product_id, localItem)
              void syncRemoteCartItem(
                userId,
                localItem.product_id,
                localItem.quantity,
              ).catch(() => undefined)
            }
          }

          set({ items: Array.from(mergedMap.values()) })
        } catch {
          // Fall back gracefully to local cart
        }
      },
    }),
    {
      name: 'petko-cart',
      partialize: (state) => ({ items: state.items }),
    },
  ),
)
