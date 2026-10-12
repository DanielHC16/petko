import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { fetchCurrentProfile } from '@/lib/auth'
import pawBlueImg from '@/assets/paw_blue.png'

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

      const profile = await fetchCurrentProfile()
      if (profile) setProfile(profile)
      setLoading(false)
      navigate('/', { replace: true })
    }

    handleCallback()
  }, [navigate, setSession, setProfile, setLoading])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-petko-cream">
      <img src={pawBlueImg} alt="" aria-hidden="true" className="w-12 h-12 object-contain" />
      <span
        className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-petko-blue animate-spin"
        aria-hidden="true"
      />
      <p
        className="text-base font-semibold text-petko-blue"
        style={{ fontFamily: "'Nunito', sans-serif" }}
        role="status"
        aria-live="polite"
      >
        Signing you in…
      </p>
    </div>
  )
}
