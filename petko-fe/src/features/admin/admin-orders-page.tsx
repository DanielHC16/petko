import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ExternalLink, Package, RefreshCw } from 'lucide-react'
import { OrderStatusBadge } from '@/components/orders/order-detail'
import { useOrderList } from '@/hooks/use-orders'
import {
  formatOrderDate,
  formatOrderMoney,
  isFulfillmentStatus,
  ORDER_STEPS,
  orderNumber,
} from '@/lib/order-status'
import AdminOrder from './admin-order-detail'
import PageBanner from '@/components/layout/PageBanner'

export default function AdminOrdersPage() {
  const [params, setParams] = useSearchParams()
  const [refreshToken, setRefreshToken] = useState(0)
  const pageValue = Number(params.get('page') ?? '1')
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1
  const rawStatus = params.get('status') ?? ''
  const status = isFulfillmentStatus(rawStatus) ? rawStatus : undefined
  const issuesOnly = params.get('issues') === 'true'
  const list = useOrderList(
    {
      page,
      limit: 10,
      fulfillment_status: status,
      unresolved_only: issuesOnly || undefined,
    },
    true,
  )
  const selected = params.get('order') || list.data?.orders[0]?.id || null

  function changeFilter(name: string, value: string): void {
    setParams((current) => {
      if (value) current.set(name, value)
      else current.delete(name)
      current.delete('page')
      current.delete('order')
      return current
    })
  }
  function changePage(next: number): void {
    setParams((current) => {
      current.set('page', String(next))
      current.delete('order')
      return current
    })
  }
  function refreshOrders(): void {
    list.refresh()
    setRefreshToken((value) => value + 1)
  }

  return (
    <div className="min-h-screen flex-1 w-full bg-[#ecdab6] p-6 font-sans lg:p-10">
      <div className="space-y-6">

        <PageBanner
          title="Order Management"
          subtitle="Keep deliveries moving and review customer receipt reports."
        >
        <div className="flex items-center justify-between gap-2 border-t border-orange-100 bg-orange-50/60 px-3 py-2 sm:px-8">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#10298E] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0B3B8C] active:scale-95 sm:px-3"
          >
            <ArrowLeft size={13} />
            <span>
              Back<span className="hidden sm:inline"> to Admin Portal</span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/orders"
              className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-orange-700 shadow-sm transition hover:bg-orange-50 active:scale-95 sm:px-3"
            >
              <ExternalLink size={13} />
              <span>
                <span className="hidden sm:inline">View </span>Customer Orders
                <span className="hidden sm:inline"> Page</span>
              </span>
            </Link>

            <button
              type="button"
              onClick={refreshOrders}
              disabled={list.isLoading}
              title="Refresh orders"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 sm:px-3"
            >
              <RefreshCw
                size={13}
                className={list.isLoading ? 'animate-spin motion-reduce:animate-none' : ''}
              />
              <span className="hidden sm:inline">Refresh orders</span>
            </button>
          </div>
        </div>
        </PageBanner>

        <section
          className="overflow-hidden rounded-2xl border border-[#e1cba5] bg-white shadow-sm"
          aria-label="Manage order list"
        >
          <div className="flex flex-col gap-4 border-b border-[#e1cba5] bg-orange-50/40 p-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label
                htmlFor="order-status-filter"
                className="mb-1 block text-xs font-bold text-gray-700"
              >
                Fulfillment status
              </label>
              <select
                id="order-status-filter"
                value={status ?? ''}
                onChange={(event) => changeFilter('status', event.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-petko-blue focus:outline-none focus:ring-2 focus:ring-petko-blue/20"
              >
                <option value="">All statuses</option>
                {ORDER_STEPS.map((step) => (
                  <option key={step.status} value={step.status}>
                    {step.label}
                  </option>
                ))}
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <label className="inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={issuesOnly}
                onChange={(event) =>
                  changeFilter('issues', event.target.checked ? 'true' : '')
                }
                className="h-4 w-4 accent-petko-blue"
              />
              <AlertCircle size={16} className="text-orange-700" aria-hidden="true" />
              Needs delivery review
            </label>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-gray-500">
                {list.data ? `${list.data.total} orders` : 'Orders'}
              </p>
              <span className="text-gray-300">·</span>
              <Link
                to="/orders"
                className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline"
              >
                <ExternalLink size={12} />
                Customer View (/orders)
              </Link>
            </div>
          </div>

          {list.error && (
            <div
              role="alert"
              className="m-4 rounded-xl bg-red-50 p-4 text-sm text-red-800"
            >
              {list.error}{' '}
              <button type="button" onClick={refreshOrders} className="font-bold underline">
                Try again
              </button>
            </div>
          )}
          {!list.data && list.isLoading && (
            <p role="status" className="p-10 text-center text-sm text-gray-500">
              Loading orders…
            </p>
          )}
          {list.data?.orders.length === 0 && (
            <div className="p-10 text-center">
              <Package size={35} aria-hidden="true" className="mx-auto mb-3 text-orange-500" />
              <p className="font-bold text-petko-blue">No orders found</p>
              <p className="mt-1 text-sm text-gray-500">
                {status || issuesOnly
                  ? 'Try another status or clear the delivery review filter.'
                  : 'New customer orders will appear here.'}
              </p>
            </div>
          )}
          {list.data && list.data.orders.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {list.data.orders.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    aria-pressed={selected === order.id}
                    onClick={() =>
                      setParams((current) => {
                        current.set('order', order.id)
                        return current
                      })
                    }
                    className={`grid w-full gap-3 border-l-4 px-4 py-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-petko-blue sm:grid-cols-[1fr_1fr_auto] sm:items-center ${
                      selected === order.id
                        ? 'border-petko-blue bg-blue-50/70'
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-petko-blue">{orderNumber(order.id)}</p>
                      <p className="mt-1 text-xs text-gray-500">{formatOrderDate(order.created_at)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-800">
                        {order.shipping?.full_name ?? 'Existing customer order'}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {order.shipping?.email ?? 'Contact information unavailable'}
                      </p>
                    </div>
                    <div className="space-y-2 sm:text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {formatOrderMoney(order.total_amount)}
                      </p>
                      <OrderStatusBadge order={order} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {list.data && (
            <nav
              aria-label="Admin order pages"
              className="flex items-center justify-between gap-3 border-t border-gray-200 p-4 text-xs"
            >
              <button
                type="button"
                onClick={() => changePage(page - 1)}
                disabled={page <= 1 || list.isLoading}
                className="rounded-lg border border-gray-300 px-3 py-2 font-semibold disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-gray-500">
                Page {page} of {Math.max(1, Math.ceil(list.data.total / list.data.limit))}
              </span>
              <button
                type="button"
                onClick={() => changePage(page + 1)}
                disabled={page * list.data.limit >= list.data.total || list.isLoading}
                className="rounded-lg border border-gray-300 px-3 py-2 font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          )}
        </section>

      </div>

      {selected && (
        <div className="mt-6">
          <AdminOrder
            key={`${selected}:${refreshToken}`}
            id={selected}
            onUpdated={list.refresh}
          />
        </div>
      )}
    </div>
  )
}