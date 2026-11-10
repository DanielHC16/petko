import type { OrderShipping } from '@/lib/order-types'

export function validateCheckoutShipping(
  shipping: OrderShipping,
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!shipping.full_name.trim() || shipping.full_name.trim().length > 120)
    errors.fullName = 'Enter a full name, up to 120 characters'
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipping.email.trim()) ||
    shipping.email.length > 254
  )
    errors.email = 'Enter a valid email address'
  if (!/^09\d{9}$/.test(shipping.phone.trim()))
    errors.contactNumber = 'Enter an 11-digit PH mobile number starting with 09'
  if (
    !shipping.address_line1.trim() ||
    shipping.address_line1.trim().length > 250
  )
    errors.addressLine1 = 'Enter a street address, up to 250 characters'
  if (shipping.address_line2.length > 250)
    errors.addressLine2 = 'Use up to 250 characters'
  if (!shipping.city.trim() || shipping.city.trim().length > 100)
    errors.city = 'Enter a city, up to 100 characters'
  if (!shipping.province.trim() || shipping.province.trim().length > 100)
    errors.province = 'Enter a province, up to 100 characters'
  if (!/^\d{4}$/.test(shipping.postal_code.trim()))
    errors.postalCode = 'Enter a valid 4-digit postal code'
  return errors
}
