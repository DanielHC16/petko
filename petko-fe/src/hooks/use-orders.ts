import { useCallback, useEffect, useRef, useState } from 'react'
import { getApiErrorMessage } from '@/lib/api-error'
import { fetchOrder, fetchOrders, updateOrder } from '@/lib/orders-api'
import type {
  OrderAction,
  OrderDetail,
  OrderList,
  OrderListQuery,
} from '@/lib/order-types'
import { useAuthStore } from '@/store/auth.store'

interface OrderResource<T> {
  data: T | null
  error: string | null
  isLoading: boolean
  refresh: () => void
}

interface OrderMutation {
  mutate: (order: OrderDetail, action: OrderAction) => Promise<boolean>
  isPending: boolean
  error: string | null
  clearError: () => void
}

function useOrderResource<T>(
  key: string | null,
  fetcher: (signal: AbortSignal) => Promise<T>,
): OrderResource<T> {
  const [result, setResult] = useState<{ key: string; data: T } | null>(null)
  const [error, setError] = useState<{ key: string; message: string } | null>(
    null,
  )
  const [pending, setPending] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const refresh = useCallback((): void => {
    setRevision((value) => value + 1)
  }, [])

  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    async function load(): Promise<void> {
      setPending(key)
      setError(null)
      try {
        const data = await fetcher(controller.signal)
        if (!controller.signal.aborted) setResult({ key: key!, data })
      } catch (err: unknown) {
        if (!controller.signal.aborted)
          setError({
            key: key!,
            message: getApiErrorMessage(
              err,
              'Could not load orders. Please try again.',
            ),
          })
      } finally {
        if (!controller.signal.aborted) setPending(null)
      }
    }
    void load()
    return () => controller.abort()
  }, [key, fetcher, revision])

  useEffect(() => {
    function onFocus(): void {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refresh])

  const data = result?.key === key ? result.data : null
  const message = error?.key === key ? error.message : null
  return {
    data,
    error: message,
    isLoading: Boolean(key && ((!data && !message) || pending === key)),
    refresh,
  }
}

export function useOrderList(
  query: OrderListQuery,
  admin = false,
): OrderResource<OrderList> {
  const userId = useAuthStore((state) => state.profile?.id)
  const { page, limit = 10, fulfillment_status, unresolved_only } = query
  const key = userId
    ? `${userId}:${admin}:${page}:${limit}:${fulfillment_status ?? ''}:${unresolved_only ?? ''}`
    : null
  const fetcher = useCallback(
    (signal: AbortSignal): Promise<OrderList> =>
      fetchOrders(
        { page, limit, fulfillment_status, unresolved_only },
        admin,
        signal,
      ),
    [page, limit, fulfillment_status, unresolved_only, admin],
  )
  return useOrderResource(key, fetcher)
}

export function useOrderDetail(
  id: string | null,
  admin = false,
): OrderResource<OrderDetail> {
  const userId = useAuthStore((state) => state.profile?.id)
  const key = userId && id ? `${userId}:${admin}:${id}` : null
  const fetcher = useCallback(
    (signal: AbortSignal): Promise<OrderDetail> =>
      fetchOrder(id!, admin, signal),
    [id, admin],
  )
  return useOrderResource(key, fetcher)
}

export function useOrderMutation(
  onSuccess: () => void,
  onConflict: () => void,
): OrderMutation {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)
  const busy = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  async function mutate(
    order: OrderDetail,
    action: OrderAction,
  ): Promise<boolean> {
    if (busy.current) return false
    busy.current = true
    setIsPending(true)
    setError(null)
    try {
      await updateOrder(order, action)
      if (mounted.current) onSuccess()
      return true
    } catch (err: unknown) {
      if (mounted.current) {
        setError(
          getApiErrorMessage(
            err,
            'Could not update the order. Please refresh and try again.',
          ),
        )
        onConflict()
      }
      return false
    } finally {
      busy.current = false
      if (mounted.current) setIsPending(false)
    }
  }

  return { mutate, isPending, error, clearError: (): void => setError(null) }
}
