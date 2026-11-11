import type { AnalyticsRange } from './analytics-types'

const DAY = 86_400_000

export function manilaToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  return ['year', 'month', 'day'].map((name) => parts.find((part) => part.type === name)?.value).join('-')
}

export function presetRange(days: number): AnalyticsRange {
  const end = manilaToday()
  return { start: new Date(Date.parse(`${end}T00:00:00Z`) - (days - 1) * DAY).toISOString().slice(0, 10), end }
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function rangeError(range: AnalyticsRange): string | null {
  if (!isDate(range.start) || !isDate(range.end)) return 'Choose valid start and end dates.'
  if (range.start > range.end) return 'Start date must be on or before end date.'
  if (range.end > manilaToday()) return 'End date cannot be in the future in Philippine time.'
  if ((Date.parse(range.end) - Date.parse(range.start)) / DAY >= 366) return 'Choose a range of 366 days or fewer.'
  return null
}

export function formatAnalyticsDate(value: string): string {
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(value.length === 10 ? `${value}T00:00:00+08:00` : value))
}
