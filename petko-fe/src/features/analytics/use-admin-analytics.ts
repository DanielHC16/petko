import { useCallback, useEffect, useState } from 'react'
import { getApiErrorMessage } from '@/lib/api-error'
import { useAuthStore } from '@/store/auth.store'
import { fetchAnalytics } from './analytics-api'
import type { AnalyticsRange, AnalyticsReport } from './analytics-types'

interface AnalyticsResource {
  data: AnalyticsReport | null
  error: string | null
  isLoading: boolean
  refresh: () => void
}

export function useAdminAnalytics(range: AnalyticsRange, valid: boolean): AnalyticsResource {
  const userId = useAuthStore((state) => state.profile?.id)
  const [revision, setRevision] = useState(0)
  const key = `${userId}:${range.start}:${range.end}:${revision}`
  const [result, setResult] = useState<{ key: string; data: AnalyticsReport } | null>(null)
  const [error, setError] = useState<{ key: string; message: string } | null>(null)
  const refresh = useCallback((): void => setRevision((value) => value + 1), [])

  useEffect(() => {
    if (!valid || !userId) return
    const controller = new AbortController()
    async function load(): Promise<void> {
      try {
        const data = await fetchAnalytics({ start: range.start, end: range.end }, controller.signal)
        if (!controller.signal.aborted) setResult({ key, data })
      } catch (err: unknown) {
        if (!controller.signal.aborted)
          setError({ key, message: getApiErrorMessage(err, 'Could not load analytics. Please try again.') })
      }
    }
    void load()
    return () => controller.abort()
  }, [key, range.start, range.end, valid, userId])

  const data = result?.key === key ? result.data : null
  const message = error?.key === key ? error.message : null
  return { data, error: message, isLoading: valid && Boolean(userId) && !data && !message, refresh }
}
