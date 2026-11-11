import axios from 'axios'
import type { ApiResponse } from '@/lib/api-types'

interface TosAcceptance {
  tos_accepted: true
}

/** Bind consent to the captured session; the shared interceptor may switch tokens. */
export async function acceptTos(token: string, signal: AbortSignal): Promise<void> {
  const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
  const response = await axios.post<ApiResponse<TosAcceptance>>(
    `${base}/users/me/tos-acceptance`,
    { tos_accepted: true },
    { headers: { Authorization: `Bearer ${token}` }, signal, withCredentials: false },
  )
  if (!response.data.success || response.data.data?.tos_accepted !== true)
    throw new Error('Could not save your agreement. Please try again.')
}
