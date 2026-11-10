import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Package, PawPrint, RefreshCw } from 'lucide-react'
import OrderDetailCard, {
  OrderStatusBadge,
} from '@/components/orders/order-detail'
import OrderActionDialog from '@/components/orders/order-action-dialog'
import {
  useOrderDetail,
  useOrderList,
  useOrderMutation,
} from '@/hooks/use-orders'
import {
  formatOrderDate,
  formatOrderMoney,
  orderNumber,
} from '@/lib/order-status'
import pawYellow from '@/assets/paw_yellow.png'
import petOrders from '@/assets/pet_orders.png'

function CustomerOrder({
  id,
  onUpdated,
}: {
  id: string
  onUpdated: () => void
}) {
  const detail = useOrderDetail(id)
  const [dialog, setDialog] = useState<'confirm' | 'report' | null>(null)
  const mutation = useOrderMutation(() => {
    detail.refresh()
    onUpdated()
  }, detail.refresh)
  const order = detail.data
  const canConfirm =
    order?.fulfillment_status === 'delivered' && !order.delivery_confirmed_at
  const hasOpenIssue = Boolean(
    order?.delivery_issue && !order.delivery_issue.resolved_at,
  )

  if (!order)
    return detail.error ? (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-800"
      >
        <p>{detail.error}</p>
        <button
          type="button"
          onClick={detail.refresh}
          className="mt-3 font-bold underline"
        >
          Try loading this order again
        </button>
      </div>
    ) : (
      <p
        role="status"
        className="rounded-2xl border border-orange-200 bg-white p-8 text-center text-sm text-gray-600"
      >
        Loading order details…
      </p>
    )

  return (
    <>
      {detail.error && (
        <p
          role="alert"
          className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {detail.error} The last loaded details are shown below.{' '}
          <button
            type="button"
            onClick={detail.refresh}
            className="font-bold underline"
          >
            Refresh
          </button>
        </p>
      )}
      <OrderDetailCard order={order}>
        {canConfirm && (
          <div className="flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-700">
              Have your pet’s goodies arrived?
              <span className="mt-1 block text-xs text-gray-500">
                Confirm only after you have received this order.
              </span>
            </p>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                disabled={mutation.isPending || detail.isLoading}
                onClick={() => {
                  mutation.clearError()
                  setDialog('confirm')
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-petko-blue px-4 py-2.5 text-sm font-bold text-white hover:bg-petko-blue-dark disabled:opacity-50"
              >
                <CheckCircle2 size={17} />
                Confirm received
              </button>
              {!hasOpenIssue && (
                <button
                  type="button"
                  disabled={mutation.isPending || detail.isLoading}
                  onClick={() => {
                    mutation.clearError()
                    setDialog('report')
                  }}
                  className="rounded-xl border border-orange-300 bg-white px-4 py-2.5 text-sm font-semibold text-orange-900 hover:bg-orange-100 disabled:opacity-50"
                >
                  I haven’t received it
                </button>
              )}
            </div>
          </div>
        )}
      </OrderDetailCard>
      {dialog && (
        <OrderActionDialog
          key={dialog}
          title={
            dialog === 'confirm'
              ? 'Confirm you received your order'
              : 'Report a delivery issue'
          }
          description={
            dialog === 'confirm'
              ? 'This will complete your order and record your receipt confirmation. Confirm only if the package is with you.'
              : 'Tell the admin what happened. Your order will stay incomplete while the admin reviews your report.'
          }
          confirmLabel={
            dialog === 'confirm' ? 'Yes, I received it' : 'Send delivery report'
          }
          noteLabel={dialog === 'report' ? 'What happened?' : undefined}
          isPending={mutation.isPending}
          error={mutation.error}
          onClose={() => setDialog(null)}
          onSubmit={(note) =>
            mutation.mutate(
              order,
              dialog === 'confirm'
                ? { type: 'confirm' }
                : { type: 'report', message: note },
            )
          }
        />
      )}
    </>
  )
}

export default function OrdersPage() {
  const [params, setParams] = useSearchParams()
  const [refreshToken, setRefreshToken] = useState(0)
  const pageValue = Number(params.get('page') ?? '1')
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1
  const list = useOrderList({ page, limit: 5 })
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

  return (
    <div className="min-h-screen bg-[#ecdab6] pb-8 sm:pb-10">
      <header className="relative mb-8 overflow-hidden rounded-b-[2rem] bg-[#fefaf2] shadow-sm">
        <img
          src={pawYellow}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -left-8 -top-8 h-40 w-40 -rotate-12 object-contain opacity-50 sm:h-52 sm:w-52"
        />
        <img
          src={pawYellow}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-10 hidden h-44 w-44 -rotate-[50deg] object-contain opacity-70 md:block"
        />
        <div className="relative mx-auto flex min-h-40 max-w-6xl items-center justify-between gap-4 px-6 py-7 sm:px-8">
          <div className="relative z-10 min-w-0 pl-10 sm:pl-24">
            <h1 className="flex items-center gap-3 font-display text-3xl font-extrabold text-petko-blue sm:text-4xl">
              Your orders{' '}
              <PawPrint size={29} aria-hidden="true" className="shrink-0" />
            </h1>
            <p className="mt-2 max-w-md text-sm font-medium text-gray-700">
              Track your companion’s order from our warehouse to your home.
            </p>
          </div>
          <img
            src={petOrders}
            alt=""
            aria-hidden="true"
            className="pointer-events-none hidden h-36 w-48 shrink-0 object-contain lg:block"
          />
        </div>
      </header>
      <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={refreshOrders}
            disabled={list.isLoading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-petko-blue hover:bg-orange-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                list.isLoading ? 'animate-spin motion-reduce:animate-none' : ''
              }
            />
            Refresh orders
          </button>
        </div>
        {list.error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
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
          <p
            role="status"
            className="rounded-2xl border border-orange-200 bg-white p-10 text-center text-sm text-gray-600"
          >
            Loading your orders…
          </p>
        )}
        {list.data && list.data.orders.length === 0 && (
          <div className="rounded-2xl border border-orange-200 bg-white px-6 py-12 text-center">
            <Package
              size={40}
              className="mx-auto mb-4 text-petko-gold"
              aria-hidden="true"
            />
            <h2 className="font-display text-xl font-bold text-petko-blue">
              {page > 1
                ? 'No orders on this page'
                : 'Your first delivery starts here'}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {page > 1
                ? 'Head back to see your recent orders.'
                : 'Once you place an order, you can follow every step here.'}
            </p>
            {page > 1 ? (
              <button
                onClick={() => changePage(page - 1)}
                className="mt-5 rounded-xl bg-petko-blue px-5 py-2.5 text-sm font-bold text-white"
              >
                Previous page
              </button>
            ) : (
              <Link
                to="/"
                className="mt-5 inline-flex rounded-xl bg-petko-blue px-5 py-2.5 text-sm font-bold text-white"
              >
                Browse pet essentials
              </Link>
            )}
          </div>
        )}
        {list.data && list.data.orders.length > 0 && (
          <section
            aria-label="Your order list"
            className="rounded-2xl border border-orange-200 bg-white p-4 sm:p-5"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-petko-blue">
                Your orders ({list.data.total})
              </h2>
              <p className="text-xs text-gray-500">
                Choose an order to see its progress
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.data.orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  aria-pressed={selectedId === order.id}
                  onClick={() => selectOrder(order.id)}
                  className={`min-w-0 rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petko-blue ${selectedId === order.id ? 'border-petko-blue bg-blue-50' : 'border-gray-200 bg-white hover:border-orange-300'}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-petko-blue">
                      {orderNumber(order.id)}
                    </span>
                    <span className="text-sm font-bold text-gray-800">
                      {formatOrderMoney(order.total_amount)}
                    </span>
                  </div>
                  <p className="mb-3 mt-1 text-xs text-gray-500">
                    {formatOrderDate(order.created_at)}
                  </p>
                  <OrderStatusBadge order={order} />
                </button>
              ))}
            </div>
            <nav
              aria-label="Order pages"
              className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-4 text-xs"
            >
              <button
                type="button"
                disabled={page <= 1 || list.isLoading}
                onClick={() => changePage(page - 1)}
                className="rounded-lg border border-gray-300 px-3 py-2 font-semibold disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-gray-500">
                Page {page} of{' '}
                {Math.max(1, Math.ceil(list.data.total / list.data.limit))}
              </span>
              <button
                type="button"
                disabled={
                  page * list.data.limit >= list.data.total || list.isLoading
                }
                onClick={() => changePage(page + 1)}
                className="rounded-lg border border-gray-300 px-3 py-2 font-semibold disabled:opacity-40"
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
