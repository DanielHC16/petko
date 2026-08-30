import { Link } from 'react-router-dom'
import { useCartStore } from '@/store/cart.store'

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items)
  const totalPrice = useCartStore((s) => s.totalPrice())

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-800">Order Summary</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-600">
          {items.map((item) => (
            <li key={item.product_id} className="flex justify-between">
              <span>{item.name} × {item.quantity}</span>
              <span>₱{(item.price * item.quantity).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-gray-100 pt-3 text-right font-semibold text-gray-900">
          Total: ₱{totalPrice.toFixed(2)}
        </div>
      </div>

      {/* Payment gateway — TBA */}
      <div className="mt-4 rounded-lg border border-dashed border-orange-300 bg-orange-50 p-4 text-sm text-orange-700">
        <strong>Payment Gateway:</strong> Integration pending. This section will be wired to the payment provider once selected.
      </div>

      <div className="mt-4 flex gap-3">
        <Link
          to="/cart"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Back to Cart
        </Link>
        <button
          disabled
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white opacity-50 cursor-not-allowed"
        >
          Place Order (Coming Soon)
        </button>
      </div>
    </div>
  )
}
