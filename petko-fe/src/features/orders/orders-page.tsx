import {
  CheckCircle2,
  RefreshCcw,
  MapPin,
  MessageCircle,
  Package,
  ClipboardList,
  Truck,
  Box,
} from 'lucide-react'
import petOrders from '../../assets/pet_orders.png'
import PageBanner from '@/components/layout/PageBanner'

export default function OrdersPage() {
  return (
    <div className="min-h-screen w-full bg-[#ecdab6] p-6 font-sans lg:p-10">
      <div className="w-full">

        <PageBanner
          title="Orders"
          subtitle="Track your companion's order from our warehouse to your home."
        />

        {/* Main Content Container */}
        <div className="flex flex-col gap-6">

          {/* TOP SECTION */}
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

              {/* Shipping Address */}
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

            {/* Right Group: Support box + illustration */}
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
                <img src={petOrders} alt="Pet decoration" className="absolute right-0 bottom-0 h-44 w-auto object-contain" />
              </div>

            </div>

          </div>

          {/* BOTTOM ROW: Order Progress + Order Summary */}
          <div className="flex flex-col gap-6 lg:flex-row">

            {/* Left: Order Progress */}
            <div className="flex-1 rounded-2xl border border-[#e1cba5] bg-[#fdf2e1] p-6 shadow-sm">
              <h3 className="text-xl font-bold text-[#10298E] mb-6">Order Progress</h3>

              <div className="relative px-2 md:px-4 py-4">
                <div className="hidden lg:block absolute top-[34px] left-12 right-12 h-1 bg-green-500 z-0"></div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 relative z-10">

                  {[
                    { icon: <Package size={22} />, label: 'Order Placed',    date: 'May 21, 2026', time: '10:30am', done: false },
                    { icon: <ClipboardList size={22} />, label: 'Processing', date: 'May 21, 2026', time: '2:45pm',  done: false },
                    { icon: <Box size={22} />, label: 'Out for Delivery',    date: 'May 23, 2026', time: '9:05am',  done: false },
                    { icon: <Truck size={22} />, label: 'Shipped',           date: 'May 22, 2026', time: '9:10am',  done: false },
                    { icon: <CheckCircle2 size={22} />, label: 'Delivered',  date: 'May 23, 2026', time: '2:15pm',  done: true  },
                  ].map((step) => (
                    <div key={step.label} className="flex lg:flex-col items-center gap-4 lg:gap-2 text-left lg:text-center">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm shrink-0 border-2 ${
                        step.done ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-green-500 text-[#10298E]'
                      }`}>
                        {step.icon}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#10298E] leading-tight">{step.label}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{step.date}<br />{step.time}</p>
                      </div>
                    </div>
                  ))}

                </div>
              </div>

              <div className="mt-6 bg-[#dcfce7] rounded-lg p-3 flex items-center gap-2 text-sm text-green-800 font-medium">
                <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                Your order has been delivered. Thank you for shopping with Petko!
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="w-full lg:w-[380px] shrink-0 rounded-2xl border border-[#e1cba5] bg-[#fdf2e1] p-6 shadow-sm">
              <h3 className="text-xl font-bold text-[#10298E] mb-6">Order Summary</h3>
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
  )
}
