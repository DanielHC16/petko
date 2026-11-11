import { useState } from 'react'
import { Truck } from 'lucide-react'
import OrderDetailCard from '@/components/orders/order-detail'
import OrderActionDialog from '@/components/orders/order-action-dialog'
import { useOrderDetail, useOrderMutation } from '@/hooks/use-orders'
import { fulfillmentLabel, nextFulfillmentStatus } from '@/lib/order-status'
import type { AdminFulfillmentStatus } from '@/lib/order-types'

export default function AdminOrder({
  id,
  onUpdated,
}: {
  id: string
  onUpdated: () => void
}) {
  const detail = useOrderDetail(id, true)
  const [action, setAction] = useState<
    AdminFulfillmentStatus | 'resolve' | null
  >(null)
  const [courier, setCourier] = useState('')
  const [tracking, setTracking] = useState('')
  const mutation = useOrderMutation(() => {
    detail.refresh()
    onUpdated()
  }, detail.refresh)
  const order = detail.data
  if (!order)
    return detail.error ? (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
      >
        {detail.error}{' '}
        <button onClick={detail.refresh} className="font-bold underline">
          Try again
        </button>
      </div>
    ) : (
      <p
        role="status"
        className="rounded-2xl bg-white p-8 text-center text-sm text-gray-600"
      >
        Loading order details…
      </p>
    )
  const next = nextFulfillmentStatus(order)
  const canCancel =
    order.fulfillment_status === 'placed' ||
    order.fulfillment_status === 'processing'
  const openIssue = order.delivery_issue && !order.delivery_issue.resolved_at
  const terminal =
    order.fulfillment_status === 'cancelled' ||
    Boolean(order.delivery_confirmed_at)
  function openAction(value: AdminFulfillmentStatus | 'resolve'): void {
    mutation.clearError()
    setAction(value)
  }

  return (
    <>
      {detail.error && (
        <p
          role="alert"
          className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {detail.error}{' '}
          <button onClick={detail.refresh} className="font-bold underline">
            Refresh details
          </button>
        </p>
      )}
      <OrderDetailCard order={order} audience="admin">
        {!terminal && (
          <section
            className="rounded-xl border border-blue-200 bg-blue-50/70 p-4"
            aria-label="Admin fulfillment controls"
          >
            <h3 className="flex items-center gap-2 text-sm font-bold text-petko-blue">
              <Truck size={17} aria-hidden="true" />
              Update fulfillment
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              Advance one step at a time. The customer must confirm receipt to
              complete the order.
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
                    placeholder={order.courier_name ?? 'Courier name'}
                    maxLength={100}
                    onChange={(event) => setCourier(event.target.value)}
                    disabled={mutation.isPending}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-petko-blue focus:outline-none focus:ring-2 focus:ring-petko-blue/20"
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
                    placeholder={order.tracking_number ?? 'Tracking reference'}
                    maxLength={100}
                    onChange={(event) => setTracking(event.target.value)}
                    disabled={mutation.isPending}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-petko-blue focus:outline-none focus:ring-2 focus:ring-petko-blue/20"
                  />
                </div>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              {next && (
                <button
                  type="button"
                  onClick={() => openAction(next)}
                  disabled={mutation.isPending || detail.isLoading}
                  className="rounded-xl bg-petko-blue px-4 py-2.5 text-sm font-bold text-white hover:bg-petko-blue-dark disabled:opacity-50"
                >
                  Mark as {fulfillmentLabel(next).toLowerCase()}
                </button>
              )}
              {openIssue && (
                <button
                  type="button"
                  onClick={() => openAction('resolve')}
                  disabled={mutation.isPending || detail.isLoading}
                  className="rounded-xl border border-orange-300 bg-white px-4 py-2.5 text-sm font-semibold text-orange-900 hover:bg-orange-50 disabled:opacity-50"
                >
                  Resolve delivery issue
                </button>
              )}
              {canCancel && (
                <button
                  type="button"
                  onClick={() => openAction('cancelled')}
                  disabled={mutation.isPending || detail.isLoading}
                  className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Cancel order
                </button>
              )}
            </div>
            {order.fulfillment_status === 'delivered' && (
              <p className="mt-3 text-sm font-medium text-orange-900">
                Awaiting customer receipt confirmation. Admins cannot complete
                this step.
              </p>
            )}
          </section>
        )}
      </OrderDetailCard>
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
              ? 'Explain how you addressed the report. This clears the review flag; it does not confirm receipt or complete the order.'
              : action === 'cancelled'
                ? 'This order will be cancelled and its reserved stock returned. This action cannot be undone.'
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
          noteLabel={
            action === 'resolve' ? 'How was the issue addressed?' : undefined
          }
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
                    ...(tracking.trim()
                      ? { tracking_number: tracking.trim() }
                      : {}),
                  },
            )
          }
        />
      )}
    </>
  )
}
