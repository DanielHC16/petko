import type {
  AdminFulfillmentStatus,
  FulfillmentStatus,
  OrderEvent,
  OrderSummary,
} from './order-types'

export const ORDER_STEPS: readonly {
  status: Exclude<FulfillmentStatus, 'cancelled'>
  label: string
}[] = [
  { status: 'placed', label: 'Order placed' },
  { status: 'processing', label: 'Processing' },
  { status: 'shipped', label: 'Shipped' },
  { status: 'out_for_delivery', label: 'Out for delivery' },
  { status: 'delivered', label: 'Delivered' },
]

export function isFulfillmentStatus(value: string): value is FulfillmentStatus {
  return (
    value === 'cancelled' || ORDER_STEPS.some((step) => step.status === value)
  )
}

export function fulfillmentLabel(status: FulfillmentStatus): string {
  return (
    ORDER_STEPS.find((step) => step.status === status)?.label ?? 'Cancelled'
  )
}

export function orderLabel(order: OrderSummary): string {
  if (order.delivery_confirmed_at) return 'Completed'
  if (order.delivery_issue && !order.delivery_issue.resolved_at)
    return 'Delivery issue reported'
  if (order.fulfillment_status === 'delivered')
    return 'Delivered — awaiting confirmation'
  return fulfillmentLabel(order.fulfillment_status)
}

export function nextFulfillmentStatus(
  order: OrderSummary,
): AdminFulfillmentStatus | null {
  if (order.delivery_confirmed_at || order.fulfillment_status === 'cancelled')
    return null
  const next =
    ORDER_STEPS[
      ORDER_STEPS.findIndex(
        (step) => step.status === order.fulfillment_status,
      ) + 1
    ]?.status
  return next && next !== 'placed' ? next : null
}

export function orderNumber(id: string): string {
  return `PKO-${id.slice(0, 8).toUpperCase()}`
}

export function formatOrderMoney(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(value)
}

export function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  }).format(new Date(value))
}

export function orderEventLabel(event: OrderEvent): string {
  switch (event.event_type) {
    case 'receipt_confirmed':
      return 'Customer confirmed receipt'
    case 'delivery_issue_reported':
      return 'Customer reported a delivery issue'
    case 'delivery_issue_resolved':
      return 'Admin resolved the delivery issue'
    case 'order_placed':
      return 'Order placed'
    case 'imported':
      return `Existing order imported: ${fulfillmentLabel(event.to_status)}`
    case 'status_changed':
      return fulfillmentLabel(event.to_status)
  }
}
