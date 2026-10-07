import { api } from '@/lib/axios'
import type { ApiResponse } from '@/lib/api-types'
import type { UserProfile } from '@/store/auth.store'

/** Mirrors the backend `AdminStats` returned by GET /api/admin/stats. */
export interface AdminStats {
  products: { total: number; active: number }
  users: { total: number; admins: number; customers: number }
  accessEmails: number
}

/** Mirrors the backend `AdminAccessEmail` row. */
export interface AdminAccessEmail {
  id: string
  email: string
  added_by: string | null
  created_at: string
}

/** A user as listed for admins; `role` is the effective role. */
export interface AdminUser extends UserProfile {
  created_at: string
  admin_access_listed: boolean
}

export type Role = UserProfile['role']

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await api.get<ApiResponse<AdminStats>>('/admin/stats')
  return res.data.data
}

export async function fetchAccessEmails(): Promise<AdminAccessEmail[]> {
  const res = await api.get<ApiResponse<AdminAccessEmail[]>>(
    '/admin-access-emails',
  )
  return res.data.data
}

export async function addAccessEmail(email: string): Promise<AdminAccessEmail> {
  const res = await api.post<ApiResponse<AdminAccessEmail>>(
    '/admin-access-emails',
    { email },
  )
  return res.data.data
}

export async function removeAccessEmail(id: string): Promise<void> {
  await api.delete(`/admin-access-emails/${id}`)
}

export async function fetchUsers(): Promise<AdminUser[]> {
  const res = await api.get<ApiResponse<AdminUser[]>>('/users')
  return res.data.data
}

export async function promoteUser(
  email: string,
  role: Role,
): Promise<AdminUser> {
  const res = await api.post<ApiResponse<AdminUser>>('/users/promote', {
    email,
    role,
  })
  return res.data.data
}

export async function updateUserRole(id: string, role: Role): Promise<void> {
  await api.patch(`/users/${id}/role`, { role })
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`)
}
