import { useState } from 'react'
import { signInWithGoogle } from '@/lib/auth'
import logoImg     from '@/assets/logo.png'
import dogImg      from '@/assets/dog.png'
import catImg      from '@/assets/cat.png'
import monumentImg from '@/assets/monument.png'
import jeepneyImg  from '@/assets/jeepney.png'
import treeImg     from '@/assets/tree.png'
import pawBlueImg  from '@/assets/paw_blue.png'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

interface SignInFormProps {
  isLoading: boolean
  error: string | null
  onSignIn: () => void
  pawImg: string
  dark?: boolean
}

function SignInForm({ isLoading, error, onSignIn, pawImg, dark = false }: SignInFormProps) {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
      <div className="flex items-center gap-3">
        <img src={pawImg} alt="" aria-hidden="true" className="w-14 h-14 object-contain" />
        <h1
          className={`text-5xl font-black tracking-tight ${dark ? 'text-white drop-shadow-md' : 'text-petko-blue'}`}
          style={{ fontFamily: "'Nunito', sans-serif" }}
        >
          Welcome!
        </h1>
      </div>

      <div className="w-full rounded-2xl border border-gray-200 bg-white px-8 py-8 shadow-card">
        <div className="mb-5 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <span
              className="text-lg font-bold text-petko-blue"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              Sign In to
            </span>
            <img src={logoImg} alt="PetKo" className="h-6 object-contain" />
          </div>
          <p className="text-sm text-gray-500 text-center">
            Log in using Google to continue shopping.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700 flex items-start gap-2"
          >
            <svg className="mt-0.5 shrink-0" width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onSignIn}
          disabled={isLoading}
          aria-label="Continue with Google"
          aria-busy={isLoading}
          className="flex w-full items-center justify-center gap-3
                     rounded-xl border border-gray-300 bg-white px-5 py-3
                     text-base font-medium text-gray-700 shadow-sm
                     transition-all duration-150
                     hover:border-petko-blue hover:bg-blue-50 hover:text-petko-blue hover:shadow-md
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petko-blue focus-visible:ring-offset-2
                     active:scale-[0.98]
                     disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <img src={pawBlueImg} alt="" aria-hidden="true" className="w-5 h-5 object-contain animate-bounce" />
          ) : (
            <GoogleIcon />
          )}
          <span>{isLoading ? 'Redirecting…' : 'Continue with Google'}</span>
        </button>
      </div>
    </div>
  )
}

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogleSignIn() {
    setIsLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen md:flex md:items-center md:justify-center md:bg-petko-cream md:p-6">
      <div className="relative w-full min-h-screen md:min-h-[88vh] md:w-[98vw] md:max-w-[1400px] md:rounded-3xl md:overflow-hidden md:shadow-card-lg md:animate-fade-up md:grid md:grid-cols-2">

        <div className="absolute inset-0 md:relative md:inset-auto overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #e8dfc8 0%, #fdf5e9 42%, #1A3A8F 65%)' }} />

          {/* Logo */}
          <img src={logoImg} alt="PetKo" className="absolute object-contain"
            style={{ top: '15%', left: '50%', transform: 'translateX(-50%)', height: '12%', zIndex: 10}} />

          {/* Tree left */}
          <img src={treeImg} alt="" className="absolute object-contain"
            style={{ top: '5%', left: '-3%', height: '65%', opacity: 0.55, zIndex: 2 }} />

          {/* Tree right */}
          <img src={treeImg} alt="" className="absolute object-contain"
            style={{ top: '0%', right: '-11%', height: '85%', opacity: 0.55, transform: 'scaleX(-1)', zIndex: 2 }} />

          {/* Monument */}
          <img src={monumentImg} alt="" className="absolute object-contain"
            style={{ bottom: '12%', left: '47%', height: '63%', zIndex: 3 }} />

          {/* Jeepney */}
          <img src={jeepneyImg} alt="" className="absolute object-contain"
            style={{ bottom: '16%', left: '-1%', height: '31%', zIndex: 4 }} />

          {/* Dog */}
          <img src={dogImg} alt="" className="absolute object-contain"
            style={{ bottom: '10%', left: '12%', height: '50%', zIndex: 5 }} />

          {/* Cat */}
          <img src={catImg} alt="" className="absolute object-contain"
            style={{ bottom: '12%', left: '43%', height: '36%', zIndex: 5 }} />

          {/* Navy ground */}
          <div className="absolute bottom-0 inset-x-0" style={{ height: '10%', background: '#1A3A8F', zIndex: 1 }} />
        </div>

        <div
          className="md:hidden relative z-20 min-h-screen flex items-center justify-center px-6 py-10"
          style={{ background: 'rgba(26,58,143,0.75)', backdropFilter: 'blur(3px)' }}
        >
          {/* Paw background card */}
          <div className="relative w-full max-w-sm rounded-3xl overflow-hidden bg-white shadow-card-lg py-2">
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
              {[
                { top: '3%',  left: '5%',   size: 36, rotate: '-15deg' },
                { top: '4%',  left: '62%',  size: 52, rotate:  '10deg' },
                { top: '2%',  left: '80%',  size: 40, rotate: '-25deg' },
                { top: '22%', left: '75%',  size: 60, rotate:  '25deg' },
                { top: '42%', left: '82%',  size: 44, rotate: '-10deg' },
                { top: '62%', left: '72%',  size: 54, rotate:  '20deg' },
                { top: '78%', left: '60%',  size: 38, rotate: '-20deg' },
                { top: '85%', left: '78%',  size: 62, rotate:  '15deg' },
                { top: '70%', left: '4%',   size: 48, rotate: '-30deg' },
                { top: '50%', left: '2%',   size: 36, rotate:  '10deg' },
                { top: '30%', left: '6%',   size: 56, rotate: '-15deg' },
                { top: '90%', left: '20%',  size: 42, rotate:  '25deg' },
              ].map((p, i) => (
                <img key={i} src={pawBlueImg} alt=""
                  style={{ position: 'absolute', top: p.top, left: p.left, width: `${p.size}px`, height: `${p.size}px`, objectFit: 'contain', opacity: 0.07, transform: `rotate(${p.rotate})` }}
                />
              ))}
            </div>
            <div className="relative z-10 flex flex-col items-center gap-6 px-6 py-8">
              <div className="flex items-center gap-2.5">
                <img src={pawBlueImg} alt="" aria-hidden="true" className="w-12 h-12 object-contain" />
                <h1 className="text-4xl font-black tracking-tight text-petko-blue" style={{ fontFamily: "'Nunito', sans-serif" }}>Welcome!</h1>
              </div>
              <div className="w-full rounded-2xl border border-gray-200 bg-white px-6 py-6 shadow-card">
                <div className="mb-4 flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-petko-blue" style={{ fontFamily: "'Nunito', sans-serif" }}>Sign In to</span>
                    <img src={logoImg} alt="PetKo" className="h-5 object-contain" />
                  </div>
                  <p className="text-xs text-gray-500 text-center">Log in using Google to continue shopping.</p>
                </div>
                {error && (
                  <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700 flex items-start gap-2">
                    <svg className="mt-0.5 shrink-0" width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}
                <button
                  type="button" onClick={handleGoogleSignIn} disabled={isLoading}
                  aria-label="Continue with Google" aria-busy={isLoading}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-150 hover:border-petko-blue hover:bg-blue-50 hover:text-petko-blue hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petko-blue focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-petko-blue animate-spin" aria-hidden="true" />
                  ) : (
                    <GoogleIcon />
                  )}
                  <span>{isLoading ? 'Redirecting…' : 'Continue with Google'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-center justify-center bg-white px-8 py-12 lg:px-12 gap-7 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            {[
              { top: '3%',  left: '5%',   size: 40,  rotate:  '-15deg' },
              { top: '5%',  left: '42%',  size: 64,  rotate:   '10deg' },
              { top: '2%',  left: '75%',  size: 50,  rotate:  '-25deg' },
              { top: '15%', left: '18%',  size: 72,  rotate:   '20deg' },
              { top: '18%', left: '60%',  size: 36,  rotate:  '-10deg' },
              { top: '12%', left: '88%',  size: 56,  rotate:   '30deg' },
              { top: '30%', left: '4%',   size: 48,  rotate:  '-30deg' },
              { top: '28%', left: '35%',  size: 80,  rotate:   '15deg' },
              { top: '32%', left: '70%',  size: 44,  rotate:  '-20deg' },
              { top: '44%', left: '20%',  size: 60,  rotate:   '25deg' },
              { top: '42%', left: '52%',  size: 36,  rotate:  '-5deg'  },
              { top: '46%', left: '84%',  size: 68,  rotate:   '10deg' },
              { top: '58%', left: '8%',   size: 76,  rotate:  '-20deg' },
              { top: '60%', left: '40%',  size: 42,  rotate:   '30deg' },
              { top: '56%', left: '68%',  size: 54,  rotate:  '-15deg' },
              { top: '72%', left: '22%',  size: 50,  rotate:   '20deg' },
              { top: '70%', left: '58%',  size: 78,  rotate:  '-30deg' },
              { top: '74%', left: '88%',  size: 38,  rotate:   '5deg'  },
              { top: '85%', left: '6%',   size: 62,  rotate:  '-10deg' },
              { top: '88%', left: '44%',  size: 44,  rotate:   '25deg' },
              { top: '84%', left: '76%',  size: 70,  rotate:  '-20deg' },
              { top: '94%', left: '28%',  size: 36,  rotate:   '15deg' },
              { top: '92%', left: '64%',  size: 52,  rotate:  '-25deg' },
            ].map((p, i) => (
              <img
                key={i}
                src={pawBlueImg}
                alt=""
                style={{
                  position: 'absolute',
                  top: p.top,
                  left: p.left,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  objectFit: 'contain',
                  opacity: 0.07,
                  transform: `rotate(${p.rotate})`,
                }}
              />
            ))}
          </div>
          <div className="relative z-10 flex flex-col items-center gap-7 w-full">
            <SignInForm isLoading={isLoading} error={error} onSignIn={handleGoogleSignIn} pawImg={pawBlueImg} />
          </div>
        </div>

      </div>
    </div>
  )
}
