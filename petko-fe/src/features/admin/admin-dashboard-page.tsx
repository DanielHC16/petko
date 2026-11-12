import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toastStyle, toastIconTheme } from '@/lib/toast-style'
import {
  Package,
  ListOrdered,
  Users,
  ShieldCheck,
  CheckCircle2,
  UserPlus,
  ArrowRight,
  BarChart3,
  Eye,
  ExternalLink,
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
        toast.error(getApiErrorMessage(err, 'Failed to load dashboard stats'), { style: toastStyle('error'), iconTheme: toastIconTheme('error') })
        setStatsState({ status: 'error' })
      }
    }
    load()
    return () => { isMounted = false }
  }, [])

  function statText(format: (stats: AdminStats) => string): string {
    if (statsState.status === 'loading') return '…'
    if (statsState.status === 'error') return '—'
    return format(statsState.stats)
  }

  return (
    <div className="min-h-screen w-full bg-petko-cream p-6 font-sans lg:p-10">
      <div className="space-y-8">

        {/* ── Hero banner ─────────────────────────────────────────────── */}
        <div className="relative -mx-6 -mt-6 mb-2 overflow-hidden rounded-b-2xl bg-[#FFFBF5] shadow-sm lg:-mx-12 lg:-mt-12">
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
              <div className="flex items-center gap-1.5">
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-orange-200 bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                  <ShieldCheck size={11} />
                  Admin Portal
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  <CheckCircle2 size={10} />
                  RBAC Verified
                </span>
              </div>
              <h1 className="mt-1.5 font-extrabold text-[#0B419A] leading-[1.1]"
                style={{ fontFamily: "'Nunito', sans-serif", fontSize: 'clamp(1.1rem, 4vw, 2.4rem)' }}>
                Welcome back,<br />
                <span className="text-[#E31B23]">{profile?.full_name?.split(' ')[0] || 'Admin'}!</span>
              </h1>
              <p className="mt-0.5 text-[9px] font-medium text-gray-600 leading-snug sm:text-[12px]">
                Signed in as <span className="font-mono text-orange-600">{profile?.email}</span>
              </p>
              <Link to="/"
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#10298E] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#0B3B8C] active:scale-95 sm:mt-3 sm:text-xs">
                <Eye size={13} />
                Launch Customer View
                <ExternalLink size={11} className="opacity-80" />
              </Link>
            </div>

            {/* Dog/cat illustration */}
            <div className="relative h-full flex items-end justify-center flex-1 min-w-0">
              <img src={dogcatImg} alt="" aria-hidden="true"
                className="absolute bottom-0 z-20 object-contain object-bottom pointer-events-none"
                style={{ height: '115%', right: 0 }} />
            </div>
          </div>
        </div>

        {/* ── Admin Management & Access Control ───────────────────────── */}
        <div className="rounded-2xl border border-[#e1cba5] bg-[#fdf2e1] p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#10298E]"
                style={{ fontFamily: "'Nunito', sans-serif" }}>
                Admin Management &amp; Access Control
              </h2>
              <p className="mt-1 text-xs text-gray-600">
                Manage your store catalog, orders, users and analytics from one place.
              </p>
            </div>
            <Link
              to="/admin/users"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700"
            >
              <UserPlus size={14} />
              <span>Manage Admins</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

            {/* Store Analytics */}
            <Link to="/admin/analytics"
              className="flex items-center gap-3 rounded-xl border border-[#e1cba5] bg-white p-4 transition hover:border-orange-400 hover:shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <BarChart3 size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#10298E]">Store Analytics</p>
                <p className="text-xs text-gray-500">Buying trends, sales &amp; top products</p>
              </div>
            </Link>

            {/* Product Management */}
            <Link to="/admin/products"
              className="flex items-center gap-3 rounded-xl border border-[#e1cba5] bg-white p-4 transition hover:border-orange-400 hover:shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <Package size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#10298E]">Product Management</p>
                <p className="text-xs text-gray-500">
                  {statText((s) => `${s.products.active} active`)} · stock, prices &amp; categories
                </p>
              </div>
            </Link>

            {/* Order Management */}
            <Link to="/admin/orders"
              className="flex items-center gap-3 rounded-xl border border-[#e1cba5] bg-white p-4 transition hover:border-orange-400 hover:shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <ListOrdered size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#10298E]">Order Management</p>
                <p className="text-xs text-gray-500">Fulfillment pipeline &amp; tracking</p>
              </div>
            </Link>

            {/* User Roles & RBAC */}
            <Link to="/admin/users"
              className="flex items-center gap-3 rounded-xl border border-[#e1cba5] bg-white p-4 transition hover:border-orange-400 hover:shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <Users size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#10298E]">User Roles &amp; RBAC</p>
                <p className="text-xs text-gray-500">
                  {statText((s) => `${s.users.admins} admin(s)`)} · {statText((s) => `${s.accessEmails} on access list`)}
                </p>
              </div>
            </Link>

          </div>
        </div>

      </div>
    </div>
  )
}
