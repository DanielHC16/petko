import { Link } from 'react-router-dom'
import { ArrowLeft, Package, Clock } from 'lucide-react'
import PageBanner from '@/components/layout/PageBanner'

export default function AdminOrdersPage() {
  return (
    <div className="min-h-screen w-full bg-[#ecdab6] p-6 font-sans lg:p-10">
      <div className="space-y-6">

        <PageBanner
          title="Order Management"
          subtitle="Review and update order status (pending, paid, shipped) for customer purchases."
        >
          <div className="flex items-center border-t border-orange-100 bg-orange-50/60 px-6 py-2 sm:px-8">
            <Link to="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#10298E] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0B3B8C] active:scale-95">
              <ArrowLeft size={13} />
              Back to Admin Portal
            </Link>
          </div>
        </PageBanner>

        {/* Coming Soon Card */}
        <div className="rounded-2xl border border-[#e1cba5] bg-[#fdf2e1] p-12 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
              <Package size={32} />
            </div>
            <h2
              className="mt-4 text-xl font-bold text-[#10298E]"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              Order Management Coming Soon
            </h2>
            <p className="mt-2 max-w-md text-sm text-gray-600">
              This section will allow admins to review customer orders, update fulfillment
              status, and manage shipping information.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
              <Clock size={12} />
              Under Development
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
