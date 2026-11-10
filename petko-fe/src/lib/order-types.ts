export type FulfillmentStatus =
  | 'placed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
export type AdminFulfillmentStatus = Exclude<FulfillmentStatus, 'placed'>

export interface OrderShipping {
  full_name: string
  email: string
  phone: string
  address_line1: string
  address_line2: string
  city: string
  province: string
  postal_code: string
}

export interface OrderItem {
  id: string
  product_id: string
  product_name: string
  image_url: string
  quantity: number
  unit_price: number
}

export interface OrderSummary {
  id: string
  user_id: string
  status: 'pending' | 'paid' | 'shipped' | 'cancelled'
  fulfillment_status: FulfillmentStatus
  tracking_version: number
  total_amount: number
  subtotal_amount: number
  shipping_fee: number
  payment_method: 'cod' | null
  delivery_method: 'standard' | 'express' | null
  created_at: string
  updated_at: string
  delivery_confirmed_at: string | null
  courier_name: string | null
  tracking_number: string | null
  delivery_issue: {
    message: string
    reported_at: string
    resolution: string | null
    resolved_at: string | null
  } | null
  shipping: OrderShipping | null
  items: OrderItem[]
}

export interface OrderEvent {
  id: string
  version: number
  event_type:
    | 'status_changed'
    | 'receipt_confirmed'
    | 'delivery_issue_reported'
    | 'delivery_issue_resolved'
    | 'order_placed'
    | 'imported'
  from_status: FulfillmentStatus | null
  to_status: FulfillmentStatus
  actor_role: 'admin' | 'customer' | 'system'
  created_at: string
  note: string | null
}

export interface OrderDetail extends OrderSummary {
  events: OrderEvent[]
}

export interface OrderList {
  orders: OrderSummary[]
  total: number
  page: number
  limit: number
}

export interface OrderListQuery {
  page: number
  limit?: number
  fulfillment_status?: FulfillmentStatus
  unresolved_only?: boolean
}

export interface PlaceOrderInput {
  checkout_request_id: string
  items: { product_id: string; quantity: number }[]
  shipping: OrderShipping
  delivery_method: 'standard' | 'express'
  payment_method: 'cod'
}

export type OrderAction =
  | { type: 'confirm' }
  | { type: 'report'; message: string }
  | { type: 'resolve'; resolution: string }
  | {
      type: 'fulfillment'
      status: AdminFulfillmentStatus
      courier_name?: string
      tracking_number?: string
    }
