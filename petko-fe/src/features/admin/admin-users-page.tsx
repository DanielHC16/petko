import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toastStyle, toastIconTheme } from '@/lib/toast-style'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import {
  Users,
  Shield,
  ShieldAlert,
  ArrowLeft,
  Search,
  CheckCircle,
  RefreshCw,
  Trash2,
  KeyRound,
  Plus,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import { useAuthStore } from '@/store/auth.store'
import PageBanner from '@/components/layout/PageBanner'
import {
  deleteUser,
  fetchUsers,
  promoteUser,
  updateUserRole,
  addAccessEmail,
  fetchAccessEmails,
  removeAccessEmail,
  type AdminAccessEmail,
  type AdminUser,
} from './admin-api'

export default function AdminUsersPage() {
  const currentAdmin = useAuthStore((s) => s.profile)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'customer' | 'admin'>('customer')

  // Access-list state
  const [accessEmails, setAccessEmails] = useState<AdminAccessEmail[]>([])
  const [accessEmailInput, setAccessEmailInput] = useState('')
  const [isAddingAccess, setIsAddingAccess] = useState(false)
  const [removingAccessId, setRemovingAccessId] = useState<string | null>(null)
  const ownEmail = currentAdmin?.email?.trim().toLowerCase() ?? ''

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    confirmLabel: string
    variant: 'danger' | 'warning' | 'info'
    onConfirm: () => void
  }>({ open: false, title: '', message: '', confirmLabel: 'Confirm', variant: 'danger', onConfirm: () => {} })

  useEffect(() => {
    loadUsers()
    loadAccessEmails()
  }, [])

  async function loadUsers() {
    setIsLoading(true)
    try {
      setUsers(await fetchUsers())
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to fetch users'), { style: toastStyle('error'), iconTheme: toastIconTheme('error') })
    } finally {
      setIsLoading(false)
    }
  }

  async function loadAccessEmails() {
    try {
      setAccessEmails(await fetchAccessEmails())
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to load admin access list'), { style: toastStyle('error'), iconTheme: toastIconTheme('error') })
    }
  }

  async function handleAddAccessEmail(e: React.FormEvent) {
    e.preventDefault()
    const email = accessEmailInput.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address', { style: toastStyle('error'), iconTheme: toastIconTheme('error') })
      return
    }
    if (accessEmails.some((r) => r.email === email)) {
      toast.error('That email is already on the access list', { style: toastStyle('error'), iconTheme: toastIconTheme('error') })
      return
    }
    setIsAddingAccess(true)
    try {
      await addAccessEmail(email)
      // Also set DB role to admin so they appear in the Admins tab immediately
      await promoteUser(email, 'admin')
      toast.success(`${email} pre-approved as admin`, { icon: '🛡️', style: toastStyle('success'), iconTheme: toastIconTheme('success') })
      setAccessEmailInput('')
      await Promise.all([loadAccessEmails(), loadUsers()])
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to pre-approve email'), { style: toastStyle('error'), iconTheme: toastIconTheme('error') })
    } finally {
      setIsAddingAccess(false)
    }
  }

  async function handleRemoveAccessEmail(row: AdminAccessEmail) {
    setConfirmDialog({
      open: true,
      title: 'Remove from access list',
      message: `Remove ${row.email} from the admin access list?\n\nThey lose list-granted access on their next request.`,
      confirmLabel: 'Remove',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, open: false }))
        setRemovingAccessId(row.id)
        try {
          await removeAccessEmail(row.id)
          toast.success(`Removed ${row.email} from access list`, { style: toastStyle('error'), iconTheme: toastIconTheme('error') })
          await Promise.all([loadAccessEmails(), loadUsers()])
        } catch (err: unknown) {
          toast.error(getApiErrorMessage(err, 'Failed to remove email'), { style: toastStyle('error'), iconTheme: toastIconTheme('error') })
        } finally {
          setRemovingAccessId(null)
        }
      },
    })
  }

  async function handleToggleRole(targetUser: AdminUser) {
    if (targetUser.id === currentAdmin?.id) {
      toast.error('You cannot change your own admin role!', { style: toastStyle('error'), iconTheme: toastIconTheme('error') })
      return
    }

    const newRole = targetUser.role === 'admin' ? 'customer' : 'admin'

    setConfirmDialog({
      open: true,
      title: 'Change user role',
      message: `Are you sure you want to change ${targetUser.email}'s role to ${newRole.toUpperCase()}?`,
      confirmLabel: newRole === 'admin' ? 'Promote to Admin' : 'Demote to Customer',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, open: false }))
        setUpdatingId(targetUser.id)
        try {
          await updateUserRole(targetUser.id, newRole)
          toast.success(`Updated ${targetUser.email} to ${newRole.toUpperCase()}`, { style: toastStyle('warning'), iconTheme: toastIconTheme('warning') })
          loadUsers()
        } catch (err: unknown) {
          toast.error(getApiErrorMessage(err, 'Failed to update role'), { style: toastStyle('error'), iconTheme: toastIconTheme('error') })
        } finally {
          setUpdatingId(null)
        }
      },
    })
  }

  async function handleDeleteUser(targetUser: AdminUser) {
    if (targetUser.id === currentAdmin?.id) {
      toast.error('You cannot remove your own active admin account!', { style: toastStyle('error'), iconTheme: toastIconTheme('error') })
      return
    }

    const email = targetUser.email

    setConfirmDialog({
      open: true,
      title: 'Delete user account',
      message: `Permanently delete account for "${email}"?\n\nThis will remove their profile and authentication credentials.`,
      confirmLabel: 'Delete Account',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, open: false }))
        setDeletingId(targetUser.id)
        try {
          await deleteUser(targetUser.id)
          toast.success(`Removed account ${email}`, { icon: '🗑️', style: toastStyle('error'), iconTheme: toastIconTheme('error') })
          loadUsers()
        } catch (err: unknown) {
          toast.error(getApiErrorMessage(err, 'Failed to delete user account'), { style: toastStyle('error'), iconTheme: toastIconTheme('error') })
        } finally {
          setDeletingId(null)
        }
      },
    })
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()),
  )

  const tabUsers = filteredUsers.filter((u) => u.role === activeTab)

  const adminCount = users.filter((u) => u.role === 'admin').length
  const customerCount = users.filter((u) => u.role === 'customer').length

  return (
    <div className="min-h-screen w-full bg-[#ecdab6] p-6 font-sans lg:p-10">
      <div className="space-y-8">
        {/* ── Page banner ───────────────────────────────────────────── */}
        <PageBanner
          title="User Roles & RBAC Management"
          subtitle="View registered accounts, assign Administrator permissions, or remove user access."
        >
        <div className="flex items-center justify-between gap-2 border-t border-orange-100 bg-orange-50/60 px-3 py-2 sm:px-8">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#10298E] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0B3B8C] active:scale-95 sm:px-3"
          >
            <ArrowLeft size={13} />
            <span>
              Back<span className="hidden sm:inline"> to Admin Portal</span>
            </span>
          </Link>

          <button
            onClick={loadUsers}
            disabled={isLoading}
            title="Refresh Users"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e1cba5] bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-[#fef8e8] disabled:opacity-50 sm:px-3"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>
              Refresh<span className="hidden sm:inline"> Users</span>
            </span>
          </button>
        </div>
        </PageBanner>

        {/* ── Overview Stats ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#e1cba5] bg-[#fdf2e1] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Total Users
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#10298E]">
                <Users size={16} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-[#10298E]">{users.length}</p>
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

        {/* ── Pre-Approve Admin Access (unified card) ───────────────── */}
        <div className="rounded-2xl border border-orange-200 bg-[#fdf2e1] p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <KeyRound size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#10298E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                Pre-Approve Admin Access
              </h2>
              <p className="text-xs text-gray-600">
                Adding an email allowlists it <strong>and</strong> sets their DB role to Admin. They appear in the Admins tab immediately — even before they first sign in.
              </p>
            </div>
          </div>

          {/* Input row */}
          <form onSubmit={handleAddAccessEmail} className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="access-email-input" className="sr-only">Email to pre-approve</label>
            <input
              id="access-email-input"
              type="email"
              required
              autoComplete="off"
              value={accessEmailInput}
              onChange={(e) => setAccessEmailInput(e.target.value)}
              placeholder="e.g. colleague@gmail.com"
              className="flex-1 rounded-xl border border-[#e1cba5] bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <button
              type="submit"
              disabled={isAddingAccess}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-50"
            >
              {isAddingAccess ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />}
              Pre-Approve
            </button>
          </form>

          {/* Pill list */}
          {accessEmails.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Allowlisted emails ({accessEmails.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {accessEmails.map((row) => {
                  const isOwn = row.email === ownEmail
                  const isOnly = accessEmails.length <= 1
                  const canRemove = !isOwn && !isOnly
                  const isRemoving = removingAccessId === row.id

                  // Check if this email has already signed in (exists in users list)
                  const hasSignedIn = users.some((u) => u.email.toLowerCase() === row.email)

                  return (
                    <span
                      key={row.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-medium text-[#10298E] shadow-sm"
                    >
                      <Shield size={11} className="text-orange-500 shrink-0" />
                      {row.email}
                      {isOwn && (
                        <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold text-orange-700">You</span>
                      )}
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${hasSignedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {hasSignedIn ? 'Active' : 'Pending'}
                      </span>
                      {canRemove && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAccessEmail(row)}
                          disabled={isRemoving}
                          aria-label={`Remove ${row.email}`}
                          className="ml-0.5 rounded-full p-0.5 text-gray-400 transition hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                        >
                          {isRemoving ? <RefreshCw size={10} className="animate-spin" /> : <X size={10} />}
                        </button>
                      )}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Users Table ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#e1cba5] bg-white shadow-sm overflow-hidden">
          {/* Table Toolbar */}
          <div className="flex flex-col gap-3 border-b border-[#e1cba5] p-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Tab switcher */}
            <div className="flex shrink-0 rounded-xl border border-[#e1cba5] bg-[#fdf2e1] p-0.5">
              <button
                onClick={() => setActiveTab('customer')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${activeTab === 'customer' ? 'bg-white text-[#10298E] shadow-sm' : 'text-gray-500 hover:text-[#10298E]'}`}
              >
                <Users size={13} />
                Customers <span className="ml-0.5 rounded-full bg-blue-100 px-1.5 text-blue-700">{customerCount}</span>
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${activeTab === 'admin' ? 'bg-white text-[#10298E] shadow-sm' : 'text-gray-500 hover:text-[#10298E]'}`}
              >
                <Shield size={13} />
                Admins <span className="ml-0.5 rounded-full bg-orange-100 px-1.5 text-orange-700">{adminCount}</span>
              </button>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full rounded-lg border border-[#e1cba5] bg-[#fefaf2] py-2 pl-9 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">Loading users list...</div>
          ) : tabUsers.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">
              No {activeTab === 'admin' ? 'admin' : 'customer'} accounts match your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#e1cba5] bg-[#fdf2e1] uppercase tracking-wider font-semibold text-[#10298E] text-xs">
                  {activeTab === 'customer' ? (
                    <tr>
                      <th className="px-4 py-3 sm:px-6">Customer</th>
                      <th className="hidden px-6 py-3 md:table-cell">Email</th>
                      <th className="hidden px-6 py-3 sm:table-cell">Joined</th>
                      <th className="px-4 py-3 text-right sm:px-6">Actions</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="px-4 py-3 sm:px-6">Admin</th>
                      <th className="hidden px-6 py-3 md:table-cell">Email</th>
                      <th className="px-4 py-3 sm:px-6">Access</th>
                      <th className="hidden px-6 py-3 sm:table-cell">Joined</th>
                      <th className="px-4 py-3 text-right sm:px-6">Actions</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-[#e1cba5]/60">
                  {tabUsers.map((user) => {
                    const isCurrent = user.id === currentAdmin?.id
                    const isUpdating = updatingId === user.id
                    const isDeleting = deletingId === user.id

                    const avatar = user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name}
                        className="h-9 w-9 rounded-full border border-[#e1cba5] object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-600">
                        {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </div>
                    )

                    if (activeTab === 'customer') {
                      return (
                        <tr key={user.id} className="hover:bg-[#fef8e8] transition">
                          <td className="px-4 py-3 sm:px-6">
                            <div className="flex items-center gap-3">
                              {avatar}
                              <div className="min-w-0">
                                <p className="truncate font-bold text-[#10298E]">{user.full_name || 'No Name Set'}</p>
                                <p className="truncate text-[11px] text-gray-400 md:hidden">{user.email}</p>
                                <p className="hidden font-mono text-[10px] text-gray-400 md:block">ID: {user.id.slice(0, 8)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="hidden px-6 py-3 font-medium text-gray-700 md:table-cell">{user.email}</td>
                          <td className="hidden px-6 py-3 text-gray-500 sm:table-cell">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent'}
                          </td>
                          <td className="px-4 py-3 text-right sm:px-6">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleRole(user)}
                                disabled={isUpdating || isDeleting}
                                className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-100 disabled:opacity-50"
                              >
                                {isUpdating ? 'Updating...' : 'Promote to Admin'}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user)}
                                disabled={isUpdating || isDeleting}
                                className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                                title="Delete User Account"
                                aria-label={`Delete user ${user.email}`}
                              >
                                <Trash2 size={14} className={isDeleting ? 'animate-pulse' : ''} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    }

                    // Admin row
                    return (
                      <tr key={user.id} className="hover:bg-[#fef8e8] transition">
                        <td className="px-4 py-3 sm:px-6">
                          <div className="flex items-center gap-3">
                            {avatar}
                            <div className="min-w-0">
                              <p className="truncate font-bold text-[#10298E]">
                                {user.full_name || 'No Name Set'}
                                {isCurrent && (
                                  <span className="ml-1.5 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">You</span>
                                )}
                              </p>
                              <p className="truncate text-[11px] text-gray-400 md:hidden">{user.email}</p>
                              <p className="hidden font-mono text-[10px] text-gray-400 md:block">ID: {user.id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-6 py-3 font-medium text-gray-700 md:table-cell">{user.email}</td>
                        <td className="px-4 py-3 sm:px-6">
                          {user.admin_access_listed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                              <CheckCircle size={11} /> Access List
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                              <Shield size={11} /> Manual
                            </span>
                          )}
                        </td>
                        <td className="hidden px-6 py-3 text-gray-500 sm:table-cell">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent'}
                        </td>
                        <td className="px-4 py-3 text-right sm:px-6">
                          {isCurrent ? (
                            <span className="text-[11px] font-medium text-gray-400">Current Session</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              {user.admin_access_listed ? (
                                <button type="button" disabled
                                  title="Remove their email from the admin access list to demote"
                                  className="cursor-not-allowed rounded-lg border border-[#e1cba5] bg-[#fefaf2] px-3 py-1.5 text-xs font-semibold text-gray-600 opacity-70">
                                  Demote
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleRole(user)}
                                  disabled={isUpdating || isDeleting}
                                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                                >
                                  {isUpdating ? 'Updating...' : 'Demote to Customer'}
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUser(user)}
                                disabled={isUpdating || isDeleting}
                                className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
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

        {/* ── Safety Notice ───────────────────────────────────────────── */}
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

      {/* ── Confirm Dialog ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((d) => ({ ...d, open: false }))}
      />
    </div>
  )
}
