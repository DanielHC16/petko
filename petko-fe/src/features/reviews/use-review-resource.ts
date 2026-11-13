import { useCallback, useEffect, useState } from 'react'
import { getApiErrorMessage } from '@/lib/api-error'

export interface ReviewResource<T> {
  data: T | null
  error: string | null
  isLoading: boolean
  refresh: () => void
  replace: (data: T) => void
}

export function useReviewResource<T>(key: string, fetcher: (signal: AbortSignal) => Promise<T>): ReviewResource<T> {
  const [result, setResult] = useState<{ key: string; data: T } | null>(null)
  const [error, setError] = useState<{ key: string; text: string } | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const refresh = useCallback((): void => setRevision(value => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    async function load(): Promise<void> {
      setPending(key)
      setError(null)
      try {
        const data = await fetcher(controller.signal)
        if (!controller.signal.aborted) setResult({ key, data })
      } catch (err: unknown) {
        if (!controller.signal.aborted) setError({ key, text: getApiErrorMessage(err, 'Could not load reviews. Please try again.') })
      } finally {
        if (!controller.signal.aborted) setPending(null)
      }
    }
    void load()
    return () => controller.abort()
  }, [key, fetcher, revision])
  const data = result?.key === key ? result.data : null
  const message = error?.key === key ? error.text : null
  return { data, error: message, isLoading: pending === key || (!data && !message), refresh, replace: (data: T): void => setResult({ key, data }) }
}
