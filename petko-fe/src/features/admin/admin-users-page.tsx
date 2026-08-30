import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Shield,
  ShieldAlert,
  UserPlus,
  ArrowLeft,
  Search,
  CheckCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/axios'
import { useAuthStore, type UserProfile } from '@/store/auth.store'

interface UserWithDate extends UserProfile {
  created_at?: string
}

export default function AdminUsersPage() {
  const currentAdmin = useAuthStore((s) => s.profile)
  const [users, setUsers] = useState<UserWithDate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [roleInput, setRoleInput] = useState<'admin' | 'customer'>('admin')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setIsLoading(true)
    try {
      const res = await api.get<{ success: boolean; data: UserWithDate[] }>('/users')
      setUsers(res.data.data || [])
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch users')
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePromoteUser(e: React.FormEvent) {
    e.preventDefault()
    if (!emailInput.trim()) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await api.post<{ success: boolean; data: UserWithDate; message?: string }>(
        '/users/promote',
        {
          email: emailInput.trim().toLowerCase(),
          role: roleInput,
        },
      )

      toast.success(
        `Successfully set ${res.data.data.email} as ${roleInput.toUpperCase()}!`,
        { icon: '🛡️', duration: 4000 },
      )
      setEmailInput('')
      loadUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assign user role')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleToggleRole(targetUser: UserWithDate) {
    if (targetUser.id === currentAdmin?.id) {
      toast.error('You cannot change your own admin role!')
      return
    }

    const newRole = targetUser.role === 'admin' ? 'customer' : 'admin'
    const confirmMsg = `Are you sure you want to change ${targetUser.email}'s role to ${newRole.toUpperCase()}?`

    if (!window.confirm(confirmMsg)) return

    setUpdatingId(targetUser.id)
    try {
      await api.patch(`/users/${targetUser.id}/role`, { role: newRole })
      toast.success(`Updated ${targetUser.email} to ${newRole.toUpperCase()}`)
      loadUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update role')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDeleteUser(targetUser: UserWithDate) {
    if (targetUser.id === currentAdmin?.id) {
      toast.error('You cannot remove your own active admin account!')
      return
    }

    const confirmMsg = `⚠️ WARNING: Permanently delete account for "${targetUser.email}"?\n\nThis will remove their profile and authentication credentials.`
    if (!window.confirm(confirmMsg)) return

    setDeletingId(targetUser.id)
    try {
      await api.delete(`/users/${targetUser.id}`)
      toast.success(`Removed account ${targetUser.email}`, { icon: '🗑️' })
      loadUsers()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete user account')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()),
  )

  const adminCount = users.filter((u) => u.role === 'admin').length
  const customerCount = users.filter((u) => u.role === 'customer').length

  return (
    <div className="space-y-8">
      {/* Navigation Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-orange-600 mb-2"
          >
            <ArrowLeft size={14} />
            Back to Admin Portal
          </Link>
          <h1 className="text-2xl font-black text-gray-900 sm:text-3xl">
            User Roles &amp; RBAC Management
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            View registered accounts, assign Administrator permissions, or remove user access.
          </p>
        </div>

        <button
          onClick={loadUsers}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh Users
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Total Users
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <Users size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-gray-900">{users.length}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">Registered across Petko</p>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-700">
              Admin Users
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-200 text-orange-800">
              <Shield size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-orange-950">{adminCount}</p>
          <p className="mt-0.5 text-[11px] text-orange-700/80">Full administrative access</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Customer Accounts
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-200 text-blue-800">
              <Users size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-blue-950">{customerCount}</p>
          <p className="mt-0.5 text-[11px] text-blue-700/80">Standard store shoppers</p>
        </div>
      </div>

      {/* Add / Promote Admin Form */}
      <div className="rounded-2xl border border-orange-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
            <UserPlus size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Manually Add or Promote Admin User
            </h2>
            <p className="text-xs text-gray-500">
              Enter any Gmail or email address. If they haven&apos;t signed in with Google yet, their role will be pre-configured.
            </p>
          </div>
        </div>

        <form onSubmit={handlePromoteUser} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="e.g. colleague@gmail.com or admin@domain.com"
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />

          <select
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value as 'admin' | 'customer')}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 focus:border-orange-500 focus:outline-none"
          >
            <option value="admin">🛡️ Role: Admin</option>
            <option value="customer">👤 Role: Customer</option>
          </select>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-50"
          >
            {isSubmitting ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <CheckCircle size={16} />
            )}
            <span>Assign Role</span>
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-gray-900">
            Registered Users ({filteredUsers.length})
          </h2>

          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-xs text-gray-800 placeholder-gray-400 focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-gray-500">
            Loading users list...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No users match your search keyword.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Current Role</th>
                  <th className="px-6 py-3.5">Joined</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => {
                  const isCurrent = user.id === currentAdmin?.id
                  const isUpdating = updatingId === user.id
                  const isDeleting = deletingId === user.id

                  return (
                    <tr key={user.id} className="hover:bg-gray-50/80 transition">
                      {/* Name & Avatar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.full_name}
                              className="h-8 w-8 rounded-full border border-gray-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-600">
                              {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-gray-900">
                              {user.full_name || 'No Name Set'}
                              {isCurrent && (
                                <span className="ml-1.5 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="font-mono text-[10px] text-gray-400">ID: {user.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 font-medium text-gray-700">
                        {user.email}
                      </td>

                      {/* Role Badge */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            user.role === 'admin'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {user.role === 'admin' ? (
                            <Shield size={12} />
                          ) : (
                            <Users size={12} />
                          )}
                          {user.role.toUpperCase()}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="px-6 py-4 text-gray-500">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Recent'}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        {isCurrent ? (
                          <span className="text-[11px] font-medium text-gray-400">
                            Current Session
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleRole(user)}
                              disabled={isUpdating || isDeleting}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                user.role === 'admin'
                                  ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  : 'border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100'
                              }`}
                            >
                              {isUpdating
                                ? 'Updating...'
                                : user.role === 'admin'
                                  ? 'Demote to Customer'
                                  : 'Promote to Admin'}
                            </button>

                            <button
                              onClick={() => handleDeleteUser(user)}
                              disabled={isUpdating || isDeleting}
                              className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                              title="Delete User Account"
                              aria-label={`Delete user ${user.email}`}
                            >
                              <Trash2 size={14} className={isDeleting ? 'animate-pulse' : ''} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Safety Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
        <ShieldAlert className="shrink-0 text-amber-600" size={18} />
        <div>
          <p className="font-bold">Admin Privileges &amp; Account Removal</p>
          <p className="mt-0.5 text-amber-800">
            Admins have full write access to product catalogs, user roles, and order statuses. Removing an account permanently deletes their database profile and revokes authentication credentials.
          </p>
        </div>
      </div>
    </div>
  )
}
