import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BarChart3, CheckCircle2, RefreshCw, ShoppingBag, Users, Eye } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import PageBanner from '@/components/layout/PageBanner'
import { formatOrderMoney } from '@/lib/order-status'
import { formatAnalyticsDate, manilaToday, presetRange, rangeError } from './analytics-dates'
import AnalyticsTrends from './analytics-trends'
import { useAdminAnalytics } from './use-admin-analytics'
import type { AnalyticsRange, AnalyticsReport } from './analytics-types'

const ACTION = 'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petko-blue disabled:opacity-50 aria-pressed:border-petko-blue aria-pressed:bg-petko-blue aria-pressed:text-white'

function Metric({ label, value, detail, icon: Icon, accent = false }: { label: string; value: string; detail: string; icon: LucideIcon; accent?: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl border p-5 shadow-sm ${accent ? 'border-petko-blue bg-petko-blue text-white' : 'border-orange-200 bg-white text-petko-blue'}`}>
      <div className="flex items-center justify-between gap-2"><p className={`text-xs font-bold ${accent ? 'text-white/90' : 'text-gray-600'}`}>{label}</p><Icon size={19} aria-hidden="true" /></div>
      <p className="mt-3 break-words text-2xl font-black tabular-nums sm:text-3xl">{value}</p>
      <p className={`mt-2 text-xs ${accent ? 'text-white/90' : 'text-gray-600'}`}>{detail}</p>
    </div>
  )
}

function Report({ data }: { data: AnalyticsReport }) {
  const s = data.summary
  const noActivity = s.placedOrders === 0 && s.completedOrders === 0 && s.pageViews === 0
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950">
        <p className="font-bold">Visits recorded since {formatAnalyticsDate(data.collectionStartedAt)}. Earlier traffic is unavailable.</p>
        <p className="mt-1 text-xs">Guests are measured on the login page. Storefront visits require sign-in. Known admin sessions are excluded; anonymous admins cannot be identified until sign-in.</p>
      </div>
      {noActivity && <div className="rounded-xl border border-gray-200 bg-white p-6 text-center" role="status"><BarChart3 className="mx-auto mb-2 text-orange-600" aria-hidden="true" /><p className="font-bold text-petko-blue">No recorded activity in this period</p><p className="mt-1 text-sm text-gray-600">Try another date range. Traffic before collection started is unavailable.</p></div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Placed order value" value={formatOrderMoney(s.placedValue)} detail={`${s.placedOrders.toLocaleString()} noncancelled orders placed`} icon={ShoppingBag} accent />
        <Metric label="Completed sales" value={formatOrderMoney(s.completedSales)} detail={`${s.completedOrders.toLocaleString()} customer-confirmed receipts`} icon={CheckCircle2} />
        <Metric label="Browser sessions" value={s.sessions.toLocaleString()} detail={`${s.guestSessions.toLocaleString()} guest · ${s.customerSessions.toLocaleString()} signed-in`} icon={Eye} />
        <Metric label="Purchasing customers" value={s.buyers.toLocaleString()} detail={`${s.newBuyers.toLocaleString()} new · ${s.returningBuyers.toLocaleString()} returning`} icon={Users} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-orange-200 bg-white p-5 lg:col-span-2" aria-label="Page views">
          <h2 className="font-bold text-petko-blue">Page views</h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[['All page views', s.pageViews], ['Guest login views', s.guestPageViews], ['Customer views', s.customerPageViews]].map(([label, count]) => <div key={label}><p className="text-2xl font-black tabular-nums text-petko-blue">{count.toLocaleString()}</p><p className="mt-1 text-xs text-gray-600">{label}</p></div>)}
          </div>
          <p className="mt-4 text-xs text-gray-600">Sessions are browser visits, not unique people. A session ends after 30 minutes without a tracked page view. Guest sessions become signed-in sessions after login; page views retain their original audience.</p>
        </section>
        <section className="rounded-2xl border border-orange-200 bg-white p-5" aria-label="Buyer definitions">
          <h2 className="font-bold text-petko-blue">Who is buying?</h2>
          <p className="mt-3 text-sm text-gray-700"><strong>{s.newBuyers.toLocaleString()} new buyers</strong> made their first noncancelled purchase in this period.</p>
          <p className="mt-2 text-sm text-gray-700"><strong>{s.returningBuyers.toLocaleString()} returning buyers</strong> had purchased before this period.</p>
          <p className="mt-3 text-xs text-gray-600">Each buyer counts once, based on orders placed in the selected dates.</p>
        </section>
      </div>
      <AnalyticsTrends daily={data.daily} />
      <section className="overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm" aria-labelledby="analytics-products-heading">
        <div className="p-5"><h2 id="analytics-products-heading" className="font-bold text-petko-blue">Top products</h2><p className="mt-1 text-xs text-gray-600">Ranked by units in noncancelled orders placed during this period.</p></div>
        {data.topProducts.length === 0 ? <p className="border-t border-gray-100 p-5 text-sm text-gray-600">No product purchases in this period.</p> : <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Top products, scroll horizontally for all columns"><table className="w-full text-left text-sm"><caption className="sr-only">Ten best-selling products by units ordered</caption><thead className="bg-orange-50 text-xs text-gray-700"><tr><th scope="col" className="px-5 py-3">Product</th><th scope="col" className="px-5 py-3 text-right">Units</th><th scope="col" className="whitespace-nowrap px-5 py-3 text-right">Placed value</th></tr></thead><tbody className="divide-y divide-gray-100">{data.topProducts.map((product, index) => <tr key={product.productId}><th scope="row" className="min-w-40 px-5 py-4 font-semibold text-gray-800"><span className="mr-3 text-xs text-gray-500">{index + 1}.</span>{product.name}</th><td className="px-5 py-4 text-right tabular-nums">{product.units.toLocaleString()}</td><td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums text-petko-blue">{formatOrderMoney(product.placedValue)}</td></tr>)}</tbody></table></div>}
      </section>
      <section className="rounded-xl border border-gray-200 bg-white p-4 text-xs leading-relaxed text-gray-600" aria-label="How analytics are calculated">
        <p><strong className="text-gray-800">How to read these numbers.</strong> Placed value uses order dates; completed sales use customer receipt confirmation dates, even for orders placed earlier. Both show merchandise subtotals, exclude cancelled orders, and normally exclude shipping. Imported legacy orders retain their stored subtotals, which may include historical shipping. Completed sales indicate receipt confirmation, not verified COD cash collection.</p>
        <p className="mt-2">Product values use purchase-time quantities and prices. Traffic is approximate and can be blocked by browsers. All dates use Asia/Manila. Updated {new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.generatedAt))}.</p>
      </section>
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
