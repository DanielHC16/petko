export const FREE_SHIPPING_THRESHOLD = 999
export const STANDARD_SHIPPING_FEE = 99

export function calculateShippingFee(
  subtotal: number,
  delivery: 'standard' | 'express' = 'standard',
): number {
  if (subtotal <= 0 || subtotal >= FREE_SHIPPING_THRESHOLD) return 0
  return delivery === 'express' ? 199 : STANDARD_SHIPPING_FEE
}
