import { formatOrderMoney } from '@/lib/order-status'
import { formatAnalyticsDate } from './analytics-dates'
import type { AnalyticsDay } from './analytics-types'

export default function AnalyticsTrends({ daily }: { daily: AnalyticsDay[] }) {
  const maxValue = Math.max(1, ...daily.flatMap((day) => [day.placedValue, day.completedSales]))
  function points(field: 'placedValue' | 'completedSales'): string {
    return daily.map((day, index) => `${daily.length === 1 ? 300 : index / (daily.length - 1) * 600},${160 - day[field] / maxValue * 140}`).join(' ')
  }
  return (
    <section className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm" aria-labelledby="analytics-trends-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="analytics-trends-heading" className="font-bold text-petko-blue">Daily buying trends</h2>
          <p className="mt-1 text-xs text-gray-600">Merchandise value in PHP · Philippine time</p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-semibold">
          <span className="flex items-center gap-2 text-petko-blue"><span className="h-0.5 w-5 bg-petko-blue" />Placed value</span>
          <span className="flex items-center gap-2 text-orange-800"><span className="w-5 border-t-2 border-dashed border-orange-600" />Completed sales</span>
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-500">Scale up to {formatOrderMoney(maxValue)}</p>
      <svg viewBox="-5 0 610 175" className="mt-2 h-48 w-full" role="img" aria-label="Daily placed order value and completed sales. Exact values and traffic are in the daily data table below.">
        <path d="M0 20H600 M0 90H600 M0 160H600" className="stroke-gray-200" fill="none" />
        <polyline points={points('placedValue')} className="stroke-petko-blue" fill="none" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <polyline points={points('completedSales')} className="stroke-orange-600" fill="none" strokeWidth="3" strokeDasharray="7 5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        {daily.length === 1 && <circle cx="300" cy={160 - daily[0].placedValue / maxValue * 140} r="4" className="fill-petko-blue" />}
        {daily.length === 1 && <circle cx="300" cy={160 - daily[0].completedSales / maxValue * 140} r="4" className="fill-orange-600" />}
      </svg>
      <div className="flex justify-between gap-3 text-xs text-gray-600"><span>{daily[0] && formatAnalyticsDate(daily[0].date)}</span><span>{daily.at(-1) && formatAnalyticsDate(daily[daily.length - 1].date)}</span></div>
      <details className="mt-5 border-t border-gray-100 pt-4">
        <summary className="cursor-pointer rounded font-semibold text-petko-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petko-blue">View daily sales and visits</summary>
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200" tabIndex={0} role="region" aria-label="Daily analytics data, scroll horizontally for all columns">
          <table className="w-full whitespace-nowrap text-left text-xs">
            <caption className="sr-only">Daily analytics. A browser session crossing midnight can appear on both days; daily session counts may not add to the range total.</caption>
            <thead className="bg-orange-50 text-gray-700"><tr>{['Date', 'Placed orders', 'Placed value', 'Completed orders', 'Completed sales', 'Sessions', 'Page views'].map((label) => <th key={label} scope="col" className="px-4 py-3 font-bold">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{daily.map((day) => <tr key={day.date}><th scope="row" className="px-4 py-3 font-medium">{formatAnalyticsDate(day.date)}</th><td className="px-4 py-3">{day.placedOrders}</td><td className="px-4 py-3">{formatOrderMoney(day.placedValue)}</td><td className="px-4 py-3">{day.completedOrders}</td><td className="px-4 py-3">{formatOrderMoney(day.completedSales)}</td><td className="px-4 py-3">{day.sessions}</td><td className="px-4 py-3">{day.pageViews}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-600">A session spanning midnight counts on both days, but once in the range total.</p>
      </details>
    </section>
  )
}
