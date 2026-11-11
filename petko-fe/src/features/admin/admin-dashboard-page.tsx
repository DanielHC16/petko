import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Eye,
  Package,
  ShoppingCart,
  ShoppingBag,
  CreditCard,
  ListOrdered,
  Users,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  UserPlus,
  ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import { useAuthStore } from '@/store/auth.store'
import { fetchAdminStats, type AdminStats } from './admin-api'
import pawYellowImg from '@/assets/paw_yellow.png'
import dogcatImg    from '@/assets/proheader.png'

type StatsState =
  | { status: 'loading' }
  | { status: 'ready'; stats: AdminStats }
  | { status: 'error' }

export default function AdminDashboardPage() {
  const profile = useAuthStore((s) => s.profile)
  const [statsState, setStatsState] = useState<StatsState>({ status: 'loading' })

  useEffect(() => {
    let isMounted = true
    async function load(): Promise<void> {
      try {
        const stats = await fetchAdminStats()
        if (isMounted) setStatsState({ status: 'ready', stats })
      } catch (err: unknown) {
        if (!isMounted) return
        toast.error(getApiErrorMessage(err, 'Failed to load dashboard stats'))
        setStatsState({ status: 'error' })
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  /** Renders a stat, "…" while loading and "—" on error. */
  function statText(format: (stats: AdminStats) => string): string {
    if (statsState.status === 'loading') return '…'
    if (statsState.status === 'error') return '—'
    return format(statsState.stats)
  }

  return (
    <div className="min-h-screen w-full bg-[#ecdab6] p-6 font-sans lg:p-10">
      <div className="space-y-8">
        {/* ── Hero banner (matches shop theme exactly) ───────────────── */}
        <div className="relative -mx-6 -mt-6 mb-2 overflow-hidden rounded-b-2xl bg-[#FFFBF5] shadow-sm lg:-mx-10 lg:-mt-10">
          {/* Left paw pair */}
          <img src={pawYellowImg} alt="" aria-hidden="true"
            className="absolute z-10 pointer-events-none opacity-70 w-[100px] sm:w-[140px] lg:w-[180px]"
            style={{ top: '40%', left: '-25px', transform: 'rotate(23deg)' }} />
          <img src={pawYellowImg} alt="" aria-hidden="true"
            className="absolute z-10 pointer-events-none opacity-70 w-[100px] sm:w-[140px] lg:w-[180px]"
            style={{ top: 'calc(40% + 4px)', left: '-30px', transform: 'rotate(23deg)' }} />
          {/* Right paw pair */}
          <img src={pawYellowImg} alt="" aria-hidden="true"
            className="absolute z-10 pointer-events-none opacity-70 w-[110px] sm:w-[155px] lg:w-[200px]"
            style={{ top: '-45px', right: '-50px', transform: 'rotate(195deg)' }} />
          <img src={pawYellowImg} alt="" aria-hidden="true"
            className="absolute z-10 pointer-events-none opacity-70 w-[110px] sm:w-[155px] lg:w-[200px]"
            style={{ top: '-44px', right: '-55px', transform: 'rotate(195deg)' }} />

          <div className="relative z-20 mx-auto flex h-[160px] max-w-4xl items-center justify-between gap-2 px-4 sm:h-[190px] sm:px-6 lg:h-[220px]">
            {/* Text */}
            <div className="flex-shrink-0 max-w-[55%] sm:max-w-[45%]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1 rounded-full border border-orange-200 bg-orange-100 px-3 py-0.5 text-[11px] font-semibold text-orange-700">
                  <ShieldCheck size={13} />
                  Admin Portal
                </span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                  <CheckCircle2 size={11} />
                  RBAC Verified
                </span>
              </div>
              <h1 className="mt-2 font-extrabold text-[#0B419A] leading-[1.1]"
                style={{ fontFamily: "'Nunito', sans-serif", fontSize: 'clamp(1.3rem, 4vw, 2.4rem)' }}>
                Welcome back,<br />
                <span className="text-[#E31B23]">{profile?.full_name?.split(' ')[0] || 'Admin'}!</span>
              </h1>

              <p className="mt-1 text-[10px] sm:text-[12px] font-medium text-gray-600 leading-snug">
                Signed in as <span className="font-mono text-orange-600">{profile?.email}</span>
              </p>

              <Link to="/"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#10298E] px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0B3B8C] active:scale-95">
                <Eye size={14} />
                Launch Customer View
                <ExternalLink size={12} className="opacity-80" />
              </Link>
            </div>

            {/* Dog/cat illustration */}
            <div className="relative h-full flex items-end justify-center flex-1 min-w-0">
              <img src={dogcatImg} alt="" aria-hidden="true"
                className="absolute bottom-0 z-20 object-contain object-bottom pointer-events-none"
                style={{ height: '115%', right: 0 }} />
            </div>
          </div>

          {/* Launch Customer View CTA — sits below the hero content */}
        </div>

        {/* ── Customer Experience Testing Hub ────────────────────────── */}
        <div className="rounded-2xl border border-[#e1cba5] bg-[#fdf2e1] p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="flex items-center gap-2 text-lg font-bold text-[#10298E]"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                <Eye className="text-orange-500" size={20} />
                Customer View &amp; Testing Suite
              </h2>
              <p className="mt-1 text-xs text-gray-600">
                Test customer flows directly in the live app to verify catalog browsing, persistent cart sync, and checkout scaffolds.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/"
              className="flex items-center gap-3 rounded-xl border border-[#e1cba5] bg-white p-4 transition hover:border-orange-400 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#10298E]">Browse Storefront</p>
                <p className="text-xs text-gray-500">
                  {statText((s) => `${s.products.active} products`)}, search &amp; filters
                </p>
              </div>
            </Link>

            <Link
              to="/cart"
              className="flex items-center gap-3 rounded-xl border border-[#e1cba5] bg-white p-4 transition hover:border-orange-400 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <ShoppingCart size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#10298E]">Test Shopping Cart</p>
                <p className="text-xs text-gray-500">Item quantity &amp; total price</p>
              </div>
            </Link>

            <Link
              to="/checkout"
              className="flex items-center gap-3 rounded-xl border border-[#e1cba5] bg-white p-4 transition hover:border-orange-400 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <CreditCard size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#10298E]">Test Checkout</p>
                <p className="text-xs text-gray-500">Summary &amp; gateway slot</p>
              </div>
            </Link>

            <Link
              to="/orders"
              className="flex items-center gap-3 rounded-xl border border-[#e1cba5] bg-white p-4 transition hover:border-orange-400 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <ListOrdered size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#10298E]">Customer Orders</p>
                <p className="text-xs text-gray-500">Order tracking page</p>
              </div>
            </Link>
          </div>
        </div>

        {/* ── Admin Management Sections ─────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between">
            <h2
              className="text-base font-bold text-[#10298E]"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              Admin Management &amp; Access Control
            </h2>
            <Link
              to="/admin/users"
              className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700"
            >
              <UserPlus size={14} />
              <span>Manage &amp; Add Admins</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Products */}
            <Link
              to="/admin/products"
              className="flex flex-col justify-between rounded-xl border border-[#e1cba5] bg-[#fdf2e1] p-5 shadow-sm transition hover:border-orange-400 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#10298E]">
                  <Package size={22} />
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#10298E]">
                  {statText((s) => `${s.products.active} active`)}
                </span>
              </div>
              <div className="mt-4">
                <p className="font-bold text-[#10298E]">Product Management</p>
                <p className="mt-0.5 text-xs text-gray-600">
                  Manage stock, prices, categories, and active status
                </p>
              </div>
            </Link>

            {/* Orders */}
            <Link
              to="/admin/orders"
              className="flex flex-col justify-between rounded-xl border border-[#e1cba5] bg-[#fdf2e1] p-5 shadow-sm transition hover:border-orange-400 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#10298E]">
                  <ListOrdered size={22} />
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#10298E]">
                  Live
                </span>
              </div>
              <div className="mt-4">
                <p className="font-bold text-[#10298E]">Order Management</p>
                <p className="mt-0.5 text-xs text-gray-600">
                  Review and update order status (pending, paid, shipped)
                </p>
              </div>
            </Link>

            {/* User Roles & RBAC (Active link to /admin/users) */}
            <Link
              to="/admin/users"
              className="group flex flex-col justify-between rounded-xl border border-orange-200 bg-gradient-to-br from-[#fdf2e1] to-orange-50/40 p-5 shadow-sm transition hover:border-orange-400 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <Users size={22} />
                </div>
                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-800">
                  {statText((s) => `${s.users.admins} admin(s)`)}
                </span>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[#10298E] group-hover:text-orange-600">
                    User Roles &amp; RBAC
                  </p>
                  <ArrowRight size={14} className="text-orange-500 transition group-hover:translate-x-1" />
                </div>
                <p className="mt-0.5 text-xs text-gray-600">
                  Manually assign Admin roles by Gmail address &amp; view all accounts
                </p>
                <p className="mt-1 text-xs font-semibold text-orange-700">
                  {statText((s) => `${s.accessEmails} email(s) on the admin access list`)}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
