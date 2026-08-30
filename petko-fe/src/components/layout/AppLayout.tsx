import { Outlet, useLocation, Link } from 'react-router-dom'
import { Eye, ArrowLeft, Shield } from 'lucide-react'
import Navbar from './Navbar'
import { useAuthStore } from '@/store/auth.store'

export default function AppLayout() {
  const profile = useAuthStore((s) => s.profile)
  const location = useLocation()

  const isAdmin = profile?.role === 'admin'
  const isCustomerRoute = !location.pathname.startsWith('/admin')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Admin Testing Customer-View Mode Banner */}
      {isAdmin && isCustomerRoute && (
        <div className="sticky top-0 z-50 flex items-center justify-between border-b border-amber-300 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm">
          <div className="flex items-center gap-2">
            <Eye size={14} className="animate-pulse" />
            <span>
              Customer View Mode: You are testing the store as an Administrator.
            </span>
          </div>
          <Link
            to="/admin"
            className="flex items-center gap-1 rounded bg-black/20 px-2.5 py-0.5 font-bold transition hover:bg-black/30"
          >
            <ArrowLeft size={12} />
            Back to Admin Portal
          </Link>
        </div>
      )}

      {/* Admin in Admin Portal Banner */}
      {isAdmin && !isCustomerRoute && (
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-1 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <Shield size={12} className="text-orange-400" />
            <span>Admin Control Panel</span>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1 text-orange-400 hover:text-orange-300 font-medium"
          >
            <Eye size={12} />
            Switch to Customer View
          </Link>
        </div>
      )}

      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-500">
        <div className="mx-auto max-w-7xl px-4">
          <p>© {new Date().getFullYear()} Petko — Filipino Pet Supplies Platform.</p>
        </div>
      </footer>
    </div>
  )
}
