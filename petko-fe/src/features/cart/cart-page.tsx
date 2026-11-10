import { Link } from 'react-router-dom'
import { ShoppingBag, Trash2, ArrowLeft, Ticket, Truck, RefreshCcw } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'

export default function CartPage() {
  const items = useCartStore((s) => s.items)
  const totalPrice = useCartStore((s) => s.totalPrice())
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)
  const isFreeShipping = totalPrice >= 999
  const shippingEstimate = items.length === 0 ? 0 : isFreeShipping ? 0 : 99

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
            
            {/* Lighter shadow paw (Offset slightly down and left) */}
            <svg className="absolute -left-1 -top-5 opacity-75" width="177" height="192" viewBox="0 0 252 185" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g filter="url(#filter0_d_288_14734_shadow_left)">
                <path d="M-24.2539 138.834C-41.5463 132.747 -48.9804 109.108 -40.8584 86.033C-32.7364 62.9584 -12.134 49.187 5.15839 55.2738C22.4508 61.3605 29.8849 85.0004 21.7629 108.075C13.6409 131.15 -6.96151 144.921 -24.2539 138.834Z" fill="#FAD19C" fillOpacity="0.6" shapeRendering="crispEdges"/>
                <path d="M72.032 90.9879C54.7396 84.9011 47.3055 61.2612 55.4275 38.1867C63.5495 15.1121 84.1519 1.34074 101.444 7.42746C118.737 13.5142 126.171 37.1541 118.049 60.2286C109.927 83.3032 89.3244 97.0746 72.032 90.9879Z" fill="#FAD19C" fillOpacity="0.6" shapeRendering="crispEdges"/>
                <path d="M155.386 128.052C138.093 121.965 130.659 98.325 138.781 75.2505C146.903 52.1759 167.506 38.4045 184.798 44.4912C202.09 50.578 209.525 74.2179 201.403 97.2924C193.281 120.367 172.678 134.138 155.386 128.052Z" fill="#FAD19C" fillOpacity="0.6" shapeRendering="crispEdges"/>
                <path d="M187.035 229.817C169.742 223.73 162.308 200.09 170.43 177.016C178.552 153.941 199.155 140.17 216.447 146.257C233.739 152.343 241.173 175.983 233.051 199.058C224.929 222.132 204.327 235.904 187.035 229.817Z" fill="#FAD19C" fillOpacity="0.6" shapeRendering="crispEdges"/>
                <path d="M102.209 118.177C79.9654 122.867 26.9913 155.913 -1.744 167.437C-25.3024 185.083 -32.8574 218.608 -14.6661 234.669C-5.38889 242.861 35.2218 245.005 55.8444 243.739C58.3211 252.059 71.6361 270.307 105.082 276.736C138.529 283.164 151.67 248.336 154.06 230.119C155.306 223.634 137.953 186.68 134.704 180.453C131.454 174.225 130.014 112.315 102.209 118.177Z" fill="#FAD19C" fillOpacity="0.6" shapeRendering="crispEdges"/>
              </g>
              <defs>
                <filter id="filter0_d_288_14734_shadow_left" x="-59.1484" y="-5.01221" width="310.489" height="301.529" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                  <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                  <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                  <feOffset dy="4"/>
                  <feGaussianBlur stdDeviation="7.5"/>
                  <feComposite in2="hardAlpha" operator="out"/>
                  <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0"/>
                  <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_288_14734_shadow_left"/>
                  <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_288_14734_shadow_left" result="shape"/>
                </filter>
              </defs>
            </svg>

            {/* Main Orange left paw */}
            <svg className="absolute -left-1 -top-7" width="177" height="192" viewBox="0 0 252 185" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g filter="url(#filter0_d_288_14734_main)">
                <path d="M-24.2539 138.834C-41.5463 132.747 -48.9804 109.108 -40.8584 86.033C-32.7364 62.9584 -12.134 49.187 5.15839 55.2738C22.4508 61.3605 29.8849 85.0004 21.7629 108.075C13.6409 131.15 -6.96151 144.921 -24.2539 138.834Z" fill="#F7931A" fillOpacity="0.6" shapeRendering="crispEdges"/>
                <path d="M72.032 90.9879C54.7396 84.9011 47.3055 61.2612 55.4275 38.1867C63.5495 15.1121 84.1519 1.34074 101.444 7.42746C118.737 13.5142 126.171 37.1541 118.049 60.2286C109.927 83.3032 89.3244 97.0746 72.032 90.9879Z" fill="#F7931A" fillOpacity="0.6" shapeRendering="crispEdges"/>
                <path d="M155.386 128.052C138.093 121.965 130.659 98.325 138.781 75.2505C146.903 52.1759 167.506 38.4045 184.798 44.4912C202.09 50.578 209.525 74.2179 201.403 97.2924C193.281 120.367 172.678 134.138 155.386 128.052Z" fill="#F7931A" fillOpacity="0.6" shapeRendering="crispEdges"/>
                <path d="M187.035 229.817C169.742 223.73 162.308 200.09 170.43 177.016C178.552 153.941 199.155 140.17 216.447 146.257C233.739 152.343 241.173 175.983 233.051 199.058C224.929 222.132 204.327 235.904 187.035 229.817Z" fill="#F7931A" fillOpacity="0.6" shapeRendering="crispEdges"/>
                <path d="M102.209 118.177C79.9654 122.867 26.9913 155.913 -1.744 167.437C-25.3024 185.083 -32.8574 218.608 -14.6661 234.669C-5.38889 242.861 35.2218 245.005 55.8444 243.739C58.3211 252.059 71.6361 270.307 105.082 276.736C138.529 283.164 151.67 248.336 154.06 230.119C155.306 223.634 137.953 186.68 134.704 180.453C131.454 174.225 130.014 112.315 102.209 118.177Z" fill="#F7931A" fillOpacity="0.6" shapeRendering="crispEdges"/>
              </g>              
            </svg>
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
            <svg className="absolute -right-3 -top-1 opacity-75" width="137" height="152" viewBox="0 0 157 172" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g filter="url(#filter0_d_288_14736_shadow_right)">
                <path d="M189.125 81.1372C199.98 88.5676 200.742 106.334 190.828 120.819C180.913 135.304 164.075 141.023 153.22 133.592C142.364 126.162 141.602 108.396 151.517 93.9108C161.432 79.4257 178.27 73.7068 189.125 81.1372Z" fill="#FAD19C" fillOpacity="0.6" shapeRendering="crispEdges"/>
                <path d="M113.501 96.4182C124.356 103.849 125.118 121.615 115.203 136.1C105.288 150.585 88.4507 156.304 77.5954 148.873C66.7401 141.443 65.9778 123.677 75.8928 109.192C85.8078 94.7067 102.645 88.9878 113.501 96.4182Z" fill="#FAD19C" fillOpacity="0.6" shapeRendering="crispEdges"/>
                <path d="M62.6098 55.2478C73.4652 62.6782 74.2275 80.4443 64.3125 94.9294C54.3975 109.414 37.5598 115.133 26.7045 107.703C15.8492 100.273 15.0869 82.5065 25.0019 68.0214C34.9168 53.5363 51.7545 47.8174 62.6098 55.2478Z" fill="#FAD19C" fillOpacity="0.6" shapeRendering="crispEdges"/>
                <path d="M59.5733 -21.166C70.4286 -13.7356 71.1909 4.03047 61.2759 18.5156C51.3609 33.0007 34.5233 38.7196 23.6679 31.2892C12.8126 23.8588 12.0503 6.09271 21.9653 -8.39238C31.8803 -22.8775 48.718 -28.5964 59.5733 -21.166Z" fill="#FAD19C" fillOpacity="0.6" shapeRendering="crispEdges"/>
                <path d="M97.6337 71.9682C113.922 72.8489 156.777 59.7824 178.835 57.1314C198.441 49.2757 209.904 27.442 200.278 12.9308C195.369 5.53035 167.619 -3.49829 153.09 -6.45095C152.919 -12.6779 147.079 -27.7987 125.09 -38.4661C103.102 -49.1334 87.5249 -27.434 82.4851 -15.2509C80.417 -10.988 85.5813 17.8484 86.677 22.7684C87.7727 27.6883 77.2727 70.8672 97.6337 71.9682Z" fill="#FAD19C" fillOpacity="0.6" shapeRendering="crispEdges"/>
              </g>
              <defs>
                <filter id="filter0_d_288_14736_shadow_right" x="0" y="-52.3286" width="218.745" height="223.458" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                  <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                  <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                  <feOffset dy="4"/>
                  <feGaussianBlur stdDeviation="7.5"/>
                  <feComposite in2="hardAlpha" operator="out"/>
                  <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0"/>
                  <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_288_14736_shadow_right"/>
                  <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_288_14736_shadow_right" result="shape"/>
                </filter>
              </defs>
            </svg>

            {/* Main Orange right paw */}
            <svg className="absolute -right-1 -top-1" width="137" height="152" viewBox="0 0 157 172" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g filter="url(#filter0_d_288_14736_main)">
                <path d="M189.125 81.1372C199.98 88.5676 200.742 106.334 190.828 120.819C180.913 135.304 164.075 141.023 153.22 133.592C142.364 126.162 141.602 108.396 151.517 93.9108C161.432 79.4257 178.27 73.7068 189.125 81.1372Z" fill="#F7931A" fillOpacity="0.6" shapeRendering="crispEdges"/>
                <path d="M113.501 96.4182C124.356 103.849 125.118 121.615 115.203 136.1C105.288 150.585 88.4507 156.304 77.5954 148.873C66.7401 141.443 65.9778 123.677 75.8928 109.192C85.8078 94.7067 102.645 88.9878 113.501 96.4182Z" fill="#F7931A" fillOpacity="0.6" shapeRendering="crispEdges"/>
                <path d="M62.6098 55.2478C73.4652 62.6782 74.2275 80.4443 64.3125 94.9294C54.3975 109.414 37.5598 115.133 26.7045 107.703C15.8492 100.273 15.0869 82.5065 25.0019 68.0214C34.9168 53.5363 51.7545 47.8174 62.6098 55.2478Z" fill="#F7931A" fillOpacity="0.6" shapeRendering="crispEdges"/>
                <path d="M59.5733 -21.166C70.4286 -13.7356 71.1909 4.03047 61.2759 18.5156C51.3609 33.0007 34.5233 38.7196 23.6679 31.2892C12.8126 23.8588 12.0503 6.09271 21.9653 -8.39238C31.8803 -22.8775 48.718 -28.5964 59.5733 -21.166Z" fill="#F7931A" fillOpacity="0.6" shapeRendering="crispEdges"/>
                <path d="M97.6337 71.9682C113.922 72.8489 156.777 59.7824 178.835 57.1314C198.441 49.2757 209.904 27.442 200.278 12.9308C195.369 5.53035 167.619 -3.49829 153.09 -6.45095C152.919 -12.6779 147.079 -27.7987 125.09 -38.4661C103.102 -49.1334 87.5249 -27.434 82.4851 -15.2509C80.417 -10.988 85.5813 17.8484 86.677 22.7684C87.7727 27.6883 77.2727 70.8672 97.6337 71.9682Z" fill="#F7931A" fillOpacity="0.6" shapeRendering="crispEdges"/>
              </g>              
            </svg>
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
                    <span className={`font-bold ${isFreeShipping ? 'text-green-600' : 'text-gray-800'}`}>
                      {isFreeShipping ? 'FREE' : `₱${shippingEstimate.toFixed(2)}`}
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
                  <p className="text-xs text-gray-500">₱ 999 minimum spend in Metro Manila</p>
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