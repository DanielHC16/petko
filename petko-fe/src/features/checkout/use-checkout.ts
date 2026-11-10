import { useEffect, useRef, useState } from 'react'
import { placeOrder } from '@/lib/orders-api'
import { getApiErrorMessage } from '@/lib/api-error'
import type {
  OrderDetail,
  OrderShipping,
  PlaceOrderInput,
} from '@/lib/order-types'
import { useCartStore } from '@/store/cart.store'
import { useAuthStore } from '@/store/auth.store'
import { validateCheckoutShipping } from './checkout-validation'

interface CheckoutState {
  isPending: boolean
  error: string | null
  errors: Record<string, string>
  submit: (
    shipping: OrderShipping,
    delivery: 'standard' | 'express',
    directItems?: { product_id: string; quantity: number }[],
  ) => Promise<OrderDetail | null>
}

// Retain request identity across route changes, including a lost HTTP response.
// Keys include the buyer and exact payload; no contact information is persisted.
const checkoutRequests = new Map<string, { id: string; reconciled: boolean }>()

export function useCheckout(): CheckoutState {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const busy = useRef(false)
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])

  async function submit(
    shipping: OrderShipping,
    delivery: 'standard' | 'express',
    directItems?: { product_id: string; quantity: number }[],
  ): Promise<OrderDetail | null> {
    if (busy.current) return null
    const fieldErrors = validateCheckoutShipping(shipping)
    setErrors(fieldErrors)
    setError(null)
    if (Object.keys(fieldErrors).length > 0) {
      setError('Please check your contact and shipping details.')
      return null
    }
    const profile = useAuthStore.getState().profile
    const cartItems = useCartStore.getState().items
    const orderItems = directItems ?? cartItems.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    }))
    if (!profile || orderItems.length === 0) {
      setError('Add items to your cart and sign in before placing an order.')
      return null
    }
    const payload: Omit<PlaceOrderInput, 'checkout_request_id'> = {
      shipping: {
        full_name: shipping.full_name.trim(),
        email: shipping.email.trim(),
        phone: shipping.phone.trim(),
        address_line1: shipping.address_line1.trim(),
        address_line2: shipping.address_line2.trim(),
        city: shipping.city.trim(),
        province: shipping.province.trim(),
        postal_code: shipping.postal_code.trim(),
      },
      delivery_method: delivery,
      payment_method: 'cod',
      items: orderItems,
    }
    const fingerprint = JSON.stringify({ user: profile.id, ...payload })
    const request = checkoutRequests.get(fingerprint) ?? {
      id: crypto.randomUUID(),
      reconciled: false,
    }
    checkoutRequests.set(fingerprint, request)
    busy.current = true
    setIsPending(true)
    try {
      const order = await placeOrder({
        ...payload,
        checkout_request_id: request.id,
      })
      if (useAuthStore.getState().profile?.id !== profile.id) return null
      if (!request.reconciled && !directItems) {
        // A second component may be retrying the same request. Reconcile once,
        // preserving products or quantities added after the original submission.
        // Direct orders do not draw from or clear the persistent cart.
        request.reconciled = true
        useCartStore.setState((state) => ({
          items: state.items.flatMap((item) => {
            const purchased =
              payload.items.find((line) => line.product_id === item.product_id)
                ?.quantity ?? 0
            const remaining = item.quantity - purchased
            return remaining > 0 ? [{ ...item, quantity: remaining }] : []
          }),
        }))
      }
      // A known successful order has been reconciled. A later, intentional
      // purchase with the same contents must receive a new request identity.
      if (checkoutRequests.get(fingerprint) === request)
        checkoutRequests.delete(fingerprint)
      return active.current ? order : null
    } catch (err: unknown) {
      if (active.current)
        setError(
          getApiErrorMessage(
            err,
            'Could not place your order. Your cart has been kept; please try again.',
          ),
        )
      return null
    } finally {
      busy.current = false
      if (active.current) setIsPending(false)
    }
  }
  return { isPending, error, errors, submit }
}
