import type { PaymentMethod } from '@/lib/order-types'

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cod: 'Cash on Delivery', gcash: 'GCash', maya: 'Maya', card: 'Visa / Mastercard',
}
