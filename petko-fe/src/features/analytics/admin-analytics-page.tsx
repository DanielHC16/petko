import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BarChart3, CheckCircle2, RefreshCw, ShoppingBag, Users, Eye } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import PageBanner from '@/components/layout/PageBanner'
import { formatOrderMoney } from '@/lib/order-status'
import { formatAnalyticsDate, manilaToday, presetRange, rangeError } from './analytics-dates'
import type { AnalyticsMetricTab } from './analytics-trends'
import AnalyticsDedicatedView from './analytics-dedicated-view'
import { useAdminAnalytics } from './use-admin-analytics'
import type { AnalyticsRange, AnalyticsReport } from './analytics-types'

const ACTION = 'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petko-blue disabled:opacity-50 aria-pressed:border-petko-blue aria-pressed:bg-petko-blue aria-pressed:text-white'

function MetricTabButton({
  label,
  value,
  detail,
  icon: Icon,
  isActive,
  onClick,
}: {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={`group relative flex flex-col justify-between text-left min-w-0 rounded-2xl border p-5 shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petko-blue ${
        isActive
          ? 'border-petko-blue bg-petko-blue text-white shadow-md ring-2 ring-petko-blue/20'
          : 'border-orange-200 bg-white text-petko-blue hover:border-orange-300 hover:shadow-md cursor-pointer'
      }`}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <p className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
          {label}
        </p>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
            isActive ? 'bg-white/15 text-white' : 'bg-orange-50 text-orange-600 group-hover:bg-orange-100'
          }`}
        >
          <Icon size={18} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 break-words text-2xl font-black tabular-nums sm:text-3xl">
        {value}
      </p>
      <div className="mt-3 flex items-center justify-between border-t pt-2.5 w-full border-current/10">
        <p className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-600'}`}>
          {detail}
        </p>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            isActive ? 'bg-white text-petko-blue font-extrabold' : 'bg-orange-100 text-orange-700'
          }`}
        >
          {isActive ? 'Active View' : 'Select'}
        </span>
      </div>
    </button>
  )
}

function Report({ data }: { data: AnalyticsReport }) {
  const [activeTab, setActiveTab] = useState<AnalyticsMetricTab>('placed_value')
  const s = data.summary
  const noActivity = s.placedOrders === 0 && s.completedOrders === 0 && s.pageViews === 0

  return (
    <div className="space-y-6">
      {noActivity && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center" role="status">
          <BarChart3 className="mx-auto mb-2 text-orange-600" aria-hidden="true" />
          <p className="font-bold text-petko-blue">No recorded activity in this period</p>
          <p className="mt-1 text-sm text-gray-600">Try another date range.</p>
        </div>
      )}

      {/* 4 Clickable Metric Cards as Tabs */}
      <div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        role="tablist"
        aria-label="Analytics metric sections"
      >
        <MetricTabButton
          label="Placed order value"
          value={formatOrderMoney(s.placedValue)}
          detail={`${s.placedOrders.toLocaleString()} noncancelled orders`}
          icon={ShoppingBag}
          isActive={activeTab === 'placed_value'}
          onClick={() => setActiveTab('placed_value')}
        />
        <MetricTabButton
          label="Completed sales"
          value={formatOrderMoney(s.completedSales)}
          detail={`${s.completedOrders.toLocaleString()} confirmed receipts`}
          icon={CheckCircle2}
          isActive={activeTab === 'completed_sales'}
          onClick={() => setActiveTab('completed_sales')}
        />
        <MetricTabButton
          label="Browser sessions"
          value={s.sessions.toLocaleString()}
          detail={`${s.guestSessions.toLocaleString()} guest · ${s.customerSessions.toLocaleString()} signed-in`}
          icon={Eye}
          isActive={activeTab === 'sessions'}
          onClick={() => setActiveTab('sessions')}
        />
        <MetricTabButton
          label="Purchasing customers"
          value={s.buyers.toLocaleString()}
          detail={`${s.newBuyers.toLocaleString()} new · ${s.returningBuyers.toLocaleString()} returning`}
          icon={Users}
          isActive={activeTab === 'customers'}
          onClick={() => setActiveTab('customers')}
        />
      </div>

      {/* Dedicated statistics & analytics for the active tab */}
      <AnalyticsDedicatedView tab={activeTab} report={data} />
    </div>
  )
}

function DateFilters({ range, error, onApply }: { range: AnalyticsRange; error: string | null; onApply: (range: AnalyticsRange) => void }) {
  const [draft, setDraft] = useState(range)
  const [draftError, setDraftError] = useState<string | null>(null)
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const message = rangeError(draft)
    setDraftError(message)
    if (!message) onApply(draft)
  }
  return (
    <section className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm" aria-label="Analytics date filters">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-bold text-petko-blue">Reporting period</h2><p className="mt-1 text-xs text-gray-600">Inclusive dates · Philippine time (Asia/Manila)</p></div>
        <div className="flex flex-wrap gap-2" aria-label="Quick date ranges">{[7, 30, 90].map((days) => <button key={days} type="button" onClick={() => onApply(presetRange(days))} className={ACTION} aria-pressed={range.start === presetRange(days).start && range.end === presetRange(days).end}>Last {days} days</button>)}</div>
      </div>
      <form className="mt-4 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-end" onSubmit={submit}>
        <div className="min-w-0 flex-1 sm:flex-none"><label htmlFor="analytics-start" className="mb-1 block text-xs font-bold text-gray-700">Start date</label><input id="analytics-start" type="date" required max={manilaToday()} value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} className="w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-petko-blue focus:outline-none focus:ring-2 focus:ring-petko-blue/20" /></div>
        <div className="min-w-0 flex-1 sm:flex-none"><label htmlFor="analytics-end" className="mb-1 block text-xs font-bold text-gray-700">End date</label><input id="analytics-end" type="date" required max={manilaToday()} value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} className="w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-petko-blue focus:outline-none focus:ring-2 focus:ring-petko-blue/20" /></div>
        <button type="submit" className="rounded-xl bg-petko-blue px-5 py-2 text-sm font-bold text-white transition hover:bg-petko-blue-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petko-blue">Apply dates</button>
      </form>
      {(draftError || error) && <p role="alert" className="mt-3 text-sm font-semibold text-red-800">{draftError || error}</p>}
    </section>
  )
}

export default function AdminAnalyticsPage() {
  const [params, setParams] = useSearchParams()
  const defaults = presetRange(30)
  const range = { start: params.get('start') ?? defaults.start, end: params.get('end') ?? defaults.end }
  const validation = (params.has('start') !== params.has('end')) ? 'Choose both start and end dates.' : rangeError(range)
  const report = useAdminAnalytics(range, !validation)
  function apply(next: AnalyticsRange): void { setParams({ start: next.start, end: next.end }) }
  return (
    <div className="min-h-screen w-full min-w-0 bg-petko-cream p-6 font-sans lg:p-10">
      <PageBanner title="Store Analytics" subtitle="Understand buying, repeat customers, and visits to Petko.">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-orange-100 bg-orange-50/60 px-6 py-3 sm:px-8">
          <Link to="/admin" className="inline-flex items-center gap-2 rounded-lg bg-petko-blue px-3 py-2 text-xs font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petko-blue"><ArrowLeft size={14} aria-hidden="true" />Back to Admin Portal</Link>
          <button type="button" className={ACTION} onClick={report.refresh} disabled={report.isLoading || Boolean(validation)}><RefreshCw size={15} aria-hidden="true" className={report.isLoading ? 'animate-spin motion-reduce:animate-none' : ''} />Refresh analytics</button>
        </div>
      </PageBanner>
      <div className="mx-auto max-w-screen-xl space-y-5">
        <DateFilters key={`${range.start}:${range.end}`} range={range} error={validation} onApply={apply} />
        {!validation && <p className="text-sm font-semibold text-gray-700">{formatAnalyticsDate(range.start)} – {formatAnalyticsDate(range.end)}</p>}
        {report.isLoading && <div role="status" className="rounded-2xl border border-orange-200 bg-white p-12 text-center text-sm font-semibold text-petko-blue">Loading analytics…</div>}
        {report.error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900"><p>{report.error}</p><button type="button" onClick={report.refresh} className="mt-3 rounded font-bold underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-800">Retry analytics</button></div>}
        {!validation && report.data && <Report data={report.data} />}
      </div>
    </div>
  )
}
