import {
  Check,
  CheckCircle2,
  ClipboardList,
  Package,
  Truck,
} from 'lucide-react'
import type { OrderDetail } from '@/lib/order-types'
import { formatOrderDate, ORDER_STEPS } from '@/lib/order-status'

const STEP_ICONS = [Package, ClipboardList, Package, Truck, CheckCircle2]

export default function OrderProgress({ order }: { order: OrderDetail }) {
  const current = ORDER_STEPS.findIndex(
    (step) => step.status === order.fulfillment_status,
  )
  if (order.fulfillment_status === 'cancelled') {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        This order was cancelled before shipment.
      </p>
    )
  }
  return (
    <ol
      aria-label="Order progress"
      className="grid gap-4 sm:grid-cols-5 sm:gap-2"
    >
      {ORDER_STEPS.map((step, index) => {
        const isCurrent = index === current
        const isDone =
          index < current || (isCurrent && Boolean(order.delivery_confirmed_at))
        const Icon = STEP_ICONS[index]
        const event = order.events.find(
          (item) =>
            item.to_status === step.status &&
            (item.event_type === 'status_changed' ||
              item.event_type === 'order_placed'),
        )
        const date =
          step.status === 'placed' ? order.created_at : event?.created_at
        return (
          <li
            key={step.status}
            aria-current={isCurrent ? 'step' : undefined}
            className="relative flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2"
          >
            <div
              className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 ${isDone ? 'border-green-600 bg-green-600 text-white' : isCurrent ? 'border-petko-gold bg-orange-50 text-orange-800' : 'border-gray-200 bg-white text-gray-400'}`}
            >
              {isDone ? (
                <Check size={19} aria-hidden="true" />
              ) : (
                <Icon size={19} aria-hidden="true" />
              )}
            </div>
            {index < ORDER_STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute left-5 top-10 h-5 w-0.5 sm:left-10 sm:right-0 sm:top-5 sm:h-0.5 sm:w-auto ${index < current ? 'bg-green-600' : 'bg-gray-200'}`}
              />
            )}
            <div className="min-w-0">
              <p
                className={`text-xs font-bold ${index <= current ? 'text-petko-blue' : 'text-gray-500'}`}
              >
                {step.label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                {date
                  ? formatOrderDate(date)
                  : index < current
                    ? 'Time unavailable'
                    : isCurrent
                      ? 'Current step'
                      : 'Upcoming'}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
