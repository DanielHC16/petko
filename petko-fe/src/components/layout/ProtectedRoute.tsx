import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'

interface ProtectedRouteProps {
  requiredRole?: 'admin' | 'customer'
}

/**
 * Wraps routes that require authentication.
 * If `requiredRole` is provided, also checks the user's role.
 * Renders <Outlet /> when the user passes all checks.
 */
export default function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
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
    return <Navigate to="/login" replace />
  }

  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
