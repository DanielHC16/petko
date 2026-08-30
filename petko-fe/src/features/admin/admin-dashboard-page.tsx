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
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'

export default function AdminDashboardPage() {
  const profile = useAuthStore((s) => s.profile)
  const [productCount, setProductCount] = useState<number | null>(null)
  const [userCount, setUserCount] = useState<number | null>(null)
  const [adminCount, setAdminCount] = useState<number | null>(null)

  useEffect(() => {
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => setProductCount(count ?? 0))

    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => setUserCount(count ?? 0))

    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
      .then(({ count }) => setAdminCount(count ?? 0))
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-slate-900 p-6 text-white shadow-sm sm:flex-row sm:items-center sm:p-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold text-orange-400 border border-orange-500/30">
              <ShieldCheck size={14} />
              Admin Portal
            </span>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400">
              <CheckCircle2 size={12} />
              RBAC Verified
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-black sm:text-3xl">
            Welcome back, {profile?.full_name || 'Admin'}!
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-orange-300">{profile?.email}</span>
          </p>
        </div>

        {/* Big Action: Customer View */}
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 hover:scale-[1.02]"
        >
          <Eye size={18} />
          <span>Launch Customer View</span>
          <ExternalLink size={14} className="opacity-80" />
        </Link>
      </div>

      {/* Customer Experience Testing Hub */}
      <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-orange-950">
              <Eye className="text-orange-600" size={20} />
              Customer View &amp; Testing Suite
            </h2>
            <p className="mt-1 text-xs text-orange-800/80">
              Test customer flows directly in the live app to verify catalog browsing, persistent cart sync, and checkout scaffolds.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-xl border border-orange-200 bg-white p-4 transition hover:border-orange-400 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <ShoppingBag size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Browse Storefront</p>
              <p className="text-xs text-gray-500">57 products, search &amp; filters</p>
            </div>
          </Link>

          <Link
            to="/cart"
            className="flex items-center gap-3 rounded-xl border border-orange-200 bg-white p-4 transition hover:border-orange-400 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <ShoppingCart size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Test Shopping Cart</p>
              <p className="text-xs text-gray-500">Item quantity &amp; total price</p>
            </div>
          </Link>

          <Link
            to="/checkout"
            className="flex items-center gap-3 rounded-xl border border-orange-200 bg-white p-4 transition hover:border-orange-400 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <CreditCard size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Test Checkout</p>
              <p className="text-xs text-gray-500">Summary &amp; gateway slot</p>
            </div>
          </Link>

          <Link
            to="/orders"
            className="flex items-center gap-3 rounded-xl border border-orange-200 bg-white p-4 transition hover:border-orange-400 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <ListOrdered size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Customer Orders</p>
              <p className="text-xs text-gray-500">Order tracking page</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Admin Management Sections */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Admin Management &amp; Access Control</h2>
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
            className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 transition hover:border-orange-400 hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Package size={22} />
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                {productCount !== null ? `${productCount} active` : '...'}
              </span>
            </div>
            <div className="mt-4">
              <p className="font-bold text-gray-900">Product Management</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Manage stock, prices, categories, and active status
              </p>
            </div>
          </Link>

          {/* Orders */}
          <Link
            to="/admin/orders"
            className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 transition hover:border-orange-400 hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <ListOrdered size={22} />
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                Live
              </span>
            </div>
            <div className="mt-4">
              <p className="font-bold text-gray-900">Order Management</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Review and update order status (pending, paid, shipped)
              </p>
            </div>
          </Link>

          {/* User Roles & RBAC (Active link to /admin/users) */}
          <Link
            to="/admin/users"
            className="group flex flex-col justify-between rounded-xl border border-orange-200 bg-gradient-to-br from-white to-orange-50/40 p-5 transition hover:border-orange-400 hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <Users size={22} />
              </div>
              <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-800">
                {adminCount !== null ? `${adminCount} admin(s)` : `${userCount ?? 0} user(s)`}
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-900 group-hover:text-orange-600">
                  User Roles &amp; RBAC
                </p>
                <ArrowRight size={14} className="text-orange-500 transition group-hover:translate-x-1" />
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                Manually assign Admin roles by Gmail address &amp; view all accounts
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
