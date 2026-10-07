import axios from 'axios'
import type { ApiErrorBody } from '@/lib/api-types'

/**
 * Turns an unknown thrown value into a user-facing message.
 * Prefers class-validator field errors, then the API envelope message.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    const body = err.response?.data
    const fieldErrors = (body?.errors ?? []).filter(
      (item): item is string => typeof item === 'string',
    )
    if (fieldErrors.length > 0) return fieldErrors.join(', ')
    if (body?.message) return body.message
    return fallback
  }
  return err instanceof Error && err.message ? err.message : fallback
}
