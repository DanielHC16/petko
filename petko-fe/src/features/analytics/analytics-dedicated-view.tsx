import {
  ShoppingBag,
  CheckCircle2,
  Eye,
  Users,
  TrendingUp,
  Package,
  Calendar,
  Layers,
  ArrowUpRight,
} from 'lucide-react'
import { formatOrderMoney } from '@/lib/order-status'
import { formatAnalyticsDate } from './analytics-dates'
import type { AnalyticsReport } from './analytics-types'
import AnalyticsTrends, { type AnalyticsMetricTab } from './analytics-trends'

interface AnalyticsDedicatedViewProps {
  tab: AnalyticsMetricTab
  report: AnalyticsReport
}

export default function AnalyticsDedicatedView({ tab, report }: AnalyticsDedicatedViewProps) {
  const s = report.summary
  const dailyList = Array.isArray(report.daily) ? report.daily : []

  // Find peak day by placed value
  const peakDay = dailyList.reduce(
    (max, day) => (day.placedValue > (max?.placedValue ?? 0) ? day : max),
    dailyList[0],
  )

  const aov = s.placedOrders > 0 ? s.placedValue / s.placedOrders : 0
  const avgCompleted = s.completedOrders > 0 ? s.completedSales / s.completedOrders : 0
  const confirmationRate = s.placedOrders > 0 ? (s.completedOrders / s.placedOrders) * 100 : 0
  const avgPagesPerSession = s.sessions > 0 ? (s.pageViews / s.sessions).toFixed(1) : '0'
  const guestSessionPct = s.sessions > 0 ? Math.round((s.guestSessions / s.sessions) * 100) : 0
  const customerSessionPct = s.sessions > 0 ? Math.round((s.customerSessions / s.sessions) * 100) : 0
  const newBuyerPct = s.buyers > 0 ? Math.round((s.newBuyers / s.buyers) * 100) : 0
  const returningBuyerPct = s.buyers > 0 ? Math.round((s.returningBuyers / s.buyers) * 100) : 0
  const avgSpendPerBuyer = s.buyers > 0 ? s.placedValue / s.buyers : 0
  const ordersPerBuyer = s.buyers > 0 ? (s.placedOrders / s.buyers).toFixed(1) : '0'

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          TAB 1: PLACED ORDER VALUE
          ───────────────────────────────────────────────────────────── */}
      {tab === 'placed_value' && (
        <div className="space-y-5">
          {/* Section banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-200/60 pb-3">
            <div>
              <h2 className="text-xl font-black text-petko-blue flex items-center gap-2">
                <ShoppingBag className="text-petko-blue" size={22} />
                Placed Order Value Statistics
              </h2>
              <p className="mt-0.5 text-xs text-gray-600">
                Gross merchandise revenue from all customer orders placed during this reporting window.
              </p>
            </div>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-petko-blue">
              {s.placedOrders.toLocaleString()} noncancelled orders
            </span>
          </div>

          {/* Sub-KPI cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-bold uppercase tracking-wider">Gross Placed Value</span>
                <ShoppingBag size={18} className="text-petko-blue" />
              </div>
              <p className="mt-2 text-2xl font-black text-petko-blue tabular-nums">
                {formatOrderMoney(s.placedValue)}
              </p>
              <p className="mt-1 text-xs text-gray-500">Total order intake</p>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-bold uppercase tracking-wider">Average Order Value (AOV)</span>
                <TrendingUp size={18} className="text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-emerald-700 tabular-nums">
                {formatOrderMoney(aov)}
              </p>
              <p className="mt-1 text-xs text-gray-500">Average spend per checkout</p>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-bold uppercase tracking-wider">Peak Intake Day</span>
                <Calendar size={18} className="text-amber-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-gray-800 tabular-nums">
                {peakDay ? formatOrderMoney(peakDay.placedValue) : '₱0.00'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {peakDay && peakDay.placedValue > 0 ? formatAnalyticsDate(peakDay.date) : 'No orders in period'}
              </p>
            </div>
          </div>

          {/* Dedicated Chart */}
          <AnalyticsTrends daily={dailyList} activeTab="placed_value" />

          {/* Top ordered products table */}
          <section className="overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm" aria-labelledby="analytics-top-products-heading">
            <div className="p-5 flex items-center justify-between border-b border-gray-100">
              <div>
                <h3 id="analytics-top-products-heading" className="font-bold text-petko-blue text-base flex items-center gap-2">
                  <Package size={18} className="text-orange-500" />
                  Top Ordered Products
                </h3>
                <p className="mt-0.5 text-xs text-gray-600">Ranked by units ordered across noncancelled orders.</p>
              </div>
              <span className="text-xs font-semibold text-gray-500">
                {report.topProducts.length} items ranked
              </span>
            </div>

            {report.topProducts.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">No product purchases recorded in this period.</p>
            ) : (
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Top products table">
                <table className="w-full text-left text-sm">
                  <thead className="bg-orange-50/70 text-xs text-gray-700 font-bold">
                    <tr>
                      <th scope="col" className="px-5 py-3">Rank &amp; Product</th>
                      <th scope="col" className="px-5 py-3 text-right">Units Sold</th>
                      <th scope="col" className="px-5 py-3 text-right">Placed Value</th>
                      <th scope="col" className="px-5 py-3 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.topProducts.map((product, index) => {
                      const share = s.placedValue > 0 ? ((product.placedValue / s.placedValue) * 100).toFixed(1) : '0'
                      return (
                        <tr key={product.productId} className="hover:bg-gray-50/60 transition-colors">
                          <th scope="row" className="min-w-44 px-5 py-4 font-semibold text-gray-800">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-700 mr-3">
                              {index + 1}
                            </span>
                            {product.name}
                          </th>
                          <td className="px-5 py-4 text-right tabular-nums font-semibold text-gray-700">
                            {product.units.toLocaleString()} units
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-right font-bold tabular-nums text-petko-blue">
                            {formatOrderMoney(product.placedValue)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-right tabular-nums text-xs text-gray-500">
                            {share}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: COMPLETED SALES
          ───────────────────────────────────────────────────────────── */}
      {tab === 'completed_sales' && (
        <div className="space-y-5">
          {/* Section banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-200/60 pb-3">
            <div>
              <h2 className="text-xl font-black text-petko-blue flex items-center gap-2">
                <CheckCircle2 className="text-orange-600" size={22} />
                Completed Sales Statistics
              </h2>
              <p className="mt-0.5 text-xs text-gray-600">
                Delivered merchandise with customer-confirmed receipts during this period.
              </p>
            </div>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
              {s.completedOrders.toLocaleString()} confirmed deliveries
            </span>
          </div>

          {/* Sub-KPI cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-bold uppercase tracking-wider">Confirmed Sales</span>
                <CheckCircle2 size={18} className="text-orange-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-orange-600 tabular-nums">
                {formatOrderMoney(s.completedSales)}
              </p>
              <p className="mt-1 text-xs text-gray-500">Customer-confirmed merchandise</p>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-bold uppercase tracking-wider">Average Confirmed Order</span>
                <TrendingUp size={18} className="text-petko-blue" />
              </div>
              <p className="mt-2 text-2xl font-black text-petko-blue tabular-nums">
                {formatOrderMoney(avgCompleted)}
              </p>
              <p className="mt-1 text-xs text-gray-500">Per confirmed delivery receipt</p>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-bold uppercase tracking-wider">Confirmation Rate</span>
                <ArrowUpRight size={18} className="text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-emerald-700 tabular-nums">
                {confirmationRate.toFixed(1)}%
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {s.completedOrders} of {s.placedOrders} placed orders confirmed
              </p>
            </div>
          </div>

          {/* Realization breakdown bar */}
          <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-petko-blue text-sm">Order Value Realization Pipeline</h3>
            <div className="h-4 w-full overflow-hidden rounded-full bg-gray-100 flex">
              <div
                style={{ width: `${s.placedValue > 0 ? Math.min(100, (s.completedSales / s.placedValue) * 100) : 0}%` }}
                className="bg-orange-500 transition-all duration-500"
                title={`Completed Sales: ${formatOrderMoney(s.completedSales)}`}
              />
              <div
                style={{ width: `${s.placedValue > 0 ? Math.max(0, 100 - (s.completedSales / s.placedValue) * 100) : 100}%` }}
                className="bg-blue-100 transition-all duration-500"
                title={`Pending Confirmation: ${formatOrderMoney(Math.max(0, s.placedValue - s.completedSales))}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-orange-500 shrink-0" />
                <div>
                  <p className="font-bold text-gray-800">Confirmed Sales: {formatOrderMoney(s.completedSales)}</p>
                  <p className="text-gray-500">Orders verified and received by customers</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-200 shrink-0" />
                <div>
                  <p className="font-bold text-gray-800">
                    In Transit / Pending: {formatOrderMoney(Math.max(0, s.placedValue - s.completedSales))}
                  </p>
                  <p className="text-gray-500">Processing, shipped, or awaiting receipt confirmation</p>
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated Chart */}
          <AnalyticsTrends daily={dailyList} activeTab="completed_sales" />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: BROWSER SESSIONS & TRAFFIC
          ───────────────────────────────────────────────────────────── */}
      {tab === 'sessions' && (
        <div className="space-y-5">
          {/* Section banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-200/60 pb-3">
            <div>
              <h2 className="text-xl font-black text-petko-blue flex items-center gap-2">
                <Eye className="text-petko-blue" size={22} />
                Browser Sessions &amp; Traffic Statistics
              </h2>
              <p className="mt-0.5 text-xs text-gray-600">
                Visitor browsing patterns, guest explorations, and authenticated customer journeys.
              </p>
            </div>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-petko-blue">
              {s.sessions.toLocaleString()} total sessions
            </span>
          </div>

          {/* Sub-KPI cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-bold uppercase tracking-wider">Total Sessions</span>
                <Eye size={18} className="text-petko-blue" />
              </div>
              <p className="mt-2 text-2xl font-black text-petko-blue tabular-nums">
                {s.sessions.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-gray-500">{s.pageViews.toLocaleString()} total page interactions</p>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-bold uppercase tracking-wider">Browsing Depth</span>
                <Layers size={18} className="text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-emerald-700 tabular-nums">
                {avgPagesPerSession}
              </p>
              <p className="mt-1 text-xs text-gray-500">Average page views per visit</p>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-bold uppercase tracking-wider">Customer Sign-in Rate</span>
                <Users size={18} className="text-amber-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-gray-800 tabular-nums">
                {customerSessionPct}%
              </p>
              <p className="mt-1 text-xs text-gray-500">{s.customerSessions} authenticated visits</p>
            </div>
          </div>

          {/* Breakdown cards: Sessions vs Pageviews */}
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm" aria-label="Session audience breakdown">
              <h3 className="font-bold text-petko-blue text-sm mb-3">Session Audience Distribution</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Guest Visitors</span>
                  <span className="font-bold text-gray-800">{s.guestSessions} ({guestSessionPct}%)</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div style={{ width: `${guestSessionPct}%` }} className="h-full bg-amber-500 rounded-full" />
                </div>

                <div className="flex justify-between text-xs pt-1">
                  <span className="text-gray-600">Signed-in Customers</span>
                  <span className="font-bold text-gray-800">{s.customerSessions} ({customerSessionPct}%)</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div style={{ width: `${customerSessionPct}%` }} className="h-full bg-petko-blue rounded-full" />
                </div>
              </div>
              <p className="mt-4 text-[11px] text-gray-400">
                Sessions end automatically after 30 minutes of inactivity. Guest sessions transition to signed-in upon login.
              </p>
            </section>

            <section className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm" aria-label="Page views by category">
              <h3 className="font-bold text-petko-blue text-sm mb-3">Page Views Breakdown</h3>
              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="rounded-xl bg-orange-50/60 p-3">
                  <p className="text-xl font-black text-petko-blue tabular-nums">{s.pageViews.toLocaleString()}</p>
                  <p className="text-[11px] font-semibold text-gray-600 mt-1">All Views</p>
                </div>
                <div className="rounded-xl bg-amber-50/60 p-3">
                  <p className="text-xl font-black text-amber-900 tabular-nums">{s.guestPageViews.toLocaleString()}</p>
                  <p className="text-[11px] font-semibold text-gray-600 mt-1">Guest Views</p>
                </div>
                <div className="rounded-xl bg-blue-50/60 p-3">
                  <p className="text-xl font-black text-petko-blue tabular-nums">{s.customerPageViews.toLocaleString()}</p>
                  <p className="text-[11px] font-semibold text-gray-600 mt-1">Customer Views</p>
                </div>
              </div>
              <p className="mt-4 text-[11px] text-gray-400">
                Tracks catalog discovery, cart changes, checkout progressions, and order tracking views.
              </p>
            </section>
          </div>

          {/* Dedicated Chart */}
          <AnalyticsTrends daily={dailyList} activeTab="sessions" />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: PURCHASING CUSTOMERS & COHORTS
          ───────────────────────────────────────────────────────────── */}
      {tab === 'customers' && (
        <div className="space-y-5">
          {/* Section banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-200/60 pb-3">
            <div>
              <h2 className="text-xl font-black text-petko-blue flex items-center gap-2">
                <Users className="text-petko-blue" size={22} />
                Purchasing Customer &amp; Cohort Statistics
              </h2>
              <p className="mt-0.5 text-xs text-gray-600">
                Customer acquisition metrics, first-time purchasers vs returning customer retention.
              </p>
            </div>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-petko-blue">
              {s.buyers.toLocaleString()} purchasing customers
            </span>
          </div>

          {/* Sub-KPI cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-bold uppercase tracking-wider">Total Buyers</span>
                <Users size={18} className="text-petko-blue" />
              </div>
              <p className="mt-2 text-2xl font-black text-petko-blue tabular-nums">
                {s.buyers.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-gray-500">Active buyers in this period</p>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-bold uppercase tracking-wider">Average Customer Spend</span>
                <TrendingUp size={18} className="text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-emerald-700 tabular-nums">
                {formatOrderMoney(avgSpendPerBuyer)}
              </p>
              <p className="mt-1 text-xs text-gray-500">Total revenue generated per buyer</p>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-bold uppercase tracking-wider">Order Frequency</span>
                <Package size={18} className="text-amber-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-gray-800 tabular-nums">
                {ordersPerBuyer}
              </p>
              <p className="mt-1 text-xs text-gray-500">Orders placed per customer</p>
            </div>
          </div>

          {/* Cohort comparison cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-petko-blue text-sm">Customer Acquisition &amp; Cohort Ratio</h3>
              <div className="h-3.5 w-full rounded-full bg-gray-100 overflow-hidden flex">
                <div
                  style={{ width: `${newBuyerPct}%` }}
                  className="bg-emerald-500 transition-all duration-500"
                  title={`New Buyers: ${s.newBuyers} (${newBuyerPct}%)`}
                />
                <div
                  style={{ width: `${returningBuyerPct}%` }}
                  className="bg-petko-blue transition-all duration-500"
                  title={`Returning Buyers: ${s.returningBuyers} (${returningBuyerPct}%)`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <p className="text-lg font-black text-emerald-800 tabular-nums">{s.newBuyers.toLocaleString()}</p>
                  <p className="font-bold text-emerald-950 mt-0.5">New Buyers ({newBuyerPct}%)</p>
                  <p className="text-gray-500 text-[11px] mt-1">Made their first-ever noncancelled purchase in this period.</p>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                  <p className="text-lg font-black text-petko-blue tabular-nums">{s.returningBuyers.toLocaleString()}</p>
                  <p className="font-bold text-petko-blue mt-0.5">Returning Buyers ({returningBuyerPct}%)</p>
                  <p className="text-gray-500 text-[11px] mt-1">Repeat customers who ordered in a previous period.</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-petko-blue text-sm">Retention Insights</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                During this reporting range, <strong>{s.newBuyers.toLocaleString()} new customers</strong> were acquired.
                {s.returningBuyers > 0
                  ? ` Repeat orders from ${s.returningBuyers.toLocaleString()} returning customers show ongoing retention.`
                  : ' No returning buyers recorded in this date range; focus on nurture campaigns to drive reorders.'}
              </p>
              <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50/50 p-3.5 text-xs text-gray-700">
                <p className="font-bold text-petko-blue">Cohort Counting Rule</p>
                <p className="mt-1 text-gray-600">
                  Each buyer is counted once per selected date range based on noncancelled orders placed in Philippine Time (Asia/Manila).
                </p>
              </div>
            </div>
          </div>

          {/* Dedicated Chart */}
          <AnalyticsTrends daily={dailyList} activeTab="customers" />
        </div>
      )}
    </div>
  )
}
