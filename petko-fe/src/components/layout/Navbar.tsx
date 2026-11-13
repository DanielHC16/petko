import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  LogOut,
  LayoutDashboard,
  Store,
  Package,
  Settings,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'
import { signOut } from '@/lib/auth'
import logoImg from '@/assets/logo.png'
import pawImg from '@/assets/paw_blue.png'

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
    <nav className="border-b border-gray-200 bg-white px-3 py-2.5 shadow-sm sm:px-5">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-2">
        {/* Brand + toggle — left side, never wraps */}
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-4">
          <Link to="/" className="flex shrink-0 items-center gap-1.5">
            <img
              src={pawImg}
              alt=""
              className="h-6 w-6 object-contain sm:h-7 sm:w-7"
              aria-hidden="true"
            />
            <img src={logoImg} alt="PetKo" className="h-6 object-contain sm:h-7" />
          </Link>

          {/* View toggle for admins */}
          {isAdmin && (
            <div
              role="group"
              aria-label="Switch view"
              className="flex shrink-0 items-center rounded-lg bg-gray-100 p-1 text-xs font-semibold"
            >
              <Link
                to="/"
                aria-current={inAdminRoute ? undefined : 'page'}
                title="Storefront"
                className={`flex items-center gap-1 rounded-md px-2 py-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  !inAdminRoute
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Store size={14} aria-hidden="true" />
                <span className="hidden sm:inline">Storefront</span>
              </Link>
              <Link
                to="/admin"
                aria-current={inAdminRoute ? 'page' : undefined}
                title="Admin Panel"
                className={`flex items-center gap-1 rounded-md px-2 py-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  inAdminRoute
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutDashboard size={14} aria-hidden="true" />
                <span className="hidden sm:inline">Admin Panel</span>
              </Link>
            </div>
          )}
        </div>

        {/* Right Actions — always on same row */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            to="/orders"
            aria-label="Your orders"
            aria-current={location.pathname === '/orders' ? 'page' : undefined}
            title="Your orders"
            className="flex h-9 min-w-[36px] sm:min-w-[88px] items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs font-semibold text-gray-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-petko-blue"
          >
            <Package size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Orders</span>
          </Link>

          <Link
            to="/cart"
            className="relative flex h-9 min-w-[36px] sm:min-w-[88px] items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-xs font-semibold text-gray-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-petko-blue"
            aria-label="Shopping Cart"
          >
            <ShoppingCart size={15} aria-hidden="true" />
            <span className="hidden sm:inline">Cart</span>
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                {totalItems}
              </span>
            )}
          </Link>

          {/* User avatar + name (clickable to /profile) */}
          {profile && (
            <Link
              to="/profile"
              title="Profile & Account Settings"
              className="flex items-center gap-2 border-l border-gray-200 pl-2 sm:pl-3 rounded-r-lg transition hover:opacity-80"
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-8 w-8 shrink-0 rounded-full border border-gray-200 object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                  {profile.full_name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="hidden text-left sm:block">
                <p className="text-xs font-bold text-gray-900 max-w-[120px] truncate">
                  {profile.full_name}
                </p>
                <span
                  className={`inline-block rounded px-1.5 text-[10px] font-bold uppercase tracking-wider ${
                    isAdmin
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {profile.role}
                </span>
              </div>
            </Link>
          )}

          {/* Settings */}
          <Link
            to="/profile"
            aria-label="Account settings"
            aria-current={location.pathname === '/profile' ? 'page' : undefined}
            title="Account settings"
            className={`rounded-lg p-1.5 transition ${
              location.pathname === '/profile'
                ? 'bg-orange-50 text-orange-600'
                : 'text-gray-400 hover:bg-orange-50 hover:text-orange-600'
            }`}
          >
            <Settings size={17} aria-hidden="true" />
          </Link>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </nav>
  )
}