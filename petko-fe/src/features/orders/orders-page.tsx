import { 
  CheckCircle2, 
  RefreshCcw, 
  MapPin, 
  MessageCircle, 
  Package, 
  ClipboardList, 
  Truck,
  Box
} from 'lucide-react';
import pawYellow from "../../assets/paw_yellow.png";
import petOrders from "../../assets/pet_orders.png";

export default function OrdersPage() {
  return (
    <div className="min-h-screen w-full bg-[#ecdab6] p-6 font-sans lg:p-10">
      <div className="w-full">
        {/* Header */}
        <div className="relative -mx-6 -mt-6 mb-8 flex min-h-[160px] items-center overflow-hidden rounded-b-[2rem] bg-[#fefaf2] shadow-sm sm:-mx-8 sm:-mt-8 lg:-mx-10 lg:-mt-10">
          
          {/* Left Decorative Elements */}
          <div className="absolute left-0 top-0 h-full w-[250px] overflow-visible">
            <svg className="absolute -left-6 top-4 scale-85 rotate-90 opacity-100" width="170" height="128" viewBox="0 0 170 128" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M33.1292 194.518C50.699 252.372 113.143 260.774 140.334 178.637C171.072 159.593 245.721 33.6169 162.63 0.195818C114.28 -4.6421 120.256 81.9292 52.015 69.6604C13.0552 62.656 -32.4446 122.142 33.1292 194.518Z" fill="#FDECD4" fillOpacity="0.8"/>
            </svg>
            
            <img
              src={pawYellow}
              alt=""
              aria-hidden="true"
              className="absolute left-1 -top-2 h-[202px] w-[187px] object-contain opacity-50"
              style={{ filter: "drop-shadow(0px 4px 7.5px rgba(0,0,0,0.6))" }}
            />

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
              <h1 className="text-[32px] font-extrabold text-[#10298E] sm:text-[40px]">Orders</h1>
              <svg width="38" height="34" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.82946 20.446C1.48691 20.2661 -0.217509 17.5863 0.022544 14.4604C0.262597 11.3346 2.35622 8.94642 4.69877 9.12632C7.04133 9.30622 8.74574 11.9861 8.50569 15.1119C8.26563 18.2378 6.17202 20.6259 3.82946 20.446Z" fill="#10298E"/>
                <path d="M14.1618 11.3292C11.8193 11.1493 10.1149 8.4695 10.3549 5.34365C10.595 2.2178 12.6886 -0.170367 15.0311 0.00953194C17.3737 0.189431 19.0781 2.86927 18.838 5.99512C18.598 9.12098 16.5044 11.5091 14.1618 11.3292Z" fill="#10298E"/>
                <path d="M25.7098 13.1526C23.3672 12.9727 21.6628 10.2929 21.9028 7.16701C22.1429 4.04116 24.2365 1.65299 26.5791 1.83289C28.9216 2.01279 30.626 4.69263 30.386 7.81848C30.1459 10.9443 28.0523 13.3325 25.7098 13.1526Z" fill="#10298E"/>
                <path d="M33.0032 24.7005C30.6606 24.5206 28.9562 21.8408 29.1963 18.7149C29.4363 15.5891 31.5299 13.2009 33.8725 13.3808C36.215 13.5607 37.9195 16.2406 37.6794 19.3664C37.4394 22.4923 35.3457 24.8804 33.0032 24.7005Z" fill="#10298E"/>
                <path d="M18.7994 13.6941C16.2013 15.0124 10.7397 20.8604 7.56475 23.2402C5.23374 26.2061 5.41051 30.6068 8.1952 31.9916C9.61535 32.6979 14.7138 31.6163 17.2247 30.7756C17.8073 31.7234 20.0608 33.5407 24.4144 33.227C28.768 32.9134 29.2396 28.1661 28.9311 25.8317C28.8703 24.9876 25.4965 20.9886 24.8876 20.3255C24.2788 19.6623 22.047 12.0461 18.7994 13.6941Z" fill="#10298E"/>
              </svg>
            </div>
            <p className="mt-1 text-sm font-medium text-black sm:text-[15px]">
              Track your companion's order from our warehouse to your home.
            </p>
          </div>

          {/* Right Decorative Elements */}
          <div className="absolute right-0 top-0 hidden h-full w-[200px] overflow-visible md:block">
            <svg className="absolute -bottom-6 -right-6 scale-85 opacity-80" width="170" height="128" viewBox="0 0 170 128" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M33.1292 194.518C50.699 252.372 113.143 260.774 140.334 178.637C171.072 159.593 245.721 33.6169 162.63 0.195818C114.28 -4.6421 120.256 81.9292 52.015 69.6604C13.0552 62.656 -32.4446 122.142 33.1292 194.518Z" fill="#FDECD4" fillOpacity="0.8"/>
            </svg>
            <img
              src={pawYellow}
              alt=""
              aria-hidden="true"
              className="absolute -right-4 top-1 h-[152px] w-[137px] object-contain opacity-60 -rotate-[50deg]"
              style={{ filter: "drop-shadow(0px 4px 7.5px rgba(0,0,0,0.6))" }}
            />
            <img
              src={pawYellow}
              alt=""
              aria-hidden="true"
              className="absolute -right-1 -top-1 h-[152px] w-[137px] object-contain opacity-100 -rotate-[50deg]"
            />
          </div>
        </div>

        {/* Main Content Container */}
        <div className="flex flex-col gap-6">

          {/* TOP SECTION: Single Unified Card matching the reference image */}
          <div className="rounded-2xl border border-[#e1cba5] bg-[#fdf2e1] p-6 lg:p-8 shadow-sm relative overflow-hidden flex flex-col lg:flex-row items-center lg:items-center justify-between gap-6 lg:gap-8">
            
            {/* Left Group: Product Image + Order Details + Shipping Address */}
            <div className="flex flex-col sm:flex-row items-start gap-6 w-full lg:w-auto lg:flex-1">
              
              {/* Product Image / Placeholder */}
              <div className="w-32 h-40 bg-white rounded-xl border border-gray-200 flex-shrink-0 flex flex-col items-center justify-center text-xs text-gray-400 p-2 text-center shadow-sm">
                <Box className="w-8 h-8 mb-2 text-gray-300" />
                Product Image
              </div>

              {/* Order Details */}
              <div className="flex-1 min-w-[220px]">
                <h2 className="text-2xl font-extrabold text-[#10298E]">Order #PKO-2026-063</h2>
                <p className="text-sm text-gray-600 mt-1">Placed on May 21, 2026 at 10:30 AM</p>
                
                <div className="mt-3">
                  <div className="inline-flex items-center gap-1.5 bg-[#dcfce7] text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                    <CheckCircle2 size={16} /> Delivered
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mt-3">
                  Your order has been delivered on<br />
                  <span className="text-green-600 font-medium">May 23, 2026 at 2:15 PM</span>
                </p>
                
                <button className="mt-4 flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
                  <RefreshCcw size={16} /> Reorder
                </button>
              </div>

              {/* Shipping Address with vertical divider on desktop */}
              <div className="border-t sm:border-t-0 sm:border-l border-[#e1cba5] sm:pl-6 pt-4 sm:pt-0 w-full sm:w-auto">
                <h3 className="text-base font-bold text-gray-700 flex items-center gap-2 mb-3">
                  <MapPin size={18} /> Shipping Address
                </h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <p className="font-semibold text-gray-900">Juan Dela Cruz</p>
                  <p>12 Pet Residence 123 St., Brgy Woof</p>
                  <p>Sta Mesa, Metro Manila 1100</p>
                  <p>Philippines</p>
                  <p className="mt-2 text-gray-500">09xxxxxxxxx</p>
                </div>
              </div>

            </div>

            {/* Right Group: Customer Support Yellow Card & Pet Illustration */}
            <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto justify-end relative z-10">
              
              {/* Yellow Support Box */}
              <div className="bg-[#FFE5A3] rounded-xl p-5 w-full sm:w-[280px] shadow-sm">
                <h3 className="text-[#10298E] font-bold text-lg leading-tight">Need Help with your<br />order?</h3>
                <p className="text-sm text-[#10298E]/80 mt-1 mb-4">We're here to help!</p>
                <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-100 shadow-sm transition-colors">
                  <MessageCircle size={16} /> Contact Support
                </button>
              </div>

              {/* Pet Illustration */}
              <div className="hidden xl:block w-48 h-44 flex-shrink-0 relative">
                <img
                  src={petOrders}
                  alt="Pet decoration"
                  className="absolute right-0 bottom-0 h-44 w-auto object-contain"
                />
              </div>

            </div>

          </div>

          {/* BOTTOM ROW: Order Progress (Left) & Order Summary (Right) */}
          <div className="flex flex-col gap-6 lg:flex-row">

            {/* Left Column: Order Progress */}
            <div className="flex-1 rounded-2xl border border-[#e1cba5] bg-[#fdf2e1] p-6 shadow-sm">
              <h3 className="text-xl font-bold text-[#10298E] mb-6">Order Progress</h3>
              
              <div className="relative px-2 md:px-4 py-4">
                {/* Horizontal Connecting Track for Desktop */}
                <div className="hidden lg:block absolute top-[34px] left-12 right-12 h-1 bg-green-500 z-0"></div>
                
                {/* Timeline Steps Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 relative z-10">
                  
                  {/* Step 1: Order Placed */}
                  <div className="flex lg:flex-col items-center gap-4 lg:gap-2 text-left lg:text-center">
                    <div className="w-12 h-12 bg-white border-2 border-[#e1cba5] lg:border-green-500 rounded-xl flex items-center justify-center shadow-sm text-[#10298E] shrink-0">
                      <Package size={22} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#10298E] leading-tight">Order Placed</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">May 21, 2026<br/>10:30am</p>
                    </div>
                  </div>

                  {/* Step 2: Processing */}
                  <div className="flex lg:flex-col items-center gap-4 lg:gap-2 text-left lg:text-center">
                    <div className="w-12 h-12 bg-white border-2 border-[#e1cba5] lg:border-green-500 rounded-xl flex items-center justify-center shadow-sm text-[#10298E] shrink-0">
                      <ClipboardList size={22} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#10298E] leading-tight">Processing</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">May 21, 2026<br/>2:45pm</p>
                    </div>
                  </div>

                  {/* Step 3: Out for Delivery */}
                  <div className="flex lg:flex-col items-center gap-4 lg:gap-2 text-left lg:text-center">
                    <div className="w-12 h-12 bg-white border-2 border-[#e1cba5] lg:border-green-500 rounded-xl flex items-center justify-center shadow-sm text-[#10298E] shrink-0">
                      <Box size={22} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#10298E] leading-tight">Out for Delivery</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">May 23, 2026<br/>9:05am</p>
                    </div>
                  </div>

                  {/* Step 4: Shipped */}
                  <div className="flex lg:flex-col items-center gap-4 lg:gap-2 text-left lg:text-center">
                    <div className="w-12 h-12 bg-white border-2 border-[#e1cba5] lg:border-green-500 rounded-xl flex items-center justify-center shadow-sm text-[#10298E] shrink-0">
                      <Truck size={22} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#10298E] leading-tight">Shipped</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">May 22, 2026<br/>9:10am</p>
                    </div>
                  </div>

                  {/* Step 5: Delivered */}
                  <div className="flex lg:flex-col items-center gap-4 lg:gap-2 text-left lg:text-center">
                    <div className="w-12 h-12 bg-green-500 border-2 border-green-500 rounded-xl flex items-center justify-center shadow-sm text-white shrink-0">
                      <CheckCircle2 size={22} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#10298E] leading-tight">Delivered</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">May 23, 2026<br/>2:15pm</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Delivery Success Message */}
              <div className="mt-6 bg-[#dcfce7] rounded-lg p-3 flex items-center gap-2 text-sm text-green-800 font-medium">
                <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                Your order has been delivered. Thank you for shopping with Petko!
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <div className="w-full lg:w-[380px] shrink-0 rounded-2xl border border-[#e1cba5] bg-[#fdf2e1] p-6 shadow-sm">
              <h3 className="text-xl font-bold text-[#10298E] mb-6">
                Order Summary
              </h3>
              
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Subtotal (3 items)</span>
                  <span className="font-medium text-gray-800">₱ 697.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Shipping Fee</span>
                  <span className="font-semibold text-green-500">FREE</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Discount</span>
                  <span className="font-medium text-red-500">- ₱ 70.00</span>
                </div>
                
                <div className="pt-4 border-t border-gray-200 mt-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="block font-bold text-[#10298E] text-base">Total Amount</span>
                      <span className="text-[11px] text-gray-500">Inclusive of VAT where applicable</span>
                    </div>
                    <span className="font-bold text-2xl text-red-600">₱ 627.00</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}