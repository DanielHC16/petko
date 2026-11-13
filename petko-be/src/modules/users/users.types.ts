import type { OrderShippingDto } from '@/common/dto/order-shipping.dto'

export interface TosAcceptance {
  tos_accepted: true
}

export interface SavedShipping {
  saved_shipping: OrderShippingDto | null
}
