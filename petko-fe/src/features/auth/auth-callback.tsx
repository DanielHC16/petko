import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { fetchCurrentProfile } from '@/lib/auth'
import pawBlueImg from '@/assets/paw_blue.png'

const TOS_ACCEPTED_KEY = 'petko_tos_accepted'

function isNewUser(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 90_000
}

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { setSession, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    async function handleCallback() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session) { navigate('/login', { replace: true }); return }

        setSession(session)
        const profile = await fetchCurrentProfile()
        if (profile) setProfile(profile)
        setLoading(false)

        const alreadyAccepted = localStorage.getItem(TOS_ACCEPTED_KEY) === 'true'
        const newUser         = isNewUser(session.user.created_at)

        // Navigate to shop — if new user, pass flag so shop shows TOS overlay
        navigate('/', { replace: true, state: newUser && !alreadyAccepted ? { showTos: true } : {} })
      } catch {
        navigate('/login', { replace: true })
      }
    }
    handleCallback()
  }, [navigate, setSession, setProfile, setLoading])

  // Loading screen while auth resolves
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
