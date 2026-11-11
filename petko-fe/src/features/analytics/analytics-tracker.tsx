import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { observeAnalytics } from './analytics-session'

export default function AnalyticsTracker() {
  const location = useLocation()
  const profile = useAuthStore((state) => state.profile)
  const token = useAuthStore((state) => state.session?.access_token ?? null)
  const isLoading = useAuthStore((state) => state.isLoading)

  useEffect(() => {
    if (isLoading || (token && !profile)) return
    observeAnalytics({ navigationKey: location.key, path: location.pathname, actor: profile, token })
  }, [location.key, location.pathname, profile, token, isLoading])
  return null
}
