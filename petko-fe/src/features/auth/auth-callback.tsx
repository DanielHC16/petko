import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { fetchCurrentProfile } from '@/lib/auth'
import { consumeAuthReturn } from '@/lib/auth-redirect'
import pawBlueImg from '@/assets/paw_blue.png'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { setSession, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    let active = true
    async function handleCallback() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session) { navigate('/login', { replace: true }); return }

        setSession(session)
        const profile = await fetchCurrentProfile()
        if (!active || useAuthStore.getState().session?.user.id !== session.user.id) return
        if (profile?.id !== session.user.id) { setLoading(false); navigate('/login', { replace: true }); return }
        setProfile(profile)
        setLoading(false)

        // The layout derives the terms prompt from the persisted user profile.
        navigate(consumeAuthReturn(), { replace: true })
      } catch {
        navigate('/login', { replace: true })
      }
    }
    void handleCallback()
    return () => { active = false }
  }, [navigate, setSession, setProfile, setLoading])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-petko-cream">
      <style>{`
        @keyframes pawWalkStep {
          0% { opacity: 0; transform: scale(0.5); }
          15%, 75% { opacity: 1; transform: scale(1); }
          90%, 100% { opacity: 0; transform: scale(0.7); }
        }
      `}</style>
      <div className="flex items-center gap-3 h-14">
        {[
          { delay: 0.0, offsetY: -8, rotate: '75deg'  },
          { delay: 0.3, offsetY:  8, rotate: '105deg' },
          { delay: 0.6, offsetY: -8, rotate: '75deg'  },
          { delay: 0.9, offsetY:  8, rotate: '105deg' },
          { delay: 1.2, offsetY: -8, rotate: '75deg'  },
          { delay: 1.5, offsetY:  8, rotate: '105deg' },
        ].map((p, i) => (
          <div key={i} style={{ transform: `translateY(${p.offsetY}px) rotate(${p.rotate})` }}>
            <img src={pawBlueImg} alt="" aria-hidden="true"
              className="w-8 h-8 object-contain"
              style={{ animation: `pawWalkStep 2.4s ease-in-out ${p.delay}s infinite`, opacity: 0 }} />
          </div>
        ))}
      </div>
      <p className="text-base font-semibold text-petko-blue"
        style={{ fontFamily: "'Nunito', sans-serif" }}
        role="status" aria-live="polite">
        Signing you in…
      </p>
    </div>
  )
}
