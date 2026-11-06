import { Link } from 'react-router-dom'
import { ShoppingBag, Trash2, ArrowLeft, Ticket, Truck, RefreshCcw, PawPrint } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'

export default function CartPage() {
  const items = useCartStore((s) => s.items)
  const totalPrice = useCartStore((s) => s.totalPrice())
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)
  const shippingEstimate = 100 // Dummy value based on wireframe having a cost, adjust as needed

  return (
    <div className="min-h-screen bg-[#FDF7EE] p-6 lg:p-10 font-sans">
      {/* Header Section */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-[#FFFBF5] p-8 shadow-sm">
        {/* Decorative background circles/shapes resembling the Figma header */}
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-orange-200/50 blur-2xl"></div>
        <div className="absolute right-10 top-5 h-24 w-24 rounded-full bg-orange-300/30 blur-xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-4xl font-extrabold text-[#1A237E]">Your Cart</h1>
            <PawPrint className="text-[#1A237E]" size={28} />
          </div>
          <p className="mt-2 text-sm text-gray-600 font-medium">
            Review your items and adjust quantities, and proceed to checkout
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center shadow-sm">
          <ShoppingBag className="mx-auto text-gray-300" size={54} />
          <h2 className="mt-4 text-base font-bold text-[#1A237E]">Your cart is currently empty</h2>
          <p className="mt-1 text-sm text-gray-500">
            Browse our catalog of pet essentials and add items to your cart.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#E53935] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700"
          >
            <ArrowLeft size={16} />
            Explore Storefront
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          
          {/* Main Cart Items Column */}
          <div className="flex-1 space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-[3fr_1fr_1fr_1fr_auto] gap-4 rounded-xl bg-[#F5E6D3] px-6 py-4 text-sm font-bold text-[#1A237E]">
              <div>Product Details</div>
              <div className="text-center">Price</div>
              <div className="text-center">Quantity</div>
              <div className="text-center">Total</div>
              <div className="w-8"></div>
            </div>

            {/* Items List */}
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="space-y-6">
                {items.map((item) => (
                  <div
                    key={item.product_id}
                    className="grid grid-cols-[3fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-gray-100 pb-6 last:border-0 last:pb-0"
                  >
                    {/* Product Details */}
                    <div className="flex items-center gap-4">
                      <input 
                        type="checkbox" 
                        className="h-4 w-4 rounded border-gray-300 text-[#1A237E] focus:ring-[#1A237E]"
                        defaultChecked
                      />
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-gray-200 p-1">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="line-clamp-2 text-sm font-bold text-[#1A237E]">
                          {item.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-500">Product Description</p>
                        <span className="mt-1 text-xs font-semibold text-green-600">In Stock</span>
                      </div>
                    </div>

                    {/* Unit Price */}
                    <div className="text-center text-sm font-bold text-gray-600">
                      ₱{Number(item.price).toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product_id, Math.max(1, item.quantity - 1))}
                        className="flex h-6 w-6 items-center justify-center rounded bg-[#1A237E] text-white hover:bg-blue-900"
                      >
                        -
                      </button>
                      <span className="flex h-7 w-10 items-center justify-center rounded border-2 border-[#1A237E] text-sm font-bold text-[#1A237E]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className={`flex h-6 w-6 items-center justify-center rounded text-white ${
                          item.quantity >= item.stock
                            ? 'cursor-not-allowed bg-gray-400'
                            : 'bg-[#1A237E] hover:bg-blue-900'
                        }`}
                      >
                        +
                      </button>
                    </div>

                    {/* Item Total */}
                    <div className="text-center text-sm font-bold text-[#E53935]">
                      ₱{(Number(item.price) * item.quantity).toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>

                    {/* Remove Action */}
                    <button
                      onClick={() => removeItem(item.product_id)}
                      className="text-gray-400 transition-colors hover:text-red-500"
                      title="Remove Item"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="w-full shrink-0 space-y-4 lg:w-[380px]">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h2 className="text-lg font-bold text-[#1A237E]">Order Summary</h2>
                <button className="text-sm font-semibold text-[#1A237E] underline">
                  Edit Cart
                </button>
              </div>

              <div className="space-y-4 py-4 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({totalItems} items)</span>
                  <span className="font-bold text-gray-800">
                    ₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <div className="flex flex-col">
                    <span>Shipping Estimate</span>
                    <span className="text-xs text-gray-400">Metro Manila, 1100</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-gray-800">
                      ₱{shippingEstimate.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                    <button className="text-xs font-semibold text-[#1A237E] underline">
                      Change
                    </button>
                  </div>
                </div>
              </div>

              {/* Promo Code Section */}
              <div className="border-t border-gray-100 py-4">
                <h3 className="mb-2 text-sm font-bold text-gray-700">Promo Code</h3>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Enter voucher code"
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-3 text-sm focus:border-[#1A237E] focus:outline-none focus:ring-1 focus:ring-[#1A237E]"
                    />
                  </div>
                  <button className="rounded-lg bg-[#1A237E] px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-900">
                    Apply
                  </button>
                </div>
              </div>

              {/* Total & Checkout */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-[#1A237E]">Estimated Total</span>
                    <span className="text-[11px] text-gray-500">Inclusive of VAT where applicable</span>
                  </div>
                  <span className="text-xl font-extrabold text-[#E53935]">
                    ₱{(totalPrice + shippingEstimate).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <Link
                  to="/checkout"
                  className="mt-6 flex w-full items-center justify-center rounded-lg bg-[#E53935] py-3.5 text-sm font-bold text-white shadow-md hover:bg-red-700"
                >
                  Proceed to Checkout
                </Link>
              </div>
            </div>

            {/* Badges / Guarantees Card */}
            <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#1A237E]">
                  <Truck size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800">Free Shipping</h4>
                  <p className="text-xs text-gray-500">₱ 899 minimum spend in Metro Manila</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#1A237E]">
                  <RefreshCcw size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800">7-Days Returns</h4>
                  <p className="text-xs text-gray-500">No hassle returns for eligible items</p>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  )
}
