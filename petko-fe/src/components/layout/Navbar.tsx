import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ShoppingCart, LogOut, LayoutDashboard, Store } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'
import { signOut } from '@/lib/auth'

export default function Navbar() {
  const profile = useAuthStore((s) => s.profile)
  const totalItems = useCartStore((s) => s.totalItems())
  const navigate = useNavigate()
  const location = useLocation()

  const isAdmin = profile?.role === 'admin'
  const inAdminRoute = location.pathname.startsWith('/admin')

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 text-xl font-black text-orange-500">
            <span className="text-2xl">🐾</span>
            <span>Petko</span>
          </Link>

          {/* Quick Nav for Admins */}
          {isAdmin && (
            <div className="hidden items-center rounded-lg bg-gray-100 p-1 text-xs font-semibold sm:flex">
              <Link
                to="/"
                className={`flex items-center gap-1 rounded-md px-3 py-1 transition ${
                  !inAdminRoute
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Store size={14} />
                Storefront
              </Link>
              <Link
                to="/admin"
                className={`flex items-center gap-1 rounded-md px-3 py-1 transition ${
                  inAdminRoute
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutDashboard size={14} />
                Admin Panel
              </Link>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Cart Icon */}
          <Link
            to="/cart"
            className="relative flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
            aria-label="Shopping Cart"
          >
            <ShoppingCart size={16} />
            <span className="hidden sm:inline">Cart</span>
            {totalItems > 0 && (
              <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </Link>

          {/* User profile & Role Badge */}
          {profile && (
            <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-8 w-8 rounded-full border border-gray-200 object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                  {profile.full_name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="hidden text-left sm:block">
                <p className="text-xs font-bold text-gray-900">{profile.full_name}</p>
                <span
                  className={`inline-block rounded px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider ${
                    isAdmin
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {profile.role}
                </span>
              </div>
            </div>
          )}

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  )
}
