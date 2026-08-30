import { Link } from 'react-router-dom'
import { ShoppingBag, ArrowRight, Trash2, ArrowLeft } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'

export default function CartPage() {
  const items = useCartStore((s) => s.items)
  const totalPrice = useCartStore((s) => s.totalPrice())
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const clearCart = useCartStore((s) => s.clearCart)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Shopping Cart</h1>
          <p className="mt-1 text-xs text-gray-500">
            Review your selected pet supplies before proceeding to checkout.
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700"
          >
            <Trash2 size={14} />
            Clear Cart
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <ShoppingBag className="mx-auto text-gray-300" size={54} />
          <h2 className="mt-4 text-base font-bold text-gray-800">Your cart is currently empty</h2>
          <p className="mt-1 text-xs text-gray-500">
            Browse our catalog of 57+ pet essentials and add items to your cart.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-orange-600"
          >
            <ArrowLeft size={14} />
            Explore Storefront
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Items List */}
          <div className="space-y-3 lg:col-span-2">
            {items.map((item) => (
              <div
                key={item.product_id}
                className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-50 p-2">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>

                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <h3 className="line-clamp-1 text-sm font-bold text-gray-900">
                      {item.name}
                    </h3>
                    <p className="mt-0.5 text-xs font-bold text-orange-600">
                      ₱{Number(item.price).toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    {/* Quantity Selector */}
                    <div className="flex items-center rounded-md border border-gray-300">
                      <button
                        onClick={() => updateQuantity(item.product_id, Math.max(1, item.quantity - 1))}
                        className="px-2.5 py-0.5 text-xs font-bold text-gray-600 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-semibold text-gray-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        className="px-2.5 py-0.5 text-xs font-bold text-gray-600 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.product_id)}
                      className="text-xs font-medium text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary Card */}
          <div className="h-fit space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">Order Summary</h2>

            <div className="space-y-2.5 text-xs text-gray-600 border-b border-gray-100 pb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>
                  ₱{totalPrice.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Shipping (Metro Manila)</span>
                <span className="font-medium text-green-600">Free</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (12% VAT Included)</span>
                <span>
                  ₱{(totalPrice * 0.12).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <span className="text-sm font-bold text-gray-900">Total</span>
              <span className="text-xl font-extrabold text-orange-600">
                ₱{totalPrice.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <Link
              to="/checkout"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-center text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={14} />
            </Link>

            <Link
              to="/"
              className="block text-center text-xs font-medium text-gray-500 hover:text-gray-800"
            >
              ← Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
