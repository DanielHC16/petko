import { useEffect, useRef, useState } from 'react'
import { placeOrder } from '@/lib/orders-api'
import { getApiErrorMessage } from '@/lib/api-error'
import type {
  OrderDetail,
  OrderShipping,
  PlaceOrderInput,
  PaymentMethod,
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
    orderItems: { product_id: string; quantity: number }[],
    payment: PaymentMethod,
    source: 'cart' | 'direct',
  ) => Promise<OrderDetail | null>
  validate: (shipping: OrderShipping) => boolean
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

  function validate(shipping: OrderShipping): boolean {
    const fieldErrors = validateCheckoutShipping(shipping)
    setErrors(fieldErrors)
    setError(Object.keys(fieldErrors).length ? 'Please check your contact and shipping details.' : null)
    return Object.keys(fieldErrors).length === 0
  }

  async function submit(
    shipping: OrderShipping,
    delivery: 'standard' | 'express',
    orderItems: { product_id: string; quantity: number }[],
    payment: PaymentMethod,
    source: 'cart' | 'direct',
  ): Promise<OrderDetail | null> {
    if (busy.current) return null
    if (!validate(shipping)) return null
    const profile = useAuthStore.getState().profile
    const session = useAuthStore.getState().session
    if (!profile || !session || session.user.id !== profile.id || orderItems.length === 0) {
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
      payment_method: payment,
      checkout_source: source,
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
    let cartLock: number | null = null
    try {
      if (source === 'cart') {
        cartLock = useCartStore.getState().beginCheckout()
        if (cartLock === null) throw new Error('Your cart is being updated. Please wait or refresh your cart.')
        await useCartStore.getState().flushPending()
      }
      if (useAuthStore.getState().profile?.id !== profile.id) return null
      const order = await placeOrder({
        ...payload,
        checkout_request_id: request.id,
      }, session.access_token)
      if (useAuthStore.getState().profile?.id !== profile.id) return null
      if (!request.reconciled && source === 'cart') {
        // A second component may be retrying the same request. Reconcile once,
        // preserving products or quantities added after the original submission.
        // Direct orders do not draw from or clear the persistent cart.
        request.reconciled = true
        useCartStore.getState().consumePurchased(payload.items)
        void useCartStore.getState().syncWithRemote(profile.id)
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
      if (cartLock !== null) useCartStore.getState().endCheckout(cartLock)
      busy.current = false
      if (active.current) setIsPending(false)
    }
  }
  return { isPending, error, errors, submit, validate }
}
