import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Package, RefreshCw, ArrowLeft, XCircle } from 'lucide-react'
import OrderDetailCard, { OrderStatusBadge } from '@/components/orders/order-detail'
import OrderActionDialog from '@/components/orders/order-action-dialog'
import { useOrderDetail, useOrderList, useOrderMutation } from '@/hooks/use-orders'
import { formatOrderDate, formatOrderMoney, orderNumber } from '@/lib/order-status'
import PageBanner from '@/components/layout/PageBanner'
import type { OrderDetail } from '@/lib/order-types'
import OrderProductReviews from '@/features/reviews/order-product-reviews'
import DeliveryReviewModal from '@/features/reviews/delivery-review-modal'

function OrderListSkeleton() {
  return (
    <section
      role="status"
      aria-label="Loading your orders"
      className="rounded-2xl border border-orange-200/80 bg-white/90 p-4 shadow-sm sm:p-5"
    >
      <span className="sr-only">Loading your orders…</span>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="h-4 w-32 animate-pulse rounded-md bg-orange-100/90" />
        <div className="h-3.5 w-44 animate-pulse rounded-md bg-orange-100/60" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="flex flex-col justify-between rounded-xl border border-orange-100 bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="h-4 w-28 animate-pulse rounded bg-orange-100/80" />
              <div className="h-4 w-16 shrink-0 animate-pulse rounded bg-orange-100/80" />
            </div>
            <div className="my-3 h-3 w-36 animate-pulse rounded bg-orange-100/50" />
            <div className="h-6 w-24 animate-pulse rounded-full bg-orange-100/70" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <div className="h-8 w-20 animate-pulse rounded-lg bg-orange-100/60" />
        <div className="h-4 w-24 animate-pulse rounded bg-orange-100/50" />
        <div className="h-8 w-16 animate-pulse rounded-lg bg-orange-100/60" />
      </div>
    </section>
  )
}

function OrderDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading order details"
      className="space-y-6 rounded-2xl border border-orange-200/80 bg-[#FFF8EA] p-4 shadow-sm sm:p-6 lg:p-8"
    >
      <span className="sr-only">Loading order details…</span>

      {/* Top 3-column summary skeleton */}
      <div className="grid grid-cols-1 gap-6 border-b border-orange-200/60 pb-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8 lg:pb-8">
        <div className="flex min-w-0 gap-4 lg:border-r lg:border-orange-200/60 lg:pr-6">
          <div className="h-28 w-20 shrink-0 animate-pulse rounded-xl bg-orange-200/50 sm:h-32 sm:w-24" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="h-6 w-3/4 animate-pulse rounded-lg bg-orange-200/60" />
            <div className="h-3.5 w-1/2 animate-pulse rounded bg-orange-200/40" />
            <div className="h-6 w-24 animate-pulse rounded-full bg-orange-200/50" />
            <div className="h-3.5 w-5/6 animate-pulse rounded bg-orange-200/40" />
            <div className="h-9 w-28 animate-pulse rounded-lg bg-orange-200/60" />
          </div>
        </div>

        <div className="min-w-0 space-y-2.5 lg:border-r lg:border-orange-200/60 lg:px-4">
          <div className="mb-3 h-5 w-36 animate-pulse rounded bg-orange-200/60" />
          <div className="h-4 w-32 animate-pulse rounded bg-orange-200/50" />
          <div className="h-3.5 w-48 animate-pulse rounded bg-orange-200/40" />
          <div className="h-3.5 w-40 animate-pulse rounded bg-orange-200/40" />
          <div className="h-3.5 w-28 animate-pulse rounded bg-orange-200/40" />
        </div>

        <div className="min-w-0 md:col-span-2 lg:col-span-1 lg:pl-2">
          <div className="h-36 w-full max-w-xs animate-pulse rounded-xl bg-orange-200/50 p-5" />
        </div>
      </div>

      {/* Bottom progress & summary skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <div className="h-6 w-36 animate-pulse rounded bg-orange-200/60" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex flex-col items-center space-y-2">
                <div className="h-12 w-12 animate-pulse rounded-xl bg-orange-200/60" />
                <div className="h-3.5 w-16 animate-pulse rounded bg-orange-200/50" />
                <div className="h-2.5 w-12 animate-pulse rounded bg-orange-200/40" />
              </div>
            ))}
          </div>
          <div className="h-11 w-full animate-pulse rounded-xl bg-orange-200/40" />
        </div>

        <div className="min-w-0 space-y-4 rounded-xl border border-orange-100 bg-[#fcf8f2] p-5">
          <div className="h-5 w-32 animate-pulse rounded bg-orange-200/60" />
          <div className="space-y-3 pt-2">
            <div className="flex justify-between gap-2">
              <div className="h-3.5 w-24 animate-pulse rounded bg-orange-200/40" />
              <div className="h-3.5 w-16 animate-pulse rounded bg-orange-200/50" />
            </div>
            <div className="flex justify-between gap-2">
              <div className="h-3.5 w-20 animate-pulse rounded bg-orange-200/40" />
              <div className="h-3.5 w-12 animate-pulse rounded bg-orange-200/50" />
            </div>
            <div className="flex justify-between gap-2 border-t border-orange-200/50 pt-3">
              <div className="h-5 w-28 animate-pulse rounded bg-orange-200/60" />
              <div className="h-6 w-20 animate-pulse rounded bg-orange-200/70" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CustomerOrder({ id, onUpdated }: { id: string; onUpdated: () => void }) {
  const detail = useOrderDetail(id)
  const [dialog, setDialog] = useState<'confirm' | 'report' | 'cancel' | null>(null)
  const [reviewPromptOrder, setReviewPromptOrder] = useState<OrderDetail | null>(null)
  const mutation = useOrderMutation(() => {
    detail.refresh()
    onUpdated()
  }, detail.refresh)
  const order = detail.data
  const canConfirm =
    order?.fulfillment_status === 'delivered' && !order.delivery_confirmed_at
  const canCancel =
    (order?.fulfillment_status === 'placed' || order?.fulfillment_status === 'processing') &&
    !order.delivery_confirmed_at
  const hasOpenIssue = Boolean(
    order?.delivery_issue && !order.delivery_issue.resolved_at,
  )

  if (!order)
    return detail.error ? (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-800 shadow-sm sm:p-6"
      >
        <p className="break-words">{detail.error}</p>
        <button
          type="button"
          onClick={detail.refresh}
          className="mt-3 font-bold underline hover:text-red-950"
        >
          Try loading this order again
        </button>
      </div>
    ) : (
      <OrderDetailSkeleton />
    )

  return (
    <div className="min-w-0">
      {detail.error && (
        <p
          role="alert"
          className="mb-3 break-words rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {detail.error} The last loaded details are shown below.{' '}
          <button
            type="button"
            onClick={detail.refresh}
            className="font-bold underline hover:text-red-950"
          >
            Refresh
          </button>
        </p>
      )}
      <div className="min-w-0 overflow-hidden">
        <OrderDetailCard order={order}>
          {canConfirm && (
            <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50/60 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <p className="min-w-0 text-sm text-gray-700">
                <span className="block truncate font-semibold text-gray-800">
                  Have your pet's goodies arrived?
                </span>
                <span className="mt-0.5 block truncate text-xs text-gray-500">
                  Confirm only after you have received this order.
                </span>
              </p>
              <div className="flex w-full shrink-0 flex-col gap-2 xs:flex-row sm:w-auto sm:flex-wrap">
                <button
                  type="button"
                  disabled={mutation.isPending || detail.isLoading}
                  onClick={() => {
                    mutation.clearError()
                    setDialog('confirm')
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 truncate rounded-xl bg-petko-blue px-4 py-2.5 text-sm font-bold text-white transition hover:bg-petko-blue-dark disabled:opacity-50 sm:w-auto"
                >
                  <CheckCircle2 size={17} className="shrink-0" />
                  <span className="truncate">Confirm received</span>
                </button>
                {!hasOpenIssue && (
                  <button
                    type="button"
                    disabled={mutation.isPending || detail.isLoading}
                    onClick={() => {
                      mutation.clearError()
                      setDialog('report')
                    }}
                    className="w-full truncate rounded-xl border border-orange-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-orange-900 transition hover:bg-orange-100 disabled:opacity-50 sm:w-auto"
                  >
                    I haven't received it
                  </button>
                )}
              </div>
            </div>
          )}
          {canCancel && (
            <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50/60 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="min-w-0">
                <p className="block truncate text-sm font-semibold text-gray-800">
                  Need to cancel this order?
                </p>
                <p className="mt-0.5 block truncate text-xs text-gray-500">
                  You can cancel your order while it is still being prepared.
                </p>
              </div>
              <div className="shrink-0">
                <button
                  type="button"
                  disabled={mutation.isPending || detail.isLoading}
                  onClick={() => {
                    mutation.clearError()
                    setDialog('cancel')
                  }}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-center text-sm font-bold text-red-600 shadow-sm transition hover:bg-red-50 hover:border-red-400 disabled:opacity-50 sm:w-auto"
                >
                  <XCircle size={16} />
                  <span>Cancel order</span>
                </button>
              </div>
            </div>
          )}
        </OrderDetailCard>
      </div>
      <OrderProductReviews key={order.id} order={order} />
      {dialog && (
        <OrderActionDialog
          key={dialog}
          title={
            dialog === 'confirm'
              ? 'Confirm you received your order'
              : dialog === 'cancel'
                ? 'Cancel your order'
                : 'Report a delivery issue'
          }
          description={
            dialog === 'confirm'
              ? 'This will complete your order and record your receipt confirmation. Confirm only if the package is with you.'
              : dialog === 'cancel'
                ? 'Are you sure you want to cancel this order? Any reserved items will be returned to stock.'
                : 'Tell the admin what happened. Your order will stay incomplete while the admin reviews your report.'
          }
          confirmLabel={
            dialog === 'confirm'
              ? 'Yes, I received it'
              : dialog === 'cancel'
                ? 'Yes, cancel order'
                : 'Send delivery report'
          }
          confirmVariant={dialog === 'cancel' ? 'danger' : 'primary'}
          noteLabel={
            dialog === 'report'
              ? 'What happened?'
              : dialog === 'cancel'
                ? 'Reason for cancellation (optional)'
                : undefined
          }
          noteRequired={dialog === 'report'}
          isPending={mutation.isPending}
          error={mutation.error}
          onClose={() => setDialog(null)}
          onSubmit={async (note) => {
            const isConfirming = dialog === 'confirm'
            const success = await mutation.mutate(
              order,
              isConfirming
                ? { type: 'confirm' }
                : dialog === 'cancel'
                  ? { type: 'cancel', reason: note || undefined }
                  : { type: 'report', message: note },
            )
            if (success && isConfirming) {
              setReviewPromptOrder(order)
            }
            return success
          }}
        />
      )}
      {reviewPromptOrder && (
        <DeliveryReviewModal
          order={reviewPromptOrder}
          onClose={() => setReviewPromptOrder(null)}
        />
      )}
    </div>
  )
}

/**
 * Computes responsive grid column spans so any partial bottom row
 * stretches to fill 100% of the container width without leaving empty gaps.
 */
function getOrderCardSpanClass(index: number, count: number): string {
  const classes: string[] = []

  // Tablet (sm: 2 columns): if odd number of items, the last item spans full 2 columns
  if (count % 2 === 1 && index === count - 1) {
    classes.push('sm:col-span-2')
  } else {
    classes.push('sm:col-span-1')
  }

  // Desktop (lg: 3 columns):
  // - If 1 item left in the last row (e.g. 1 or 4 items), last item spans all 3 columns
  // - If 2 items left in the last row (e.g. 2 or 5 items), the last item spans 2 columns so the row fills all 3 columns
  const lgRemainder = count % 3
  if (lgRemainder === 1 && index === count - 1) {
    classes.push('lg:col-span-3')
  } else if (lgRemainder === 2 && index === count - 1) {
    classes.push('lg:col-span-2')
  } else {
    classes.push('lg:col-span-1')
  }

  return classes.join(' ')
}

export default function OrdersPage() {
  const [params, setParams] = useSearchParams()
  const [refreshToken, setRefreshToken] = useState(0)
  const pageValue = Number(params.get('page') ?? '1')
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1
  // Limit set to 6 to form a complete 2-row x 3-column (or 3-row x 2-column) matrix
  const list = useOrderList({ page, limit: 6 })
  const selectedId = params.get('order') || list.data?.orders[0]?.id || null

  function selectOrder(id: string): void {
    setParams((current) => {
      current.set('order', id)
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

  const totalPages = list.data
    ? Math.max(1, Math.ceil(list.data.total / list.data.limit))
    : 1

  const ordersCount = list.data?.orders.length ?? 0

  return (
    <div
      className="min-h-screen w-full bg-petko-cream p-6 font-sans lg:p-10"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      {/* Shared checkout-style banner */}
      <PageBanner
        title="Your Orders"
        subtitle="Track your companion's order from our warehouse to your home."
      />

      <div className="mx-auto max-w-6xl space-y-5 px-3 pt-4 sm:space-y-6 sm:px-6 sm:pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* ── Back to Products / Storefront Button Bar ────────────────────── */}
          <div className="justify-self-start">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#10298E] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0B3B8C] active:scale-95 sm:px-3"
            >
              <ArrowLeft size={13} />
              <span>
                Back<span className="hidden sm:inline"> to Storefront</span>
              </span>
            </Link>
          </div>

          <button
            type="button"
            onClick={refreshOrders}
            disabled={list.isLoading}
            className="ml-auto inline-flex max-w-full items-center justify-center gap-2 truncate rounded-xl border border-orange-200 bg-white px-3.5 py-2 text-xs font-bold text-petko-blue shadow-sm transition hover:bg-orange-50 disabled:opacity-50 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <RefreshCw
              size={16}
              className={`shrink-0 ${
                list.isLoading ? 'animate-spin motion-reduce:animate-none' : ''
              }`}
            />
            <span className="truncate">Refresh orders</span>
          </button>
        </div>

        {list.error && (
          <div
            role="alert"
            className="break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm"
          >
            {list.error}{' '}
            <button
              type="button"
              onClick={refreshOrders}
              className="font-bold underline hover:text-red-950"
            >
              Try again
            </button>
          </div>
        )}

        {!list.data && list.isLoading && (
          <>
            <OrderListSkeleton />
            <OrderDetailSkeleton />
          </>
        )}

        {list.data && list.data.orders.length === 0 && (
          <div className="rounded-2xl border border-orange-200 bg-white px-4 py-10 text-center shadow-sm sm:px-6 sm:py-12">
            <Package
              size={40}
              className="mx-auto mb-4 text-petko-gold"
              aria-hidden="true"
            />
            <h2 className="truncate text-lg font-extrabold text-petko-blue sm:text-xl">
              {page > 1
                ? 'No orders on this page'
                : 'Your first delivery starts here'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs text-gray-500 sm:text-sm">
              {page > 1
                ? 'Head back to see your recent orders.'
                : 'Once you place an order, you can follow every step here.'}
            </p>
            {page > 1 ? (
              <button
                type="button"
                onClick={() => changePage(page - 1)}
                className="mt-5 inline-flex max-w-full items-center justify-center truncate rounded-xl bg-petko-blue px-5 py-2.5 text-sm font-bold text-white transition hover:bg-petko-blue-dark"
              >
                Previous page
              </button>
            ) : (
              <Link
                to="/"
                className="mt-5 inline-flex max-w-full items-center justify-center truncate rounded-xl bg-petko-blue px-5 py-2.5 text-sm font-bold text-white transition hover:bg-petko-blue-dark"
              >
                Browse pet essentials
              </Link>
            )}
          </div>
        )}

        {list.data && list.data.orders.length > 0 && (
          <section
            aria-label="Your order list"
            className="rounded-2xl border border-orange-200 bg-white p-3.5 shadow-sm sm:p-5"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="min-w-0 truncate text-sm font-extrabold text-petko-blue sm:text-base">
                Your orders ({list.data.total})
              </h2>
              <p className="truncate text-xs text-gray-500">
                Choose an order to see its progress
              </p>
            </div>

            <div
              className={`grid grid-cols-1 gap-2.5 sm:gap-3 ${
                ordersCount === 1
                  ? 'sm:grid-cols-1 lg:grid-cols-1'
                  : ordersCount === 2
                    ? 'sm:grid-cols-2 lg:grid-cols-2'
                    : ordersCount === 4
                      ? 'sm:grid-cols-2 lg:grid-cols-2'
                      : 'sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {list.data.orders.map((order, idx) => {
                // Only apply remainder span logic when using the 3-column desktop grid (ordersCount !== 1, 2, 4)
                const spanClass =
                  ordersCount === 1 || ordersCount === 2 || ordersCount === 4
                    ? ''
                    : getOrderCardSpanClass(idx, ordersCount)

                return (
                  <button
                    key={order.id}
                    type="button"
                    aria-pressed={selectedId === order.id}
                    onClick={() => selectOrder(order.id)}
                    className={`group flex h-full min-w-0 w-full flex-col justify-between overflow-hidden rounded-xl border p-3.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petko-blue sm:p-4 ${spanClass} ${
                      selectedId === order.id
                        ? 'border-petko-blue bg-blue-50/80 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/30'
                    }`}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span
                        title={orderNumber(order.id)}
                        className="min-w-0 flex-1 truncate text-sm font-extrabold text-petko-blue"
                      >
                        {orderNumber(order.id)}
                      </span>
                      <span className="shrink-0 whitespace-nowrap text-sm font-extrabold text-gray-800">
                        {formatOrderMoney(order.total_amount)}
                      </span>
                    </div>

                    <p
                      title={formatOrderDate(order.created_at)}
                      className="mb-3 mt-1 truncate text-xs text-gray-500"
                    >
                      {formatOrderDate(order.created_at)}
                    </p>

                    <div className="min-w-0 max-w-full overflow-hidden">
                      <OrderStatusBadge order={order} />
                    </div>
                  </button>
                )
              })}
            </div>

            <nav
              aria-label="Order pages"
              className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3.5 text-xs sm:gap-3 sm:pt-4"
            >
              <button
                type="button"
                disabled={page <= 1 || list.isLoading}
                onClick={() => changePage(page - 1)}
                className="truncate rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 sm:py-2"
              >
                Previous
              </button>
              <span className="truncate font-semibold text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={
                  page * list.data.limit >= list.data.total || list.isLoading
                }
                onClick={() => changePage(page + 1)}
                className="truncate rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 sm:py-2"
              >
                Next
              </button>
            </nav>
          </section>
        )}

        {selectedId && (
          <CustomerOrder
            key={`${selectedId}:${refreshToken}`}
            id={selectedId}
            onUpdated={list.refresh}
          />
        )}
      </div>
    </div>
  )
}