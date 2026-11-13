import { supabase } from '@/lib/supabase'
import { api } from '@/lib/axios'
import type { ApiResponse } from '@/lib/api-types'
import type { OrderShipping } from '@/lib/order-types'
import { useAuthStore, type UserProfile } from '@/store/auth.store'

function accountHeaders(expectedUserId?: string): { Authorization: string } {
  const { session, profile } = useAuthStore.getState()
  if (!session || !profile || session.user.id !== profile.id || (expectedUserId && profile.id !== expectedUserId)) throw new Error('Please sign in to manage your account.')
  return { Authorization: `Bearer ${session.access_token}` }
}

export async function updateDisplayName(fullName: string): Promise<UserProfile> {
  const response = await api.patch<ApiResponse<UserProfile>>('/users/me', { full_name: fullName.trim() }, { headers: accountHeaders() })
  return response.data.data
}
export async function deleteCurrentAccount(): Promise<void> { await api.delete('/users/me', { headers: accountHeaders() }) }

export async function fetchAccountDetails(): Promise<{ shipping: OrderShipping | null; createdAt: string }> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Please sign in to manage your account.')
  const value: unknown = data.user.user_metadata.saved_shipping
  let shipping: OrderShipping | null = null
  if (typeof value === 'object' && value !== null) {
    const text = (key: string): string => key in value && typeof Reflect.get(value, key) === 'string' ? Reflect.get(value, key) : ''
    shipping = { full_name: text('full_name'), email: text('email'), phone: text('phone'),
      address_line1: text('address_line1'), address_line2: text('address_line2'), city: text('city'),
      province: text('province'), postal_code: text('postal_code') }
  }
  return { shipping, createdAt: data.user.created_at }
}
export async function saveShippingDetails(shipping: OrderShipping | null, userId: string): Promise<void> {
  await api.patch('/users/me/shipping', { saved_shipping: shipping }, { headers: accountHeaders(userId) })
}
