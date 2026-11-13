import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { loginPath } from '@/lib/auth-redirect'

interface ProtectedRouteProps {
  requiredRole?: 'admin' | 'customer'
}

/**
 * Wraps routes that require authentication.
 * If `requiredRole` is provided, also checks the user's role.
 * Renders <Outlet /> when the user passes all checks.
 */
export default function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const location = useLocation()
  const session = useAuthStore((s) => s.session)
  const profile = useAuthStore((s) => s.profile)
  const isLoading = useAuthStore((s) => s.isLoading)

  // Show nothing while the initial session is being resolved
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-gray-500 text-sm">Loading...</span>
      </div>
    )
  }

  if (!session) {
    return <Navigate to={loginPath(location.pathname + location.search + location.hash)} replace />
  }

  if (!profile || profile.id !== session.user.id) {
    return <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm text-gray-700">Could not load your account. Please try again.</p>
      <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-petko-blue px-4 py-2 text-sm font-bold text-white">Reload account</button>
    </div>
  }

  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return <Outlet key={session.user.id} />
}
