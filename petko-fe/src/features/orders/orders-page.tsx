import { 
  PawPrint, 
  CheckCircle2, 
  RefreshCcw, 
  MapPin, 
  MessageCircle, 
  Package, 
  ClipboardList, 
  Truck,
  Box
} from 'lucide-react';

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-[#fffcf5] p-6 md:p-12 font-sans relative overflow-hidden">
      {/* Decorative Background Elements (Approximating the orange blobs) */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute top-0 right-0 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/3 -translate-y-1/3"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-[#002B5B] flex items-center gap-2">
            Orders <PawPrint className="text-blue-900 w-8 h-8" fill="#002B5B" />
          </h1>
          <p className="text-gray-800 font-medium mt-2">
            Track your companion's order from our warehouse to your home.
          </p>
        </div>

        {/* Main Order Card */}
        <div className="bg-[#FFF8EA] rounded-2xl p-6 md:p-8 shadow-sm border border-orange-100/50">
          
          {/* Top Section: Order Info, Shipping, Support */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 border-b border-orange-200/60 pb-8">
            
            {/* 1. Order Details */}
            <div className="flex gap-4 lg:border-r border-orange-200/60 lg:pr-8">
              {/* Product Placeholder Image */}
              <div className="w-28 h-36 bg-white rounded-xl border border-gray-200 flex-shrink-0 flex flex-col items-center justify-center text-xs text-gray-400 p-2 text-center shadow-sm">
                 <Box className="w-8 h-8 mb-2 text-gray-300" />
                 Product Image
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-[#002B5B]">Order #PKO-2026-063</h2>
                <p className="text-sm text-gray-600 mt-1">Placed on May 21, 2026 at 10:30 AM</p>
                
                <div className="inline-flex items-center gap-1.5 bg-[#dcfce7] text-green-700 px-3 py-1 rounded-full text-sm font-semibold mt-4">
                  <CheckCircle2 size={16} /> Delivered
                </div>
                
                <p className="text-sm text-gray-600 mt-3">
                  Your order has been delivered on<br/>
                  <span className="text-green-600 font-medium">May 23, 2026 at 2:15 PM</span>
                </p>
                
                <button className="mt-4 flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                  <RefreshCcw size={16} /> Reorder
                </button>
              </div>
            </div>

            {/* 2. Shipping Address */}
            <div className="lg:border-r border-orange-200/60 lg:px-4">
              <h3 className="text-lg font-bold text-gray-500 flex items-center gap-2 mb-4">
                <MapPin size={20} /> Shipping Address
              </h3>
              <div className="text-sm text-gray-700 space-y-1.5">
                <p className="font-semibold text-gray-900 text-base">Juan Dela Cruz</p>
                <p>12 Pet Residence 123 St., Brgy Woof</p>
                <p>Sta Mesa, Metro Manila 1100</p>
                <p>Philippines</p>
                <p className="mt-4 text-gray-500">09xxxxxxxxx</p>
              </div>
            </div>

            {/* 3. Support Box & Pet Graphic */}
            <div className="relative lg:pl-4 flex flex-col justify-center">
              <div className="bg-[#FFE5A3] rounded-xl p-5 w-full max-w-[280px] shadow-sm relative z-10">
                <h3 className="text-[#002B5B] font-bold text-lg leading-tight">Need Help with your<br/>order?</h3>
                <p className="text-sm text-[#002B5B]/80 mt-1 mb-4">We're here to help!</p>
                <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors">
                  <MessageCircle size={16} /> Contact Support
                </button>
              </div>
              {/* Pet Image Placeholder */}
              <div className="absolute right-0 bottom-0 w-48 h-48 hidden lg:flex items-end justify-end pointer-events-none z-0">
                 <div className="w-full h-full bg-gray-200 rounded-tl-full rounded-bl-full flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
                   <span className="text-sm text-gray-500 font-medium">Pet Image</span>
                 </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Progress & Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Order Progress */}
            <div className="lg:col-span-2">
              <h3 className="text-xl font-bold text-[#002B5B] mb-8">Order Progress</h3>
              
              <div className="relative px-2 md:px-8">
                {/* Connecting Track */}
                <div className="absolute top-6 left-12 right-12 h-1 bg-green-500 z-0"></div>
                
                {/* Timeline Steps */}
                <div className="flex justify-between relative z-10">
                  
                  {/* Step 1: Order Placed */}
                  <div className="flex flex-col items-center w-24">
                    <div className="w-12 h-12 bg-white border-2 border-orange-100 rounded-xl flex items-center justify-center shadow-sm text-orange-400 mb-3">
                      <Package size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-[#002B5B] leading-tight">Order Placed</p>
                      <p className="text-[11px] text-gray-500 mt-1">May 21, 2026<br/>10:30am</p>
                    </div>
                  </div>

                  {/* Step 2: Processing */}
                  <div className="flex flex-col items-center w-24">
                    <div className="w-12 h-12 bg-white border-2 border-orange-100 rounded-xl flex items-center justify-center shadow-sm text-orange-400 mb-3">
                      <ClipboardList size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-[#002B5B] leading-tight">Processing</p>
                      <p className="text-[11px] text-gray-500 mt-1">May 21, 2026<br/>2:45pm</p>
                    </div>
                  </div>

                  {/* Step 3: Out for Delivery */}
                  <div className="flex flex-col items-center w-24">
                    <div className="w-12 h-12 bg-white border-2 border-orange-100 rounded-xl flex items-center justify-center shadow-sm text-orange-400 mb-3">
                      <Box size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-[#002B5B] leading-tight">Out for Delivery</p>
                      <p className="text-[11px] text-gray-500 mt-1">May 23, 2026<br/>9:05am</p>
                    </div>
                  </div>

                  {/* Step 4: Shipped */}
                  <div className="flex flex-col items-center w-24">
                    <div className="w-12 h-12 bg-white border-2 border-orange-100 rounded-xl flex items-center justify-center shadow-sm text-orange-400 mb-3">
                      <Truck size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-[#002B5B] leading-tight">Shipped</p>
                      <p className="text-[11px] text-gray-500 mt-1">May 22, 2026<br/>9:10am</p>
                    </div>
                  </div>

                  {/* Step 5: Delivered */}
                  <div className="flex flex-col items-center w-24">
                    <div className="w-12 h-12 bg-green-500 border-2 border-green-500 rounded-xl flex items-center justify-center shadow-sm text-white mb-3">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-[#002B5B] leading-tight">Delivered</p>
                      <p className="text-[11px] text-gray-500 mt-1">May 23, 2026<br/>2:15pm</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Delivery Success Message */}
              <div className="mt-8 bg-[#dcfce7] rounded-lg p-3 flex items-center gap-2 text-sm text-green-800 font-medium">
                <CheckCircle2 size={18} className="text-green-600" />
                Your order has been delivered. Thank you for shopping with Petko!
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-[#fcf8f2] rounded-xl p-6 border border-orange-100 shadow-sm h-full">
                <h3 className="text-xl font-bold text-[#002B5B] mb-6">Order Summary</h3>
                
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
                        <span className="block font-bold text-[#002B5B] text-base">Total Amount</span>
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
    </div>
  );
}
