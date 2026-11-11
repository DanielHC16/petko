import { formatOrderMoney } from '@/lib/order-status'
import { formatAnalyticsDate } from './analytics-dates'
import type { AnalyticsDay } from './analytics-types'
import AnalyticsDailyTable from './analytics-daily-table'

export type AnalyticsMetricTab = 'placed_value' | 'completed_sales' | 'sessions' | 'customers'

interface AnalyticsTrendsProps {
  daily: AnalyticsDay[]
  activeTab?: AnalyticsMetricTab
}

export default function AnalyticsTrends({ daily, activeTab = 'placed_value' }: AnalyticsTrendsProps) {
  // Compute chart configuration according to the active tab
  let title = 'Daily Buying Trends'
  let subtitle = 'Merchandise value in PHP · Philippine time'
  let maxValue = 1
  let scaleText = ''

  if (activeTab === 'placed_value') {
    title = 'Daily Placed Value Trends'
    subtitle = 'Merchandise value from customer orders placed per day'
    maxValue = Math.max(1, ...daily.map((d) => d.placedValue))
    scaleText = `Scale up to ${formatOrderMoney(maxValue)}`
  } else if (activeTab === 'completed_sales') {
    title = 'Daily Completed Sales Trends'
    subtitle = 'Customer-confirmed delivery sales vs. placed merchandise intake'
    maxValue = Math.max(1, ...daily.flatMap((d) => [d.completedSales, d.placedValue]))
    scaleText = `Scale up to ${formatOrderMoney(maxValue)}`
  } else if (activeTab === 'sessions') {
    title = 'Daily Store Traffic Trends'
    subtitle = 'Browser sessions and total page view interactions per day'
    maxValue = Math.max(1, ...daily.flatMap((d) => [d.sessions, d.pageViews]))
    scaleText = `Scale up to ${maxValue.toLocaleString()} interactions`
  } else if (activeTab === 'customers') {
    title = 'Daily Customer Purchase Trends'
    subtitle = 'Daily order volume compared with total browsing sessions'
    maxValue = Math.max(1, ...daily.flatMap((d) => [d.placedOrders, d.sessions]))
    scaleText = `Scale up to ${maxValue.toLocaleString()} transactions / visits`
  }

  function getPoints(getValue: (d: AnalyticsDay) => number): string {
    return daily
      .map((day, index) => {
        const x = daily.length === 1 ? 300 : (index / (daily.length - 1)) * 600
        const y = 160 - (getValue(day) / maxValue) * 140
        return `${x},${y}`
      })
      .join(' ')
  }

  return (
    <section className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm" aria-labelledby="analytics-trends-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="analytics-trends-heading" className="font-bold text-petko-blue">{title}</h2>
          <p className="mt-1 text-xs text-gray-600">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-semibold">
          {activeTab === 'placed_value' && (
            <span className="flex items-center gap-2 text-petko-blue">
              <span className="h-0.5 w-5 bg-petko-blue" />
              Placed value (PHP)
            </span>
          )}
          {activeTab === 'completed_sales' && (
            <>
              <span className="flex items-center gap-2 text-orange-600">
                <span className="h-0.5 w-5 bg-orange-600" />
                Completed sales
              </span>
              <span className="flex items-center gap-2 text-gray-500">
                <span className="w-5 border-t-2 border-dashed border-gray-400" />
                Placed value (baseline)
              </span>
            </>
          )}
          {activeTab === 'sessions' && (
            <>
              <span className="flex items-center gap-2 text-petko-blue">
                <span className="h-0.5 w-5 bg-petko-blue" />
                Sessions
              </span>
              <span className="flex items-center gap-2 text-amber-600">
                <span className="w-5 border-t-2 border-dashed border-amber-500" />
                Page views
              </span>
            </>
          )}
          {activeTab === 'customers' && (
            <>
              <span className="flex items-center gap-2 text-petko-blue">
                <span className="h-0.5 w-5 bg-petko-blue" />
                Orders placed
              </span>
              <span className="flex items-center gap-2 text-gray-500">
                <span className="w-5 border-t-2 border-dashed border-gray-400" />
                Store sessions
              </span>
            </>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">{scaleText}</p>

      {/* SVG Trend Chart */}
      <svg viewBox="-5 0 610 175" className="mt-2 h-48 w-full" role="img" aria-label={`${title}. Detailed numbers are in the table below.`}>
        <path d="M0 20H600 M0 90H600 M0 160H600" className="stroke-gray-100" fill="none" strokeWidth="1" />

        {activeTab === 'placed_value' && (
          <>
            <polyline
              points={getPoints((d) => d.placedValue)}
              className="stroke-petko-blue"
              fill="none"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
            {daily.map((d, i) => {
              const x = daily.length === 1 ? 300 : (i / (daily.length - 1)) * 600
              const y = 160 - (d.placedValue / maxValue) * 140
              return <circle key={d.date} cx={x} cy={y} r={d.placedValue > 0 ? 3.5 : 2} className="fill-petko-blue hover:scale-150 transition-transform" />
            })}
          </>
        )}

        {activeTab === 'completed_sales' && (
          <>
            <polyline
              points={getPoints((d) => d.placedValue)}
              className="stroke-gray-300"
              fill="none"
              strokeWidth="2"
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
            <polyline
              points={getPoints((d) => d.completedSales)}
              className="stroke-orange-600"
              fill="none"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
            {daily.map((d, i) => {
              const x = daily.length === 1 ? 300 : (i / (daily.length - 1)) * 600
              const y = 160 - (d.completedSales / maxValue) * 140
              return <circle key={d.date} cx={x} cy={y} r={d.completedSales > 0 ? 3.5 : 2} className="fill-orange-600" />
            })}
          </>
        )}

        {activeTab === 'sessions' && (
          <>
            <polyline
              points={getPoints((d) => d.pageViews)}
              className="stroke-amber-500"
              fill="none"
              strokeWidth="2"
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
            <polyline
              points={getPoints((d) => d.sessions)}
              className="stroke-petko-blue"
              fill="none"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
            {daily.map((d, i) => {
              const x = daily.length === 1 ? 300 : (i / (daily.length - 1)) * 600
              const y = 160 - (d.sessions / maxValue) * 140
              return <circle key={d.date} cx={x} cy={y} r={d.sessions > 0 ? 3.5 : 2} className="fill-petko-blue" />
            })}
          </>
        )}

        {activeTab === 'customers' && (
          <>
            <polyline
              points={getPoints((d) => d.sessions)}
              className="stroke-gray-300"
              fill="none"
              strokeWidth="2"
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
            <polyline
              points={getPoints((d) => d.placedOrders)}
              className="stroke-petko-blue"
              fill="none"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
            {daily.map((d, i) => {
              const x = daily.length === 1 ? 300 : (i / (daily.length - 1)) * 600
              const y = 160 - (d.placedOrders / maxValue) * 140
              return <circle key={d.date} cx={x} cy={y} r={d.placedOrders > 0 ? 3.5 : 2} className="fill-petko-blue" />
            })}
          </>
        )}
      </svg>

      <div className="flex justify-between gap-3 text-xs text-gray-500 mt-2">
        <span>{daily[0] && formatAnalyticsDate(daily[0].date)}</span>
        <span>{daily.at(-1) && formatAnalyticsDate(daily[daily.length - 1].date)}</span>
      </div>

      {/* Daily Data Table with Activity Filtering, Search, Sort & Pagination */}
      <AnalyticsDailyTable daily={daily} activeTab={activeTab} />
    </section>
  )
}
