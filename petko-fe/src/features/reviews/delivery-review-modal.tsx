import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Package, X } from 'lucide-react'
import type { OrderDetail } from '@/lib/order-types'
import { formatOrderMoney, orderNumber } from '@/lib/order-status'
import OwnReviewPanel from './own-review-panel'

interface DeliveryReviewModalProps {
  order: OrderDetail
  onClose: () => void
}

export default function DeliveryReviewModal({
  order,
  onClose,
}: DeliveryReviewModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const [, setReviewCount] = useState(0)

  // Deduplicate products in this order by product_id
  const products = order.items.filter(
    (item, index, items) =>
      items.findIndex((other) => other.product_id === item.product_id) === index,
  )

  // ESC key dismiss and body scroll lock
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [onClose])

  return (
    <div
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delivery-review-modal-title"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-orange-200 bg-white shadow-2xl">
        {/* ── Modal Header ────────────────────────────────────────────── */}
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-orange-100 bg-[#FFFBF5] p-5 sm:px-6">
          <div className="min-w-0">
            <span className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
              <CheckCircle2 size={12} className="text-emerald-600" />
              Delivery Confirmed
            </span>
            <h2
              id="delivery-review-modal-title"
              className="font-display text-xl font-black text-petko-blue sm:text-2xl"
            >
              How did your pet like your order?
            </h2>
            <p className="mt-0.5 text-xs text-gray-600">
              Order {orderNumber(order.id)} is confirmed delivered! Share your pet&apos;s
              reaction to help other pet parents.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close review dialog"
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-orange-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-petko-blue"
          >
            <X size={20} />
          </button>
        </header>

        {/* ── Modal Body (Scrollable Review Editors) ───────────────────── */}
        <div className="space-y-6 overflow-y-auto p-5 sm:p-6">
          <p className="text-xs text-gray-500">
            You can leave a distinct review for each product in this order.
          </p>

          <div className="space-y-6">
            {products.map((item) => (
              <div
                key={item.product_id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                {/* Product summary header */}
                <div className="flex items-center gap-3.5 border-b border-gray-100 bg-[#FFFBF5]/60 p-3.5 sm:px-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-orange-100 bg-petko-cream">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package size={20} className="text-petko-blue" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-petko-blue">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Qty {item.quantity} · {formatOrderMoney(item.unit_price)}
                    </p>
                  </div>
                </div>

                {/* Dedicated review editor for this order */}
                <div className="p-3.5 sm:p-4">
                  <OwnReviewPanel
                    productId={item.product_id}
                    orderId={order.id}
                    onChanged={() => setReviewCount((c) => c + 1)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Modal Footer ────────────────────────────────────────────── */}
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <p className="text-xs text-gray-500">
            You can also review or edit anytime from this Orders page or each product page.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-petko-blue px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-petko-blue-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-petko-blue"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  )
}
