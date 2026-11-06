import { Link } from 'react-router-dom'
import { ShoppingBag, Trash2, ArrowLeft, Ticket, Truck, RefreshCcw } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'
import pawYellow from "../../assets/paw_yellow.png";

export default function CartPage() {
  const items = useCartStore((s) => s.items)
  const totalPrice = useCartStore((s) => s.totalPrice())
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)
  const shippingEstimate = 100 // Dummy value based on wireframe having a cost, adjust as needed

  return (
    <div className="min-h-screen w-full bg-[#ecdab6] p-6 font-sans lg:p-10">
      {/* Header Section (from Figma SVGs) */}
      {/* Full-Width Header Section */}
        <div className="relative -mx-6 -mt-6 mb-8 flex min-h-[160px] items-center overflow-hidden rounded-b-[2rem] bg-[#fefaf2] shadow-sm sm:-mx-8 sm:-mt-8 lg:-mx-10 lg:-mt-10">
          
          {/* Left Decorative Elements */}
          <div className="absolute left-0 top-0 h-full w-[250px] overflow-visible">
            {/* Light beige blob */}
            <svg className="absolute -left-6 top-4 scale-85 rotate-90 opacity-100" width="170" height="128" viewBox="0 0 170 128" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M33.1292 194.518C50.699 252.372 113.143 260.774 140.334 178.637C171.072 159.593 245.721 33.6169 162.63 0.195818C114.28 -4.6421 120.256 81.9292 52.015 69.6604C13.0552 62.656 -32.4446 122.142 33.1292 194.518Z" fill="#FDECD4" fillOpacity="0.8"/>
            </svg>
            
            <img
              src={pawYellow}
              alt=""
              aria-hidden="true"
              className="absolute left-1 -top-2 h-[202px] w-[187px] object-contain opacity-50"
              style={{
                filter: "drop-shadow(0px 4px 7.5px rgba(0,0,0,0.6))",
              }}
            />

            {/* Main Orange left paw */}
            <img
              src={pawYellow}
              alt=""
              aria-hidden="true"
              className="absolute -left-1 -top-5 h-[202px] w-[187px] object-contain opacity-100"
            />
          </div>

          {/* Center Content */}
          <div className="relative z-10 pl-[160px] pr-8 sm:pl-[220px] md:pl-[260px] lg:pl-[280px]">
            <div className="flex items-center gap-3">
              <h1 className="text-[32px] font-extrabold text-[#10298E] sm:text-[40px]">Your Cart</h1>
              {/* Small blue paw icon */}
              <svg width="38" height="34" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.82946 20.446C1.48691 20.2661 -0.217509 17.5863 0.022544 14.4604C0.262597 11.3346 2.35622 8.94642 4.69877 9.12632C7.04133 9.30622 8.74574 11.9861 8.50569 15.1119C8.26563 18.2378 6.17202 20.6259 3.82946 20.446Z" fill="#10298E"/>
                <path d="M14.1618 11.3292C11.8193 11.1493 10.1149 8.4695 10.3549 5.34365C10.595 2.2178 12.6886 -0.170367 15.0311 0.00953194C17.3737 0.189431 19.0781 2.86927 18.838 5.99512C18.598 9.12098 16.5044 11.5091 14.1618 11.3292Z" fill="#10298E"/>
                <path d="M25.7098 13.1526C23.3672 12.9727 21.6628 10.2929 21.9028 7.16701C22.1429 4.04116 24.2365 1.65299 26.5791 1.83289C28.9216 2.01279 30.626 4.69263 30.386 7.81848C30.1459 10.9443 28.0523 13.3325 25.7098 13.1526Z" fill="#10298E"/>
                <path d="M33.0032 24.7005C30.6606 24.5206 28.9562 21.8408 29.1963 18.7149C29.4363 15.5891 31.5299 13.2009 33.8725 13.3808C36.215 13.5607 37.9195 16.2406 37.6794 19.3664C37.4394 22.4923 35.3457 24.8804 33.0032 24.7005Z" fill="#10298E"/>
                <path d="M18.7994 13.6941C16.2013 15.0124 10.7397 20.8604 7.56475 23.2402C5.23374 26.2061 5.41051 30.6068 8.1952 31.9916C9.61535 32.6979 14.7138 31.6163 17.2247 30.7756C17.8073 31.7234 20.0608 33.5407 24.4144 33.227C28.768 32.9134 29.2396 28.1661 28.9311 25.8317C28.8703 24.9876 25.4965 20.9886 24.8876 20.3255C24.2788 19.6623 22.047 12.0461 18.7994 13.6941Z" fill="#10298E"/>
              </svg>
            </div>
            <p className="mt-1 text-sm font-medium text-black sm:text-[15px]">
              Review your items and adjust quantities, and proceed to checkout
            </p>
          </div>

          {/* Right Decorative Elements */}
          <div className="absolute right-0 top-0 hidden h-full w-[200px] overflow-visible md:block">
            {/* Light beige blob (reused and rotated) */}
            <svg className="absolute -bottom-6 -right-6 scale-85 opacity-80" width="170" height="128" viewBox="0 0 170 128" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M33.1292 194.518C50.699 252.372 113.143 260.774 140.334 178.637C171.072 159.593 245.721 33.6169 162.63 0.195818C114.28 -4.6421 120.256 81.9292 52.015 69.6604C13.0552 62.656 -32.4446 122.142 33.1292 194.518Z" fill="#FDECD4" fillOpacity="0.8"/>
            </svg>

            {/* Lighter shadow right paw (Offset up and right) */}
            <img
              src={pawYellow}
              alt=""
              aria-hidden="true"
              className="absolute -right-4 top-1 h-[152px] w-[137px] object-contain opacity-60 -rotate-[50deg]"
              style={{
                filter: "drop-shadow(0px 4px 7.5px rgba(0,0,0,0.6))",
              }}
            />

            {/* Main Orange right paw */}
            <img
              src={pawYellow}
              alt=""
              aria-hidden="true"
              className="absolute -right-1 -top-1 h-[152px] w-[137px] object-contain opacity-100 -rotate-[50deg]"
            />
          </div>
        </div>

      {/* Cart Content Starts Below */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-[#e1cba5] bg-[#fdf2e1] py-16 text-center shadow-sm">
          <ShoppingBag className="mx-auto text-gray-300" size={54} />
          <h2 className="mt-4 text-base font-bold text-[#10298E]">Your cart is currently empty</h2>
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
            <div className="grid grid-cols-[3fr_1fr_1fr_1fr_auto] gap-4 rounded-xl border border-[#e1cba5] bg-[#fdf2e1] px-6 py-4 text-sm font-bold text-[#10298E] shadow-sm">
              <div>Product Details</div>
              <div className="text-center">Price</div>
              <div className="text-center">Quantity</div>
              <div className="text-center">Total</div>
              <div className="w-8"></div>
            </div>

            {/* Items List */}
            <div className="rounded-2xl border border-[#e1cba5] bg-[#fdf2e1] p-6 shadow-sm">
              <div className="space-y-6">
                {items.map((item) => (
                  <div
                    key={item.product_id}
                    className="grid grid-cols-[3fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-gray-200/60 pb-6 last:border-0 last:pb-0"
                  >
                    {/* Product Details */}
                    <div className="flex items-center gap-4">
                      <input 
                        type="checkbox" 
                        className="h-4 w-4 rounded border-gray-300 text-[#10298E] focus:ring-[#10298E]"
                        defaultChecked
                      />
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-[#e1cba5] bg-white p-1">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="line-clamp-2 text-sm font-bold text-[#10298E]">
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
                        className="flex h-6 w-6 items-center justify-center rounded bg-[#10298E] text-white hover:bg-blue-900"
                      >
                        -
                      </button>
                      <span className="flex h-7 w-10 items-center justify-center rounded border-2 border-[#10298E] text-sm font-bold text-[#10298E]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className={`flex h-6 w-6 items-center justify-center rounded text-white ${
                          item.quantity >= item.stock
                            ? 'cursor-not-allowed bg-gray-400'
                            : 'bg-[#10298E] hover:bg-blue-900'
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
            <div className="rounded-2xl border border-[#e1cba5] bg-[#fdf2e1] p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-200/60 pb-4">
                <h2 className="text-lg font-bold text-[#10298E]">Order Summary</h2>
                <button className="text-sm font-semibold text-[#10298E] underline">
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
                    <button className="text-xs font-semibold text-[#10298E] underline">
                      Change
                    </button>
                  </div>
                </div>
              </div>

              {/* Promo Code Section */}
              <div className="border-t border-gray-200/60 py-4">
                <h3 className="mb-2 text-sm font-bold text-gray-700">Promo Code</h3>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Enter voucher code"
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-[#10298E] focus:outline-none focus:ring-1 focus:ring-[#10298E]"
                    />
                  </div>
                  <button className="rounded-lg bg-[#10298E] px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-900">
                    Apply
                  </button>
                </div>
              </div>

              {/* Total & Checkout */}
              <div className="border-t border-gray-200/60 pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-[#10298E]">Estimated Total</span>
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
            <div className="space-y-4 rounded-2xl border border-[#e1cba5] bg-[#fdf2e1] p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#10298E]">
                  <Truck size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800">Free Shipping</h4>
                  <p className="text-xs text-gray-500">₱ 899 minimum spend in Metro Manila</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#10298E]">
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