import { create } from 'zustand'

interface TosState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useTosStore = create<TosState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))

