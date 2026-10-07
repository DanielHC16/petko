import { supabase } from '@/lib/supabase'
import { api } from '@/lib/axios'
import type { ApiResponse } from '@/lib/api-types'
import { useAuthStore, type UserProfile } from '@/store/auth.store'

/**
 * Loads the signed-in user's profile from the API. `role` is the effective
 * role (admin when stored as admin or listed in the admin access list).
 * Returns null when the request fails.
 */
export async function fetchCurrentProfile(): Promise<UserProfile | null> {
  try {
    const response = await api.get<ApiResponse<UserProfile>>('/users/me')
    return response.data.data
  } catch {
    return null
  }
}

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
