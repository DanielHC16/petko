import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Package, RefreshCw } from 'lucide-react'
import { OrderStatusBadge } from '@/components/orders/order-detail'
import { useOrderList } from '@/hooks/use-orders'
import {
  formatOrderDate,
  formatOrderMoney,
  isFulfillmentStatus,
  ORDER_STEPS,
  orderNumber,
} from '@/lib/order-status'
import { PAYMENT_LABELS } from '@/lib/payment-methods'
import AdminOrderModal from './admin-order-detail'
import PageBanner from '@/components/layout/PageBanner'

export default function AdminOrdersPage() {
  const [params, setParams] = useSearchParams()
  const [refreshToken, setRefreshToken] = useState(0)
  const pageValue = Number(params.get('page') ?? '1')
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1
  const rawStatus = params.get('status') ?? ''
  const status = isFulfillmentStatus(rawStatus) ? rawStatus : undefined

  const list = useOrderList(
    {
      page,
      limit: 10,
      fulfillment_status: status,
    },
    true,
  )

  const selectedOrderId = params.get('order') || null

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

  function openOrder(id: string): void {
    setParams((current) => {
      current.set('order', id)
      return current
    })
  }

  function closeOrder(): void {
    setParams((current) => {
      current.delete('order')
      return current
    })
  }

  return (
    <div className="min-h-screen w-full bg-[#ecdab6] p-6 font-sans lg:p-10">
      <div className="space-y-6">
        <PageBanner
          title="Order Management"
          subtitle="Keep deliveries moving, review order details, and manage customer fulfillment."
        >
          <div className="flex items-center justify-between gap-2 border-t border-orange-100 bg-orange-50/60 px-4 py-2.5 sm:px-8">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#10298E] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#0B3B8C] active:scale-95"
            >
              <ArrowLeft size={13} />
              <span>Back to Admin Portal</span>
            </Link>

            <button
              type="button"
              onClick={refreshOrders}
              disabled={list.isLoading}
              title="Refresh orders"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={list.isLoading ? 'animate-spin motion-reduce:animate-none' : ''}
              />
              <span>Refresh orders</span>
            </button>
          </div>
        </PageBanner>

        <section
          className="overflow-hidden rounded-2xl border border-[#e1cba5] bg-white shadow-sm"
          aria-label="Manage order list"
        >
          {/* ── Filter toolbar ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 border-b border-[#e1cba5] bg-[#fdf2e1] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <label
                htmlFor="order-status-filter"
                className="text-xs font-bold uppercase tracking-wider text-gray-700 shrink-0"
              >
                Fulfillment Status
              </label>
              <select
                id="order-status-filter"
                value={status ?? ''}
                onChange={(event) => changeFilter('status', event.target.value)}
                className="rounded-lg border border-[#e1cba5] bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
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

            <div className="text-xs font-bold text-[#10298E]">
              {list.data
                ? `Showing ${list.data.orders.length} of ${list.data.total} orders`
                : 'Loading orders…'}
            </div>
          </div>

          {list.error && (
            <div
              role="alert"
              className="m-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800"
            >
              {list.error}{' '}
              <button
                type="button"
                onClick={refreshOrders}
                className="font-bold underline"
              >
                Try again
              </button>
            </div>
          )}

          {!list.data && list.isLoading && (
            <div role="status" className="p-12 text-center text-sm font-semibold text-petko-blue">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-petko-blue border-t-transparent" />
              Loading customer orders…
            </div>
          )}

          {list.data?.orders.length === 0 && (
            <div className="p-12 text-center">
              <Package size={38} aria-hidden="true" className="mx-auto mb-3 text-orange-400" />
              <p className="font-extrabold text-petko-blue">No orders found</p>
              <p className="mt-1 text-xs text-gray-500">
                {status
                  ? 'Try changing the fulfillment status filter.'
                  : 'New customer orders will appear here.'}
              </p>
            </div>
          )}

          {/* ── Aligned Table Layout ──────────────────────────────────── */}
          {list.data && list.data.orders.length > 0 && (
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Customer orders table">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-[#e1cba5] bg-[#FFFBF5] text-[11px] font-black uppercase tracking-wider text-[#10298E]">
                  <tr>
                    <th scope="col" className="w-48 sm:w-56 px-5 py-3.5">
                      Order ID &amp; Date
                    </th>
                    <th scope="col" className="px-5 py-3.5">
                      Customer Details
                    </th>
                    <th scope="col" className="w-36 sm:w-44 px-5 py-3.5 text-right">
                      Total Amount
                    </th>
                    <th scope="col" className="w-40 sm:w-48 px-5 py-3.5 text-right">
                      Fulfillment Status
                    </th>
                    <th scope="col" className="w-20 px-5 py-3.5 text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e1cba5]/60">
                  {list.data.orders.map((order) => {
                    const isSelected = selectedOrderId === order.id
                    return (
                      <tr
                        key={order.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open details for order ${orderNumber(order.id)}`}
                        onClick={() => openOrder(order.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            openOrder(order.id)
                          }
                        }}
                        className={`group cursor-pointer transition focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-petko-blue ${
                          isSelected
                            ? 'bg-blue-50/80 hover:bg-blue-50'
                            : 'hover:bg-[#fef8e8]'
                        }`}
                      >
                        {/* 1. Order ID & Date */}
                        <td className="w-48 sm:w-56 px-5 py-4 align-top">
                          <p className="font-mono text-sm font-black text-petko-blue group-hover:text-blue-900">
                            {orderNumber(order.id)}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {formatOrderDate(order.created_at)}
                          </p>
                        </td>

                        {/* 2. Customer Details — strictly aligned column */}
                        <td className="min-w-[200px] px-5 py-4 align-top">
                          <p className="truncate text-sm font-bold text-gray-900 group-hover:text-petko-blue">
                            {order.shipping?.full_name ?? 'Customer name unavailable'}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {order.shipping?.email ?? 'No email on record'}
                          </p>
                          {order.shipping?.city && (
                            <p className="mt-0.5 truncate text-[11px] text-gray-400">
                              {order.shipping.city}, {order.shipping.province}
                            </p>
                          )}
                        </td>

                        {/* 3. Total & Payment */}
                        <td className="w-36 sm:w-44 px-5 py-4 text-right align-top">
                          <p className="font-extrabold text-gray-900 tabular-nums">
                            {formatOrderMoney(order.total_amount)}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                            {order.payment_method
                              ? PAYMENT_LABELS[order.payment_method] || order.payment_method.toUpperCase()
                              : 'COD'}
                          </p>
                        </td>

                        {/* 4. Fulfillment Status */}
                        <td className="w-40 sm:w-48 px-5 py-4 text-right align-top">
                          <OrderStatusBadge order={order} />
                        </td>

                        {/* 5. Action indicator */}
                        <td className="w-20 px-5 py-4 text-right align-middle">
                          <span className="inline-flex items-center gap-0.5 text-xs font-bold text-orange-600 transition group-hover:translate-x-0.5 group-hover:text-orange-700">
                            <span>View</span>
                            <ChevronRight size={14} />
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination ────────────────────────────────────────────── */}
          {list.data && list.data.total > 0 && (
            <nav
              aria-label="Admin order pages"
              className="flex items-center justify-between gap-3 border-t border-gray-200 bg-[#FFFBF5]/70 p-4 text-xs"
            >
              <button
                type="button"
                onClick={() => changePage(page - 1)}
                disabled={page <= 1 || list.isLoading}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-semibold text-gray-600">
                Page {page} of {Math.max(1, Math.ceil(list.data.total / list.data.limit))}
              </span>
              <button
                type="button"
                onClick={() => changePage(page + 1)}
                disabled={page * list.data.limit >= list.data.total || list.isLoading}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          )}
        </section>

        {/* ── Order Details Modal ─────────────────────────────────────── */}
        {selectedOrderId && (
          <AdminOrderModal
            key={`${selectedOrderId}:${refreshToken}`}
            id={selectedOrderId}
            onClose={closeOrder}
            onUpdated={refreshOrders}
          />
        )}
      </div>
    </div>
  )
}
