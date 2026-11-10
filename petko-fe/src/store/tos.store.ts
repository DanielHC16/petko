import { create } from 'zustand'

interface TosState {
  isOpen: boolean
  isFirstLogin: boolean
  open: (firstLogin?: boolean) => void
  close: () => void
}

export const useTosStore = create<TosState>((set) => ({
  isOpen: false,
  isFirstLogin: false,
  open: (firstLogin = false) => set({ isOpen: true, isFirstLogin: firstLogin }),
  close: () => set({ isOpen: false }),
}))

const KEY = (userId: string) => `petko_tos_accepted_${userId}`

export function hasTosAccepted(userId: string): boolean {
  return localStorage.getItem(KEY(userId)) === 'true'
}

export function setTosAccepted(userId: string): void {
  localStorage.setItem(KEY(userId), 'true')
}
