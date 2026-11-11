import { api } from '@/lib/axios'
import type { ApiResponse } from '@/lib/api-types'
import type { AnalyticsPage, AnalyticsRange, AnalyticsReport } from './analytics-types'

export async function fetchAnalytics(range: AnalyticsRange, signal: AbortSignal): Promise<AnalyticsReport> {
  const response = await api.get<ApiResponse<AnalyticsReport>>('/admin/analytics', { params: range, signal })
  return response.data.data
}

export type CaptureResult = 'ok' | 'conflict' | 'failed'

/** Capture is best effort and must never use the shared 401 redirect interceptor. */
export async function recordAnalyticsEvent(
  sessionId: string,
  eventId: string,
  page: AnalyticsPage,
  token: string | null,
): Promise<CaptureResult> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 2000)
    try {
      const response = await fetch(`${(import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')}/analytics/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ session_id: sessionId, event_id: eventId, page }),
        signal: controller.signal,
        keepalive: true,
        credentials: 'omit',
      })
      if (response.ok) return 'ok'
      if (response.status === 409) return 'conflict'
      if (response.status < 500) return 'failed'
    } catch {
      // A bounded retry reuses the event ID; capture failure has no user-facing effect.
    } finally {
      window.clearTimeout(timeout)
    }
  }
  return 'failed'
}
