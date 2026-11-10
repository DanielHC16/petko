import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, MapPin, Package, Truck } from 'lucide-react'
import type { OrderDetail, OrderSummary } from '@/lib/order-types'
import {
  formatOrderDate,
  formatOrderMoney,
  orderEventLabel,
  orderLabel,
  orderNumber,
} from '@/lib/order-status'
import OrderProgress from './order-progress'

export function OrderStatusBadge({ order }: { order: OrderSummary }) {
  const color = order.delivery_confirmed_at
    ? 'bg-green-100 text-green-800'
    : order.fulfillment_status === 'cancelled'
      ? 'bg-red-100 text-red-800'
      : order.delivery_issue && !order.delivery_issue.resolved_at
        ? 'bg-red-100 text-red-800'
        : 'bg-orange-100 text-orange-900'
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${color}`}
    >
      {orderLabel(order)}
    </span>
  )
}

export default function OrderDetailCard({
  order,
  children,
  audience = 'customer',
}: {
  order: OrderDetail
  children?: ReactNode
  audience?: 'customer' | 'admin'
}) {
  const issue = order.delivery_issue
  return (
    <article
      className="min-w-0 overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm"
      aria-label={`Order ${orderNumber(order.id)} details`}
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-orange-100 bg-orange-50/60 p-5 sm:p-6">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold text-gray-500">
            {audience === 'admin'
              ? 'CUSTOMER ORDER'
              : 'YOUR PET’S NEXT DELIVERY'}
          </p>
          <h2 className="font-display text-xl font-extrabold text-petko-blue sm:text-2xl">
            Order {orderNumber(order.id)}
          </h2>
          <p className="mt-1 text-xs text-gray-600">
            Placed {formatOrderDate(order.created_at)} · Philippine time
          </p>
        </div>
        <OrderStatusBadge order={order} />
      </header>

      <div className="space-y-6 p-5 sm:p-6">
        <section aria-label="Fulfillment progress">
          <h3 className="mb-5 text-base font-bold text-petko-blue">
            Order progress
          </h3>
          <OrderProgress order={order} />
          {order.delivery_confirmed_at ? (
            <p className="mt-5 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              <CheckCircle2
                size={19}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <span>
                Receipt confirmed on{' '}
                {formatOrderDate(order.delivery_confirmed_at)}. Thank you for
                shopping with Petko!
              </span>
            </p>
          ) : order.fulfillment_status === 'delivered' ? (
            <p className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
              {audience === 'admin'
                ? 'Delivery has been reported. This order stays incomplete until the customer confirms receipt.'
                : 'The admin has reported this order delivered. It will stay incomplete until you confirm you have received it.'}
            </p>
          ) : null}
        </section>

        {issue && (
          <section
            className={`rounded-xl border p-4 ${issue.resolved_at ? 'border-gray-200 bg-gray-50' : 'border-red-200 bg-red-50'}`}
            aria-label="Delivery issue"
          >
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <AlertCircle size={17} aria-hidden="true" />
              {issue.resolved_at
                ? 'Delivery issue reviewed'
                : 'Delivery issue — awaiting admin review'}
            </h3>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700">
              {issue.message}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Reported {formatOrderDate(issue.reported_at)}
            </p>
            {issue.resolution && (
              <p className="mt-3 whitespace-pre-wrap break-words border-t border-gray-200 pt-3 text-sm text-gray-700">
                <strong>Resolution:</strong> {issue.resolution}
              </p>
            )}
            {issue.resolved_at && (
              <p className="mt-1 text-xs text-gray-500">
                Reviewed {formatOrderDate(issue.resolved_at)}.
                {!order.delivery_confirmed_at &&
                  ' Receipt confirmation is still the customer’s decision.'}
              </p>
            )}
          </section>
        )}

        {children}

        <div className="grid gap-6 border-t border-orange-100 pt-6 lg:grid-cols-2">
          <section className="min-w-0">
            <h3 className="mb-4 text-base font-bold text-petko-blue">
              Items in this order
            </h3>
            <ul className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 py-3 first:pt-0"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-orange-100 bg-petko-cream">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package
                        size={24}
                        className="text-petko-blue"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-gray-800">
                      {item.product_name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Qty {item.quantity} × {formatOrderMoney(item.unit_price)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-petko-blue">
                    {formatOrderMoney(item.unit_price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 rounded-xl bg-orange-50 p-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-600">Subtotal</dt>
                <dd>{formatOrderMoney(order.subtotal_amount)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-600">Shipping</dt>
                <dd>
                  {order.shipping_fee === 0
                    ? 'Free'
                    : formatOrderMoney(order.shipping_fee)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-orange-200 pt-3 font-bold text-petko-blue">
                <dt>Total amount</dt>
                <dd>{formatOrderMoney(order.total_amount)}</dd>
              </div>
              <div className="pt-1 text-xs text-gray-600">
                {order.payment_method === 'cod'
                  ? 'Cash on Delivery — pay when you receive your order.'
                  : 'Payment details unavailable for this existing order.'}
              </div>
            </dl>
          </section>

          <div className="min-w-0 space-y-6">
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-petko-blue">
                <MapPin size={18} aria-hidden="true" />
                Shipping address
              </h3>
              {order.shipping ? (
                <address className="space-y-1 break-words text-sm not-italic text-gray-600">
                  <p className="font-bold text-gray-900">
                    {order.shipping.full_name}
                  </p>
                  <p>{order.shipping.address_line1}</p>
                  {order.shipping.address_line2 && (
                    <p>{order.shipping.address_line2}</p>
                  )}
                  <p>
                    {order.shipping.city}, {order.shipping.province}{' '}
                    {order.shipping.postal_code}
                  </p>
                  <p>Philippines</p>
                  <p className="pt-2">{order.shipping.phone}</p>
                  <p>{order.shipping.email}</p>
                </address>
              ) : (
                <p className="text-sm text-gray-500">
                  Address unavailable for this existing order.
                </p>
              )}
            </section>
            <section>
              <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-petko-blue">
                <Truck size={18} aria-hidden="true" />
                Delivery details
              </h3>
              <p className="text-sm text-gray-600">
                {order.delivery_method === 'express'
                  ? 'Express delivery'
                  : order.delivery_method === 'standard'
                    ? 'Standard delivery'
                    : 'Delivery method unavailable'}
              </p>
              {order.courier_name && (
                <p className="mt-1 break-words text-sm text-gray-600">
                  Courier: {order.courier_name}
                </p>
              )}
              {order.tracking_number && (
                <p className="mt-1 break-all text-sm text-gray-600">
                  Tracking number:{' '}
                  <span className="font-semibold text-gray-900">
                    {order.tracking_number}
                  </span>
                </p>
              )}
            </section>
          </div>
        </div>

        <details className="border-t border-orange-100 pt-4">
          <summary className="cursor-pointer rounded text-sm font-bold text-petko-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petko-blue">
            Order activity ({order.events.length})
          </summary>
          <ol className="mt-4 space-y-4 border-l-2 border-orange-200 pl-4">
            {[...order.events]
              .sort((a, b) => b.version - a.version)
              .map((event) => (
                <li key={event.id}>
                  <p className="text-sm font-semibold text-gray-800">
                    {orderEventLabel(event)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatOrderDate(event.created_at)} ·{' '}
                    {event.actor_role === 'system'
                      ? 'System'
                      : event.actor_role === 'admin'
                        ? 'Admin'
                        : 'Customer'}
                  </p>
                  {event.note && (
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-600">
                      {event.note}
                    </p>
                  )}
                </li>
              ))}
          </ol>
        </details>
      </div>
    </article>
  )
}
