import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'

/**
 * Initiates Google OAuth sign-in via Supabase.
 * Supabase redirects the user to Google, then back to /auth/callback.
 */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw new Error(error.message)
}

/**
 * Signs the current user out and clears the local auth store.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  useAuthStore.getState().clearSession()
  if (error) throw new Error(error.message)
}
