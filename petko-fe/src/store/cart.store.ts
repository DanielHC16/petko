import { create } from 'zustand'

export interface CartItem {
  product_id: string
  name: string
  price: number
  quantity: number
  image_url: string
  stock: number // Added stock property
}

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (product_id: string) => void
  updateQuantity: (product_id: string, quantity: number) => void
  clearCart: () => void
  totalItems: () => number
  totalPrice: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.product_id === item.product_id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product_id === item.product_id
              ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.stock) } // Enforce stock limit on existing items
              : i
          ),
        }
      }
      // Enforce stock limit when adding a new item
      return { items: [...state.items, { ...item, quantity: Math.min(item.quantity, item.stock) }] }
    }),

  removeItem: (product_id) =>
    set((state) => ({
      items: state.items.filter((i) => i.product_id !== product_id),
    })),

  updateQuantity: (product_id, quantity) =>
    set((state) => ({
      items: state.items.map((i) =>
        // Enforce stock limit on manual quantity updates
        i.product_id === product_id ? { ...i, quantity: Math.min(quantity, i.stock) } : i
      ),
    })),

  clearCart: () => set({ items: [] }),

  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  totalPrice: () =>
    get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}))