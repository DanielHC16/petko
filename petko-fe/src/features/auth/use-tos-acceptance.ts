import { useEffect, useRef, useState } from 'react'
import { getApiErrorMessage } from '@/lib/api-error'
import { useAuthStore } from '@/store/auth.store'
import { acceptTos } from './tos-api'

interface AcceptanceRequest {
  userId: string
  token: string
  controller: AbortController
}

interface TosAcceptanceState {
  userId: string | null
  needsAcceptance: boolean
  isSaving: boolean
  error: string | null
  accept: () => Promise<void>
}

export function useTosAcceptance(): TosAcceptanceState {
  const profile = useAuthStore((state) => state.profile)
  const session = useAuthStore((state) => state.session)
  const isLoading = useAuthStore((state) => state.isLoading)
  const request = useRef<AcceptanceRequest | null>(null)
  const [result, setResult] = useState<{ userId: string; saving: boolean; error: string | null } | null>(null)
  const userId = session?.user.id === profile?.id ? profile?.id ?? null : null
  const needsAcceptance = !isLoading && Boolean(userId) && profile?.tos_accepted === false

  useEffect(() => () => request.current?.controller.abort(), [])

  async function accept(): Promise<void> {
    const auth = useAuthStore.getState()
    const currentProfile = auth.profile
    const currentSession = auth.session
    if (auth.isLoading || !currentProfile || currentProfile.tos_accepted !== false
      || currentSession?.user.id !== currentProfile.id || !currentSession.access_token
      || (request.current && !request.current.controller.signal.aborted)) return

    const active: AcceptanceRequest = {
      userId: currentProfile.id, token: currentSession.access_token, controller: new AbortController(),
    }
    request.current = active
    setResult({ userId: active.userId, saving: true, error: null })
    // Abort immediately on auth transitions rather than waiting for React effects.
    const unsubscribe = useAuthStore.subscribe((next) => {
      if (next.session?.access_token !== active.token || next.profile?.id !== active.userId
        || next.session?.user.id !== active.userId) active.controller.abort()
    })
    try {
      await acceptTos(active.token, active.controller.signal)
      const latest = useAuthStore.getState()
      if (!active.controller.signal.aborted && request.current === active
        && latest.profile?.id === active.userId && latest.session?.access_token === active.token) {
        useAuthStore.setState({ profile: { ...latest.profile, tos_accepted: true } })
        setResult(null)
      }
    } catch (err: unknown) {
      if (!active.controller.signal.aborted && request.current === active)
        setResult({ userId: active.userId, saving: false, error: getApiErrorMessage(err, 'Could not save your agreement. Please try again.') })
    } finally {
      unsubscribe()
      if (request.current === active) request.current = null
    }
  }

  return {
    userId, needsAcceptance,
    isSaving: result?.userId === userId && result.saving,
    error: result?.userId === userId ? result.error : null,
    accept,
  }
}
