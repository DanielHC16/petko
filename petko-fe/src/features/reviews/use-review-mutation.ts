import { useEffect, useRef, useState } from 'react'
import { getApiErrorMessage } from '@/lib/api-error'
import { useAuthStore } from '@/store/auth.store'
import { reviewActorIsCurrent } from './reviews-api'
import type { ReviewActor } from './review-types'

export function useReviewMutation(actor: ReviewActor): {
  run: <T>(operation: (signal: AbortSignal) => Promise<T>) => Promise<T | null>
  isPending: boolean
  error: string | null
} {
  const { userId, token } = actor
  const active = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const [isPending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    mounted.current = true
    const unsubscribe = useAuthStore.subscribe(() => {
      if (!reviewActorIsCurrent({ userId, token })) active.current?.abort()
    })
    return () => { mounted.current = false; active.current?.abort(); unsubscribe() }
  }, [userId, token])

  async function run<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
    if (active.current || !reviewActorIsCurrent(actor)) return null
    const controller = new AbortController()
    active.current = controller
    setPending(true)
    setError(null)
    try {
      const value = await operation(controller.signal)
      return !controller.signal.aborted && mounted.current && reviewActorIsCurrent(actor) ? value : null
    } catch (err: unknown) {
      if (!controller.signal.aborted && mounted.current && reviewActorIsCurrent(actor)) setError(getApiErrorMessage(err, 'Could not save the review. Please try again.'))
      return null
    } finally {
      if (active.current === controller) active.current = null
      if (mounted.current && reviewActorIsCurrent(actor)) setPending(false)
    }
  }
  return { run, isPending, error }
}
