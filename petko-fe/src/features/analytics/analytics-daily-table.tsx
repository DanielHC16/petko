import { useState, useMemo } from 'react'
import {
  Filter,
  ArrowUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Calendar,
  Sparkles,
} from 'lucide-react'
import { formatOrderMoney } from '@/lib/order-status'
import { formatAnalyticsDate } from './analytics-dates'
import type { AnalyticsDay } from './analytics-types'
import type { AnalyticsMetricTab } from './analytics-trends'

type ActivityFilter = 'all' | 'active' | 'orders' | 'traffic'
type SortOrder = 'desc' | 'asc'

interface AnalyticsDailyTableProps {
  daily: AnalyticsDay[]
  activeTab?: AnalyticsMetricTab
}

export default function AnalyticsDailyTable({
  daily,
  activeTab = 'placed_value',
}: AnalyticsDailyTableProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [pageSize, setPageSize] = useState<number>(7)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Compute summary activity counts
  const totalDays = daily.length
  const activeDaysCount = useMemo(
    () =>
      daily.filter(
        (d) => d.placedOrders > 0 || d.completedOrders > 0 || d.sessions > 0 || d.pageViews > 0,
      ).length,
    [daily],
  )

  const ordersDaysCount = useMemo(
    () => daily.filter((d) => d.placedOrders > 0 || d.completedOrders > 0).length,
    [daily],
  )

  const trafficDaysCount = useMemo(
    () => daily.filter((d) => d.sessions > 0 || d.pageViews > 0).length,
    [daily],
  )

  // Filter and sort the daily records
  const filteredDays = useMemo(() => {
    let result = [...daily]

    // Activity filter
    if (activityFilter === 'active') {
      result = result.filter(
        (d) => d.placedOrders > 0 || d.completedOrders > 0 || d.sessions > 0 || d.pageViews > 0,
      )
    } else if (activityFilter === 'orders') {
      result = result.filter((d) => d.placedOrders > 0 || d.completedOrders > 0)
    } else if (activityFilter === 'traffic') {
      result = result.filter((d) => d.sessions > 0 || d.pageViews > 0)
    }

    // Search query filter (matches YYYY-MM-DD or formatted "Nov 12, 2026")
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((d) => {
        const formatted = formatAnalyticsDate(d.date).toLowerCase()
        return d.date.toLowerCase().includes(q) || formatted.includes(q)
      })
    }

    // Sort order: default desc (newest first)
    result.sort((a, b) =>
      sortOrder === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date),
    )

    return result
  }, [daily, activityFilter, searchQuery, sortOrder])

  // Pagination calculation
  const totalFiltered = filteredDays.length
  const effectivePageSize = pageSize === 0 ? Math.max(1, totalFiltered) : pageSize
  const totalPages = Math.max(1, Math.ceil(totalFiltered / effectivePageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * effectivePageSize
  const paginatedDays = filteredDays.slice(startIndex, startIndex + effectivePageSize)

  function handleFilterChange(filter: ActivityFilter): void {
    setActivityFilter(filter)
    setCurrentPage(1)
  }

  function handleSearchChange(query: string): void {
    setSearchQuery(query)
    setCurrentPage(1)
  }

  function handleSortToggle(): void {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
    setCurrentPage(1)
  }

  function handlePageSizeChange(size: number): void {
    setPageSize(size)
    setCurrentPage(1)
  }

  function resetFilters(): void {
    setActivityFilter('all')
    setSearchQuery('')
    setCurrentPage(1)
  }

  return (
    <div className="mt-6 border-t border-gray-100 pt-5">
      {/* Accordion / Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="group flex items-center gap-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petko-blue rounded-lg"
          aria-expanded={isOpen}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-petko-blue group-hover:bg-orange-200 transition">
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-petko-blue">
                Daily Sales &amp; Visits Breakdown
              </h3>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-petko-blue border border-blue-200">
                {totalDays} days
              </span>
              {activeDaysCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                  <Sparkles size={11} className="text-emerald-600" />
                  {activeDaysCount} active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {isOpen
                ? 'Filtered tabular breakdown of daily revenue, confirmed sales, and visits.'
                : 'Click to expand daily breakdown table.'}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="text-xs font-semibold text-petko-blue hover:underline"
        >
          {isOpen ? 'Hide table' : 'Show table'}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-3.5">
          {/* Controls Bar: Filters, Search, Sort */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-200/70 bg-orange-50/40 p-3">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter daily records">
              <span className="mr-1 text-xs font-bold text-gray-600 flex items-center gap-1">
                <Filter size={13} className="text-petko-blue" />
                Filter:
              </span>
              <button
                type="button"
                onClick={() => handleFilterChange('all')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petko-blue ${
                  activityFilter === 'all'
                    ? 'bg-petko-blue text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-orange-50'
                }`}
              >
                All Days ({totalDays})
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('active')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petko-blue ${
                  activityFilter === 'active'
                    ? 'bg-petko-blue text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-orange-50'
                }`}
              >
                Active Only ({activeDaysCount})
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('orders')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petko-blue ${
                  activityFilter === 'orders'
                    ? 'bg-petko-blue text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-orange-50'
                }`}
              >
                Orders ({ordersDaysCount})
              </button>
              <button
                type="button"
                onClick={() => handleFilterChange('traffic')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-petko-blue ${
                  activityFilter === 'traffic'
                    ? 'bg-petko-blue text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-orange-50'
                }`}
              >
                Visits ({trafficDaysCount})
              </button>
            </div>

            {/* Search and Sort Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search date..."
                  className="h-8 rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-xs text-gray-800 placeholder-gray-400 focus:border-petko-blue focus:outline-none focus:ring-1 focus:ring-petko-blue"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600"
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleSortToggle}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 text-xs font-semibold text-gray-700 hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-petko-blue"
                title={`Currently sorted ${sortOrder === 'desc' ? 'newest first' : 'oldest first'}. Click to reverse.`}
              >
                <ArrowUpDown size={13} className="text-petko-blue" />
                <span>{sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          {totalFiltered === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center" role="status">
              <Calendar className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-bold text-gray-700">No days match your selected filters</p>
              <p className="mt-1 text-xs text-gray-500">
                {activityFilter !== 'all'
                  ? 'No activity found with the current filter in this reporting range.'
                  : 'No dates matched your search term.'}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-petko-blue hover:bg-orange-50"
              >
                <RotateCcw size={12} /> Reset filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm" tabIndex={0} role="region" aria-label="Daily analytics table">
              <table className="w-full whitespace-nowrap text-left text-xs">
                <thead className="bg-orange-50/80 text-gray-700">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-bold">
                      Date
                    </th>
                    <th
                      scope="col"
                      className={`px-4 py-3 font-bold text-right transition-colors ${
                        activeTab === 'placed_value' || activeTab === 'customers'
                          ? 'bg-blue-50/80 text-petko-blue font-black'
                          : ''
                      }`}
                    >
                      Placed orders
                    </th>
                    <th
                      scope="col"
                      className={`px-4 py-3 font-bold text-right transition-colors ${
                        activeTab === 'placed_value'
                          ? 'bg-blue-50/80 text-petko-blue font-black'
                          : ''
                      }`}
                    >
                      Placed value
                    </th>
                    <th
                      scope="col"
                      className={`px-4 py-3 font-bold text-right transition-colors ${
                        activeTab === 'completed_sales'
                          ? 'bg-orange-100/70 text-orange-800 font-black'
                          : ''
                      }`}
                    >
                      Completed orders
                    </th>
                    <th
                      scope="col"
                      className={`px-4 py-3 font-bold text-right transition-colors ${
                        activeTab === 'completed_sales'
                          ? 'bg-orange-100/70 text-orange-800 font-black'
                          : ''
                      }`}
                    >
                      Completed sales
                    </th>
                    <th
                      scope="col"
                      className={`px-4 py-3 font-bold text-right transition-colors ${
                        activeTab === 'sessions'
                          ? 'bg-amber-50 text-amber-900 font-black'
                          : ''
                      }`}
                    >
                      Sessions
                    </th>
                    <th
                      scope="col"
                      className={`px-4 py-3 font-bold text-right transition-colors ${
                        activeTab === 'sessions'
                          ? 'bg-amber-50 text-amber-900 font-black'
                          : ''
                      }`}
                    >
                      Page views
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedDays.map((day) => {
                    const hasOrders = day.placedOrders > 0 || day.completedOrders > 0
                    const hasTraffic = day.sessions > 0 || day.pageViews > 0
                    const hasAnyActivity = hasOrders || hasTraffic

                    return (
                      <tr
                        key={day.date}
                        className={`transition-colors ${
                          hasAnyActivity ? 'bg-white hover:bg-orange-50/40' : 'bg-gray-50/20 hover:bg-gray-50/60'
                        }`}
                      >
                        <th scope="row" className="px-4 py-3 font-medium text-gray-800">
                          <div className="flex items-center gap-2">
                            {hasOrders ? (
                              <span
                                className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"
                                title="Orders recorded"
                              />
                            ) : hasTraffic ? (
                              <span
                                className="h-2 w-2 rounded-full bg-petko-blue shrink-0"
                                title="Visitor traffic recorded"
                              />
                            ) : (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-gray-300 shrink-0"
                                title="No recorded activity"
                              />
                            )}
                            <span className={hasAnyActivity ? 'font-bold text-gray-900' : 'text-gray-600'}>
                              {formatAnalyticsDate(day.date)}
                            </span>
                          </div>
                        </th>

                        {/* Placed orders */}
                        <td
                          className={`px-4 py-3 text-right tabular-nums ${
                            activeTab === 'placed_value' || activeTab === 'customers'
                              ? 'bg-blue-50/30 font-bold text-petko-blue'
                              : day.placedOrders > 0
                                ? 'font-semibold text-gray-800'
                                : 'text-gray-300'
                          }`}
                        >
                          {day.placedOrders.toLocaleString()}
                        </td>

                        {/* Placed value */}
                        <td
                          className={`px-4 py-3 text-right tabular-nums ${
                            activeTab === 'placed_value'
                              ? 'bg-blue-50/30 font-bold text-petko-blue'
                              : day.placedValue > 0
                                ? 'font-semibold text-gray-800'
                                : 'text-gray-300'
                          }`}
                        >
                          {formatOrderMoney(day.placedValue)}
                        </td>

                        {/* Completed orders */}
                        <td
                          className={`px-4 py-3 text-right tabular-nums ${
                            activeTab === 'completed_sales'
                              ? 'bg-orange-50/30 font-bold text-orange-700'
                              : day.completedOrders > 0
                                ? 'font-semibold text-gray-800'
                                : 'text-gray-300'
                          }`}
                        >
                          {day.completedOrders.toLocaleString()}
                        </td>

                        {/* Completed sales */}
                        <td
                          className={`px-4 py-3 text-right tabular-nums ${
                            activeTab === 'completed_sales'
                              ? 'bg-orange-50/30 font-bold text-orange-700'
                              : day.completedSales > 0
                                ? 'font-semibold text-gray-800'
                                : 'text-gray-300'
                          }`}
                        >
                          {formatOrderMoney(day.completedSales)}
                        </td>

                        {/* Sessions */}
                        <td
                          className={`px-4 py-3 text-right tabular-nums ${
                            activeTab === 'sessions'
                              ? 'bg-amber-50/30 font-bold text-amber-900'
                              : day.sessions > 0
                                ? 'font-semibold text-gray-800'
                                : 'text-gray-300'
                          }`}
                        >
                          {day.sessions.toLocaleString()}
                        </td>

                        {/* Page views */}
                        <td
                          className={`px-4 py-3 text-right tabular-nums ${
                            activeTab === 'sessions'
                              ? 'bg-amber-50/30 font-bold text-amber-900'
                              : day.pageViews > 0
                                ? 'font-semibold text-gray-800'
                                : 'text-gray-300'
                          }`}
                        >
                          {day.pageViews.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination & Status Footer */}
          {totalFiltered > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span>
                  Showing <strong>{startIndex + 1}</strong>–
                  <strong>{Math.min(startIndex + effectivePageSize, totalFiltered)}</strong> of{' '}
                  <strong>{totalFiltered}</strong> days
                  {totalFiltered < totalDays && (
                    <span className="text-gray-400 ml-1">(filtered from {totalDays})</span>
                  )}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Page size buttons */}
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Show:</span>
                  {[7, 14, 30].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handlePageSizeChange(size)}
                      className={`h-6 rounded px-2 text-xs font-bold transition ${
                        pageSize === size
                          ? 'bg-petko-blue text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handlePageSizeChange(0)}
                    className={`h-6 rounded px-2 text-xs font-bold transition ${
                      pageSize === 0
                        ? 'bg-petko-blue text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                </div>

                {/* Page Nav */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-gray-200 bg-white px-2 font-semibold text-gray-700 shadow-sm transition hover:bg-orange-50 disabled:opacity-40"
                    >
                      <ChevronLeft size={13} />
                      Prev
                    </button>
                    <span className="px-1 font-bold text-gray-700">
                      {safePage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-gray-200 bg-white px-2 font-semibold text-gray-700 shadow-sm transition hover:bg-orange-50 disabled:opacity-40"
                    >
                      Next
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
