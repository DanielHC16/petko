import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Mail,
  Package,
  Phone,
  Truck,
  User,
  X,
  XCircle,
} from 'lucide-react'
import OrderActionDialog from '@/components/orders/order-action-dialog'
import { OrderStatusBadge } from '@/components/orders/order-detail'
import OrderProgress from '@/components/orders/order-progress'
import { useOrderDetail, useOrderMutation } from '@/hooks/use-orders'
import {
  formatOrderDate,
  formatOrderMoney,
  fulfillmentLabel,
  nextFulfillmentStatus,
  orderEventLabel,
  orderNumber,
} from '@/lib/order-status'
import { PAYMENT_LABELS } from '@/lib/payment-methods'
import type { AdminFulfillmentStatus } from '@/lib/order-types'

interface AdminOrderModalProps {
  id: string
  onClose: () => void
  onUpdated: () => void
}

export default function AdminOrderModal({
  id,
  onClose,
  onUpdated,
}: AdminOrderModalProps) {
  const detail = useOrderDetail(id, true)
  const backdropRef = useRef<HTMLDivElement>(null)
  const [action, setAction] = useState<AdminFulfillmentStatus | 'resolve' | null>(null)
  const [courier, setCourier] = useState('')
  const [tracking, setTracking] = useState('')

  const mutation = useOrderMutation(() => {
    detail.refresh()
    onUpdated()
  }, detail.refresh)

  const order = detail.data

  // Keyboard shortcut: close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !action && !mutation.isPending) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [action, mutation.isPending, onClose])

  if (!order) {
    return (
      <div
        ref={backdropRef}
        onClick={(e) => {
          if (e.target === backdropRef.current) onClose()
        }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
      >
        <div className="relative w-full max-w-lg rounded-2xl border border-orange-200 bg-white p-8 text-center shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={20} />
          </button>
          {detail.error ? (
            <div role="alert" className="space-y-3">
              <p className="text-sm font-semibold text-red-800">{detail.error}</p>
              <button
                type="button"
                onClick={detail.refresh}
                className="rounded-lg bg-petko-blue px-4 py-2 text-xs font-bold text-white hover:bg-petko-blue-dark"
              >
                Retry loading order
              </button>
            </div>
          ) : (
            <div className="space-y-3" role="status">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-petko-blue border-t-transparent" />
              <p className="text-sm font-semibold text-petko-blue">Loading order details…</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const next = nextFulfillmentStatus(order)
  const canCancel =
    order.fulfillment_status === 'placed' || order.fulfillment_status === 'processing'
  const openIssue = order.delivery_issue && !order.delivery_issue.resolved_at
  const terminal =
    order.fulfillment_status === 'cancelled' || Boolean(order.delivery_confirmed_at)

  function openAction(value: AdminFulfillmentStatus | 'resolve'): void {
    mutation.clearError()
    setAction(value)
  }

  return (
    <>
      <div
        ref={backdropRef}
        onClick={(e) => {
          if (e.target === backdropRef.current) onClose()
        }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-order-modal-title"
      >
        <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-2xl">
          {/* ── Sticky Modal Header ───────────────────────────────────── */}
          <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-orange-100 bg-[#FFFBF5] p-5 sm:px-6">
            <div className="min-w-0">
              <span className="mb-1 inline-block rounded-full border border-orange-200 bg-orange-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-orange-800">
                Order Management Detail
              </span>
              <h2
                id="admin-order-modal-title"
                className="font-display text-xl font-black text-petko-blue sm:text-2xl"
              >
                Order {orderNumber(order.id)}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Placed {formatOrderDate(order.created_at)} · Philippine Time
              </p>
            </div>
            <div className="flex items-center gap-3">
              <OrderStatusBadge order={order} />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close order details"
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-orange-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-petko-blue"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          {/* ── Scrollable Modal Body ─────────────────────────────────── */}
          <div className="space-y-6 overflow-y-auto p-5 sm:p-6">
            {detail.error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
                {detail.error}{' '}
                <button
                  type="button"
                  onClick={detail.refresh}
                  className="font-bold underline"
                >
                  Refresh details
                </button>
              </p>
            )}

            {/* ── Section 1: Customer & Delivery Information Card ───────── */}
            <section
              aria-label="Customer and delivery details"
              className="rounded-2xl border border-orange-200 bg-orange-50/40 p-5 shadow-sm"
            >
              <h3 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-petko-blue">
                <User size={15} className="text-orange-600" />
                Customer &amp; Delivery Details
              </h3>
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Customer Contact */}
                <div className="space-y-2 border-orange-200/70 sm:border-r sm:pr-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Customer Profile
                  </p>
                  <p className="text-base font-extrabold text-gray-900">
                    {order.shipping?.full_name ?? 'Name unavailable'}
                  </p>
                  <p className="flex items-center gap-2 text-xs text-gray-600">
                    <Mail size={13} className="shrink-0 text-gray-400" />
                    <span className="break-all">
                      {order.shipping?.email ?? 'No email on record'}
                    </span>
                  </p>
                  {order.shipping?.phone && (
                    <p className="flex items-center gap-2 text-xs text-gray-600">
                      <Phone size={13} className="shrink-0 text-gray-400" />
                      <span>{order.shipping.phone}</span>
                    </p>
                  )}
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-gray-500">
                      Payment Method:
                    </span>
                    <span className="ml-2 inline-flex items-center rounded-md bg-white border border-orange-200 px-2 py-0.5 text-xs font-bold text-petko-blue">
                      {order.payment_method
                        ? PAYMENT_LABELS[order.payment_method] || order.payment_method.toUpperCase()
                        : 'Cash on Delivery (COD)'}
                    </span>
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Shipping Address
                  </p>
                  {order.shipping ? (
                    <address className="space-y-1 text-sm not-italic text-gray-700">
                      <p className="font-semibold text-gray-900">
                        {order.shipping.address_line1}
                      </p>
                      {order.shipping.address_line2 && (
                        <p className="text-gray-600">{order.shipping.address_line2}</p>
                      )}
                      <p>
                        {order.shipping.city}, {order.shipping.province}{' '}
                        {order.shipping.postal_code}
                      </p>
                      <p className="text-xs font-medium text-gray-500">Philippines</p>
                      <div className="mt-3 flex flex-wrap gap-2 pt-1">
                        <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-petko-blue">
                          <Truck size={13} />
                          {order.delivery_method === 'express'
                            ? 'Express delivery'
                            : 'Standard delivery'}
                        </span>
                        {order.courier_name && (
                          <span className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
                            Courier: {order.courier_name}
                          </span>
                        )}
                        {order.tracking_number && (
                          <span className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1 font-mono text-xs font-semibold text-gray-900">
                            Tracking: {order.tracking_number}
                          </span>
                        )}
                      </div>
                    </address>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Shipping address not available for this record.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ── Section 2: Fulfillment Management Controls (Admin) ──────── */}
            {!terminal && (
              <section
                className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 shadow-sm"
                aria-label="Admin fulfillment controls"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-petko-blue">
                    <Truck size={17} className="text-petko-blue" aria-hidden="true" />
                    Manage Fulfillment Status
                  </h3>
                  {next && (
                    <span className="text-xs font-semibold text-blue-800">
                      Next milestone: <strong className="font-bold uppercase tracking-wide">{fulfillmentLabel(next)}</strong>
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  Advance fulfillment one step at a time. Shipped orders allow setting courier and tracking references.
                </p>

                {next && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`courier-${id}`}
                        className="mb-1 block text-xs font-semibold text-gray-700"
                      >
                        Courier name (optional)
                      </label>
                      <input
                        id={`courier-${id}`}
                        value={courier}
                        placeholder={order.courier_name ?? 'e.g. J&T Express, Lalamove'}
                        maxLength={100}
                        onChange={(event) => setCourier(event.target.value)}
                        disabled={mutation.isPending}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-petko-blue focus:outline-none focus:ring-2 focus:ring-petko-blue/20"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`tracking-${id}`}
                        className="mb-1 block text-xs font-semibold text-gray-700"
                      >
                        Tracking number (optional)
                      </label>
                      <input
                        id={`tracking-${id}`}
                        value={tracking}
                        placeholder={order.tracking_number ?? 'e.g. JT-1234567890'}
                        maxLength={100}
                        onChange={(event) => setTracking(event.target.value)}
                        disabled={mutation.isPending}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-petko-blue focus:outline-none focus:ring-2 focus:ring-petko-blue/20"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {next && (
                    <button
                      type="button"
                      onClick={() => openAction(next)}
                      disabled={mutation.isPending || detail.isLoading}
                      className="rounded-xl bg-petko-blue px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-petko-blue-dark disabled:opacity-50"
                    >
                      Mark as {fulfillmentLabel(next).toLowerCase()}
                    </button>
                  )}
                  {openIssue && (
                    <button
                      type="button"
                      onClick={() => openAction('resolve')}
                      disabled={mutation.isPending || detail.isLoading}
                      className="rounded-xl border border-orange-300 bg-white px-4 py-2 text-sm font-semibold text-orange-900 shadow-sm transition hover:bg-orange-50 disabled:opacity-50"
                    >
                      Resolve delivery issue
                    </button>
                  )}
                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => openAction('cancelled')}
                      disabled={mutation.isPending || detail.isLoading}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-600 shadow-sm transition hover:bg-red-50 hover:border-red-400 disabled:opacity-50"
                    >
                      <XCircle size={15} />
                      <span>Cancel order</span>
                    </button>
                  )}
                </div>

                {order.fulfillment_status === 'delivered' && (
                  <p className="mt-3 text-xs font-medium text-orange-900 bg-orange-100/70 p-2.5 rounded-lg">
                    Awaiting customer receipt confirmation. The customer confirms receipt to mark the order completed.
                  </p>
                )}
              </section>
            )}

            {/* ── Section 3: Order Progress Stepper ─────────────────────── */}
            <section aria-label="Fulfillment progress" className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-petko-blue">
                Fulfillment Milestone Progress
              </h3>
              <OrderProgress order={order} />

              {order.delivery_confirmed_at && (
                <p className="mt-5 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3.5 text-sm font-medium text-green-900">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-700" aria-hidden="true" />
                  <span>
                    Receipt confirmed on {formatOrderDate(order.delivery_confirmed_at)}. Customer verified delivery.
                  </span>
                </p>
              )}
            </section>

            {/* ── Section 4: Delivery Issue Callout (if active) ─────────── */}
            {order.delivery_issue && (
              <section
                className={`rounded-2xl border p-4 ${
                  order.delivery_issue.resolved_at
                    ? 'border-gray-200 bg-gray-50'
                    : 'border-red-200 bg-red-50'
                }`}
                aria-label="Delivery issue report"
              >
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <AlertCircle size={17} className="text-red-600" aria-hidden="true" />
                  {order.delivery_issue.resolved_at
                    ? 'Delivery issue reviewed & resolved'
                    : 'Delivery issue — awaiting admin review'}
                </h3>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700">
                  {order.delivery_issue.message}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Reported {formatOrderDate(order.delivery_issue.reported_at)}
                </p>
                {order.delivery_issue.resolution && (
                  <p className="mt-3 whitespace-pre-wrap break-words border-t border-gray-200 pt-3 text-sm text-gray-700">
                    <strong>Admin Resolution:</strong> {order.delivery_issue.resolution}
                  </p>
                )}
              </section>
            )}

            {/* ── Section 5: Order Items & Pricing Breakdown ────────────── */}
            <section aria-label="Items ordered" className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-petko-blue">
                Items in This Order ({order.items.reduce((sum, item) => sum + item.quantity, 0)})
              </h3>
              <ul className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-4 py-3 first:pt-0">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-orange-100 bg-petko-cream">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package size={22} className="text-petko-blue" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-800 break-words">
                        {item.product_name}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        Qty {item.quantity} × {formatOrderMoney(item.unit_price)}
                      </p>
                    </div>
                    <span className="text-sm font-extrabold text-petko-blue tabular-nums">
                      {formatOrderMoney(item.unit_price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Order Financials */}
              <dl className="mt-4 space-y-2 rounded-xl bg-orange-50/70 p-4 text-sm border border-orange-200/50">
                <div className="flex justify-between gap-3 text-gray-600">
                  <dt>Merchandise Subtotal</dt>
                  <dd className="font-semibold text-gray-900 tabular-nums">
                    {formatOrderMoney(order.subtotal_amount)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 text-gray-600">
                  <dt>Shipping Fee</dt>
                  <dd className="font-semibold text-gray-900 tabular-nums">
                    {order.shipping_fee === 0 ? 'Free' : formatOrderMoney(order.shipping_fee)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-orange-200/80 pt-3 text-base font-black text-petko-blue">
                  <dt>Total Amount</dt>
                  <dd className="tabular-nums">{formatOrderMoney(order.total_amount)}</dd>
                </div>
              </dl>
            </section>

            {/* ── Section 6: Order Activity History ─────────────────────── */}
            <details className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
              <summary className="cursor-pointer text-xs font-black uppercase tracking-wider text-petko-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-petko-blue">
                Audit Timeline &amp; Activity History ({order.events.length})
              </summary>
              <ol className="mt-4 space-y-3.5 border-l-2 border-orange-200 pl-4">
                {[...order.events]
                  .sort((a, b) => b.version - a.version)
                  .map((event) => (
                    <li key={event.id} className="relative">
                      <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-orange-400" />
                      <p className="text-sm font-bold text-gray-800">
                        {orderEventLabel(event)}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {formatOrderDate(event.created_at)} ·{' '}
                        <span className="font-semibold">
                          {event.actor_role === 'system'
                            ? 'System'
                            : event.actor_role === 'admin'
                              ? 'Admin'
                              : 'Customer'}
                        </span>
                      </p>
                      {event.note && (
                        <p className="mt-1 whitespace-pre-wrap break-words text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-200">
                          {event.note}
                        </p>
                      )}
                    </li>
                  ))}
              </ol>
            </details>
          </div>

          {/* ── Sticky Modal Footer ───────────────────────────────────── */}
          <footer className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3.5">
            <span className="text-xs text-gray-500">
              Order Total: <strong className="text-sm font-extrabold text-petko-blue">{formatOrderMoney(order.total_amount)}</strong>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-petko-blue"
            >
              Close
            </button>
          </footer>
        </div>
      </div>

      {/* ── Confirmation Dialog for Admin Actions ───────────────────── */}
      {action && (
        <OrderActionDialog
          key={action}
          title={
            action === 'resolve'
              ? 'Resolve delivery issue'
              : action === 'cancelled'
                ? 'Cancel this order?'
                : `Mark order as ${fulfillmentLabel(action).toLowerCase()}?`
          }
          description={
            action === 'resolve'
              ? 'Explain how you addressed the customer report. This clears the review flag; it does not confirm receipt or complete the order.'
              : action === 'cancelled'
                ? 'This order will be cancelled and all reserved stock restored to inventory. This action cannot be undone.'
                : action === 'delivered'
                  ? 'This reports delivery to the customer and asks them to confirm receipt. The order will stay incomplete until they confirm.'
                  : 'The customer will see this update in their order progress. Make sure the package has reached this stage.'
          }
          confirmLabel={
            action === 'resolve'
              ? 'Save resolution'
              : action === 'cancelled'
                ? 'Yes, cancel order'
                : 'Save progress update'
          }
          confirmVariant={action === 'cancelled' ? 'danger' : 'primary'}
          noteLabel={action === 'resolve' ? 'How was the issue addressed?' : undefined}
          isPending={mutation.isPending}
          error={mutation.error}
          onClose={() => setAction(null)}
          onSubmit={(note) =>
            mutation.mutate(
              order,
              action === 'resolve'
                ? { type: 'resolve', resolution: note }
                : {
                    type: 'fulfillment',
                    status: action,
                    ...(courier.trim() ? { courier_name: courier.trim() } : {}),
                    ...(tracking.trim() ? { tracking_number: tracking.trim() } : {}),
                  },
            )
          }
        />
      )}
    </>
  )
}

// Re-export alias for backward compatibility
export { AdminOrderModal as AdminOrder }
