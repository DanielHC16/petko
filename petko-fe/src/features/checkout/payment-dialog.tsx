import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, CreditCard, LoaderCircle, ShieldCheck } from 'lucide-react'
import type { PaymentMethod } from '@/lib/order-types'
import { PAYMENT_LABELS } from '@/lib/payment-methods'

interface PaymentDialogProps {
  method: PaymentMethod
  amount: number
  pending: boolean
  orderId: string | null
  error: string | null
  onConfirm: () => void
  onCancel: () => void
  onContinue: () => void
}

export default function PaymentDialog({ method, amount, pending, orderId, error, onConfirm, onCancel, onContinue }: PaymentDialogProps) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const cancelRef = useRef(onCancel)
  const busyRef = useRef(pending || Boolean(orderId))
  useEffect(() => {
    cancelRef.current = onCancel
    busyRef.current = pending || Boolean(orderId)
  }, [onCancel, pending, orderId])

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    function handleKey(event: KeyboardEvent): void {
      if (event.key === 'Escape' && !busyRef.current) cancelRef.current()
      if (event.key !== 'Tab') return
      const controls = panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
      if (!controls?.length) { event.preventDefault(); return }
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) {
        event.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl focus:outline-none">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-petko-blue">
          {orderId ? <CheckCircle2 aria-hidden="true" className="text-green-600" /> : pending ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <CreditCard aria-hidden="true" />}
        </div>
        <h2 id={titleId} className="text-xl font-extrabold text-petko-blue">
          {orderId ? 'Payment successful' : pending ? 'Confirming your payment' : 'Confirm payment'}
        </h2>
        <div aria-live="polite" className="mt-2 text-sm text-gray-600">
          {orderId ? 'Your order is confirmed and ready to track.' : pending ? 'Please wait while we confirm your order.' : 'Review your payment details to complete your order.'}
        </div>
        <dl className="mt-5 space-y-3 rounded-xl bg-orange-50 p-4 text-sm">
          <div className="flex justify-between gap-4"><dt>Payment method</dt><dd className="font-bold text-petko-blue">{PAYMENT_LABELS[method]}</dd></div>
          <div className="flex justify-between gap-4 border-t border-orange-100 pt-3"><dt>Total amount</dt><dd className="text-lg font-extrabold text-petko-blue">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)}</dd></div>
          {orderId && <div className="border-t border-orange-100 pt-3"><dt>Order reference</dt><dd className="mt-1 break-all font-mono text-xs">{orderId}</dd></div>}
        </dl>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex gap-3">
          {orderId ? <button type="button" onClick={onContinue} className="w-full rounded-xl bg-petko-blue px-4 py-3 text-sm font-bold text-white focus-visible:ring-2 focus-visible:ring-orange-400">View order</button> : <>
            <button type="button" disabled={pending} onClick={onCancel} className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-700 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-petko-blue">Cancel</button>
            <button type="button" disabled={pending} onClick={onConfirm} className="flex-1 rounded-xl bg-petko-blue px-4 py-3 text-sm font-bold text-white disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-orange-400">{pending ? 'Processing…' : 'Confirm payment'}</button>
          </>}
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-500"><ShieldCheck size={14} aria-hidden="true" />PetKo checkout</p>
      </div>
    </div>, document.body,
  )
}
