// Local-dev mock (VITE_MOCK=true) — no backend required.
// Must be the very first import so patches land before onAuthStateChange fires.
import '@/lib/mock-setup'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'
import { fetchCurrentProfile } from '@/lib/auth'

// Global auth state listener — runs once at app startup.
// Keeps the Zustand store in sync with Supabase session changes
// (e.g., token refresh, sign out from another tab).
let authGeneration = 0
supabase.auth.onAuthStateChange((_event, session) => {
  const currentGeneration = ++authGeneration
  const previousUserId = useAuthStore.getState().session?.user.id
  const { setSession, setProfile, setLoading } = useAuthStore.getState()
  setSession(session)
  useCartStore.getState().setOwner(session?.user.id ?? null)
  if (previousUserId !== session?.user.id) {
    setProfile(null)
    setLoading(Boolean(session))
  }
  if (!session) {
    setProfile(null)
    setLoading(false)
    return
  }
  // Keep auth callbacks quick; discard slow responses from an earlier account.
  setTimeout(() => {
    void (async () => {
      const profile = await fetchCurrentProfile()
      if (authGeneration !== currentGeneration) return
      setProfile(profile)
      setLoading(false)
      if (profile?.id && (_event === 'INITIAL_SESSION' || _event === 'SIGNED_IN')) {
        await useCartStore.getState().syncWithRemote(profile.id)
      }
    })()
  }, 0)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster position="top-right" />
  </StrictMode>,
)
