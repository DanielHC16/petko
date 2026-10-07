import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { fetchCurrentProfile } from '@/lib/auth'

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

      // Fetch user profile + role from our NestJS API. On failure the user is
      // still authenticated but without role info; ProtectedRoute handles that.
      const profile = await fetchCurrentProfile()
      if (profile) setProfile(profile)
      setLoading(false)
      navigate('/', { replace: true })
    }

    handleCallback()
  }, [navigate, setSession, setProfile, setLoading])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Signing you in...</p>
    </div>
  )
}
