import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/axios'
import type { UserProfile } from '@/store/auth.store'

/**
 * Supabase redirects here after Google SSO.
 * We read the session, then fetch the user's profile (including role) from our API.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { setSession, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    async function handleCallback() {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        navigate('/login', { replace: true })
        return
      }

      setSession(session)

      try {
        // Fetch user profile + role from our NestJS API
        const response = await api.get<{ data: UserProfile }>('/users/me')
        setProfile(response.data.data)
      } catch {
        // Profile fetch failed — still authenticated but without role info
        // The ProtectedRoute will handle role-based redirects
      } finally {
        setLoading(false)
        navigate('/', { replace: true })
      }
    }

    handleCallback()
  }, [navigate, setSession, setProfile, setLoading])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Signing you in...</p>
    </div>
  )
}
