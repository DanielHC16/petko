import { useAuthStore } from '@/store/auth.store'

export function shoppingSessionMatches(userId: string | null): boolean {
  const { session, profile, isLoading } = useAuthStore.getState()
  return Boolean(userId && !isLoading && session?.user.id === userId && profile?.id === userId)
}

/** A stale profile must never enable account actions during an identity transition. */
export function useShoppingSession(): { userId: string | null; token: string | null; isLoading: boolean } {
  const session = useAuthStore(state => state.session)
  const profile = useAuthStore(state => state.profile)
  const isLoading = useAuthStore(state => state.isLoading)
  const matched = !isLoading && session?.user.id === profile?.id && Boolean(session?.access_token)
  return { userId: matched ? profile?.id ?? null : null, token: matched ? session?.access_token ?? null : null, isLoading }
}
