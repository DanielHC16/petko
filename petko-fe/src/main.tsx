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
supabase.auth.onAuthStateChange(async (_event, session) => {
  const { setSession, setProfile, setLoading } = useAuthStore.getState()

  setSession(session)

  if (session) {
    const profile = await fetchCurrentProfile()
    setProfile(profile)
    if (profile?.id) {
      void useCartStore.getState().syncWithRemote(profile.id)
    }
  } else {
    setProfile(null)
  }

  setLoading(false)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster position="top-right" />
  </StrictMode>,
)
