import { Fragment, useState, useEffect } from 'react'
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
  ChevronDown,
  ChevronUp,
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
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  // Access-list state
  const [accessEmails, setAccessEmails] = useState<AdminAccessEmail[]>([])
  const [isLoadingAccess] = useState(false)
  const [accessEmailInput, setAccessEmailInput] = useState('')
  const [isAddingAccess, setIsAddingAccess] = useState(false)
  const [removingAccessId, setRemovingAccessId] = useState<string | null>(null)
  const [showAccessList, setShowAccessList] = useState(true)
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

  async function handleDemoteListedAdmin(targetUser: AdminUser) {
    const matchedAccess = accessEmails.find(
      (r) => r.email.toLowerCase() === targetUser.email.toLowerCase(),
    )

    if (!matchedAccess) {
      handleToggleRole(targetUser)
      return
    }

    if (matchedAccess.email === ownEmail) {
      toast.error('You cannot demote your own admin account!', { style: toastStyle('error'), iconTheme: toastIconTheme('error') })
      return
    }

    if (accessEmails.length <= 1) {
      toast.error('Cannot remove the last remaining admin from the access list.', { style: toastStyle('error'), iconTheme: toastIconTheme('error') })
      return
    }

    setConfirmDialog({
      open: true,
      title: 'Demote allowlisted admin',
      message: `${targetUser.email} is on the Pre-Approved Admin Access list.\n\nRemove them from the access list and demote their role to CUSTOMER?`,
      confirmLabel: 'Remove & Demote',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, open: false }))
        setUpdatingId(targetUser.id)
        try {
          await removeAccessEmail(matchedAccess.id)
          await updateUserRole(targetUser.id, 'customer')
          toast.success(`Removed from access list and demoted ${targetUser.email} to CUSTOMER`, { style: toastStyle('warning'), iconTheme: toastIconTheme('warning') })
          await Promise.all([loadAccessEmails(), loadUsers()])
        } catch (err: unknown) {
          toast.error(getApiErrorMessage(err, 'Failed to demote admin'), { style: toastStyle('error'), iconTheme: toastIconTheme('error') })
        } finally {
          setUpdatingId(null)
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
    <div className="min-h-screen w-full bg-[#ecdab6] p-4 font-sans sm:p-6 lg:p-10">
      <div className="space-y-5 sm:space-y-8">
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
              onClick={() => {
                loadUsers()
                loadAccessEmails()
              }}
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
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="flex min-w-0 flex-col justify-between rounded-xl border border-[#e1cba5] bg-[#fdf2e1] p-2.5 shadow-sm sm:rounded-2xl sm:p-5">
            <div>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[#10298E] sm:order-2 sm:h-8 sm:w-8 sm:rounded-lg">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <span className="text-[10px] font-semibold uppercase leading-tight tracking-wider text-gray-500 sm:order-1 sm:text-xs">
                  Total Users
                </span>
              </div>
              {isLoading ? (
                <div className="mt-1.5 h-6 w-10 animate-pulse rounded-lg bg-[#e1cba5]/70 sm:mt-2.5 sm:h-7 sm:w-14" />
              ) : (
                <p className="mt-1 text-lg font-black text-[#10298E] sm:mt-2 sm:text-2xl">{users.length}</p>
              )}
            </div>
            <p className="mt-0.5 text-[10px] leading-tight text-gray-400 sm:text-[11px]">
              Registered across Petko
            </p>
          </div>

          <div className="flex min-w-0 flex-col justify-between rounded-xl border border-orange-200 bg-orange-50/60 p-2.5 shadow-sm sm:rounded-2xl sm:p-5">
            <div>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-orange-200 text-orange-800 sm:order-2 sm:h-8 sm:w-8 sm:rounded-lg">
                  <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <span className="text-[10px] font-bold uppercase leading-tight tracking-wider text-orange-700 sm:order-1 sm:text-xs">
                  Admin Users
                </span>
              </div>
              {isLoading ? (
                <div className="mt-1.5 h-6 w-10 animate-pulse rounded-lg bg-orange-200/80 sm:mt-2.5 sm:h-7 sm:w-14" />
              ) : (
                <p className="mt-1 text-lg font-black text-orange-950 sm:mt-2 sm:text-2xl">{adminCount}</p>
              )}
            </div>
            <p className="mt-0.5 text-[10px] leading-tight text-orange-700/80 sm:text-[11px]">
              Full administrative access
            </p>
          </div>

          <div className="flex min-w-0 flex-col justify-between rounded-xl border border-blue-200 bg-blue-50/60 p-2.5 shadow-sm sm:rounded-2xl sm:p-5">
            <div>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-200 text-blue-800 sm:order-2 sm:h-8 sm:w-8 sm:rounded-lg">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <span className="text-[10px] font-bold uppercase leading-tight tracking-wider text-blue-700 sm:order-1 sm:text-xs">
                  Customer Accounts
                </span>
              </div>
              {isLoading ? (
                <div className="mt-1.5 h-6 w-10 animate-pulse rounded-lg bg-blue-200/80 sm:mt-2.5 sm:h-7 sm:w-14" />
              ) : (
                <p className="mt-1 text-lg font-black text-blue-950 sm:mt-2 sm:text-2xl">{customerCount}</p>
              )}
            </div>
            <p className="mt-0.5 text-[10px] leading-tight text-blue-700/80 sm:text-[11px]">
              Standard store shoppers
            </p>
          </div>
        </div>

        {/* ── Pre-Approve Admin Access (unified card) ───────────────── */}
        <div className="rounded-2xl border border-orange-200 bg-[#fdf2e1] p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
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

          {/* Collapsible Allowlisted Emails List */}
          {isLoadingAccess ? (
            <div className="mt-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-36 animate-pulse rounded bg-orange-200/70" />
                <div className="h-6 w-14 animate-pulse rounded-lg bg-orange-200/70" />
              </div>
              <div className="overflow-hidden rounded-xl border border-orange-200 bg-white shadow-sm">
                <div className="divide-y divide-orange-100/80">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="flex items-center justify-between px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-3.5 w-3.5 animate-pulse rounded-full bg-orange-200" />
                        <div className="h-3.5 w-48 animate-pulse rounded bg-gray-200" />
                      </div>
                      <div className="h-6 w-6 animate-pulse rounded-lg bg-gray-100" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : accessEmails.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Allowlisted Emails ({accessEmails.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowAccessList((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#10298E] shadow-sm transition hover:bg-orange-50"
                >
                  <span>{showAccessList ? 'Hide' : 'Show'}</span>
                  {showAccessList ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

              {showAccessList && (
                <div className="mt-2.5 max-h-[188px] overflow-y-auto rounded-xl border border-orange-200 bg-white shadow-sm">
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-orange-100 bg-orange-50 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-[#10298E] sm:px-3.5 sm:py-2.5">
                    <span>Email Address</span>
                    <span className="shrink-0">Remove</span>
                  </div>

                  <div className="divide-y divide-orange-100/80">
                    {accessEmails.map((row) => {
                      const isOwn = row.email === ownEmail
                      const isOnly = accessEmails.length <= 1
                      const canRemove = !isOwn && !isOnly
                      const isRemoving = removingAccessId === row.id

                      return (
                        <div
                          key={row.id}
                          className="flex items-center justify-between gap-2 px-2.5 py-2 text-[11px] transition hover:bg-[#fefaf2] sm:px-3.5 sm:py-2.5 sm:text-xs"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-1.5 font-medium text-[#10298E] sm:gap-2">
                            <Shield size={12} className="shrink-0 text-orange-500 sm:h-[13px] sm:w-[13px]" />
                            <span className="whitespace-nowrap">{row.email}</span>
                            {isOwn && (
                              <span className="shrink-0 rounded bg-orange-100 px-1 py-0.5 text-[8px] font-bold text-orange-700 sm:px-1.5 sm:text-[9px]">
                                You
                              </span>
                            )}
                          </div>

                          <div className="shrink-0">
                            {canRemove ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveAccessEmail(row)}
                                disabled={isRemoving}
                                aria-label={`Remove ${row.email}`}
                                title={`Remove ${row.email} from access list`}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-red-200 bg-red-50/70 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                              >
                                {isRemoving ? <RefreshCw size={11} className="animate-spin" /> : <X size={12} />}
                              </button>
                            ) : (
                              <span className="inline-flex h-6 w-6 items-center justify-center text-[10px] text-gray-300">—</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Users Table ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#e1cba5] bg-white shadow-sm overflow-hidden">
          {/* Table Toolbar */}
          <div className="flex flex-col gap-3 border-b border-[#e1cba5] p-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Tab switcher */}
            <div className="grid w-full grid-cols-2 gap-1 rounded-xl border border-[#e1cba5] bg-[#fdf2e1] p-1 sm:w-auto">
              <button
                onClick={() => setActiveTab('customer')}
                className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition sm:px-3 ${
                  activeTab === 'customer'
                    ? 'bg-white text-[#10298E] shadow-sm'
                    : 'text-gray-500 hover:text-[#10298E]'
                }`}
              >
                <Users size={13} className="shrink-0" />
                <span className="truncate">Customers</span>
                {isLoading ? (
                  <span className="inline-block h-4 w-6 shrink-0 animate-pulse rounded-full bg-blue-100" />
                ) : (
                  <span className="shrink-0 rounded-full bg-blue-100 px-1.5 text-blue-700">{customerCount}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition sm:px-3 ${
                  activeTab === 'admin'
                    ? 'bg-white text-[#10298E] shadow-sm'
                    : 'text-gray-500 hover:text-[#10298E]'
                }`}
              >
                <Shield size={13} className="shrink-0" />
                <span className="truncate">Admins</span>
                {isLoading ? (
                  <span className="inline-block h-4 w-6 shrink-0 animate-pulse rounded-full bg-orange-100" />
                ) : (
                  <span className="shrink-0 rounded-full bg-orange-100 px-1.5 text-orange-700">{adminCount}</span>
                )}
              </button>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by display name or email..."
                className="w-full rounded-lg border border-[#e1cba5] bg-[#fefaf2] py-2 pl-9 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {isLoading ? (
            <div>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#e1cba5] bg-[#fdf2e1] uppercase tracking-wider font-semibold text-[#10298E] text-xs">
                  <tr>
                    <th className="w-full px-4 py-3 sm:px-6">{activeTab === 'customer' ? 'Customer' : 'Admin'}</th>
                    <th className="hidden px-6 py-3 lg:table-cell whitespace-nowrap">Display Name</th>
                    <th className="hidden px-6 py-3 md:table-cell">Email</th>
                    <th className="hidden px-6 py-3 sm:table-cell whitespace-nowrap">Joined</th>
                    {activeTab === 'admin' && (
                      <th className="hidden px-6 py-3 md:table-cell whitespace-nowrap">Access</th>
                    )}
                    <th className="px-4 py-3 text-right whitespace-nowrap sm:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e1cba5]/60">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <tr key={n}>
                      <td className="max-w-0 px-4 py-3.5 sm:max-w-none sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-[#fdf2e1]" />
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="h-3.5 w-32 animate-pulse rounded bg-gray-200" />
                            <div className="h-2.5 w-44 animate-pulse rounded bg-gray-100 md:hidden" />
                            <div className="hidden h-2.5 w-24 animate-pulse rounded bg-gray-100 md:block" />
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-6 py-3.5 lg:table-cell">
                        <div className="h-3.5 w-28 animate-pulse rounded bg-gray-200" />
                      </td>
                      <td className="hidden px-6 py-3.5 md:table-cell">
                        <div className="h-3.5 w-44 animate-pulse rounded bg-gray-200" />
                      </td>
                      <td className="hidden px-6 py-3.5 sm:table-cell">
                        <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100" />
                      </td>
                      {activeTab === 'admin' && (
                        <td className="hidden px-6 py-3.5 md:table-cell">
                          <div className="h-5 w-24 animate-pulse rounded-full bg-emerald-100/70" />
                        </td>
                      )}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap sm:px-6">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden h-7 w-28 animate-pulse rounded-lg bg-orange-100/70 sm:block" />
                          <div className="h-8 w-8 animate-pulse rounded-lg bg-red-100/70" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : tabUsers.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">
              No {activeTab === 'admin' ? 'admin' : 'customer'} accounts match your search.
            </div>
          ) : (
            <div>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#e1cba5] bg-[#fdf2e1] uppercase tracking-wider font-semibold text-[#10298E] text-xs">
                  <tr>
                    <th className="w-full px-4 py-3 sm:px-6">{activeTab === 'customer' ? 'Customer' : 'Admin'}</th>
                    <th className="hidden px-6 py-3 lg:table-cell whitespace-nowrap">Display Name</th>
                    <th className="hidden px-6 py-3 md:table-cell">Email</th>
                    <th className="hidden px-6 py-3 sm:table-cell whitespace-nowrap">Joined</th>
                    {activeTab === 'admin' && (
                      <th className="hidden px-6 py-3 md:table-cell whitespace-nowrap">Access</th>
                    )}
                    <th className="px-4 py-3 text-right whitespace-nowrap sm:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e1cba5]/60">
                  {tabUsers.map((user) => {
                    const isCurrent = user.id === currentAdmin?.id
                    const isUpdating = updatingId === user.id
                    const isDeleting = deletingId === user.id
                    const isExpanded = expandedUserId === user.id
                    const displayName = user.full_name?.trim()

                    const formattedDate = user.created_at
                      ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                      : 'Recent'

                    const avatar = user.avatar_url ? (
                      <img src={user.avatar_url} alt={displayName || user.email}
                        className="h-9 w-9 shrink-0 rounded-full border border-[#e1cba5] object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-600">
                        {displayName?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                      </div>
                    )

                    return (
                      <Fragment key={user.id}>
                        {/* ── Main row ── */}
                        <tr
                          onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                          className={`transition cursor-pointer ${isExpanded ? 'bg-[#fefaf2]' : 'hover:bg-[#fef8e8]'}`}
                        >
                          <td className="max-w-0 px-4 py-3 sm:max-w-none sm:px-6">
                            <div className="flex items-center gap-3">
                              {avatar}
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-bold text-[#10298E]">
                                  {displayName || 'No Display Name'}
                                  {isCurrent && (
                                    <span className="ml-1.5 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">You</span>
                                  )}
                                </p>
                                {!isExpanded && (
                                  <p className="truncate text-[11px] text-gray-400 md:hidden">{user.email}</p>
                                )}
                                <p className="hidden break-all font-mono text-[10px] text-gray-400 md:block">ID: {user.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="hidden px-6 py-3 whitespace-nowrap lg:table-cell">
                            {displayName ? (
                              <span className="font-semibold text-gray-800">{displayName}</span>
                            ) : (
                              <span className="italic text-gray-400">Not set</span>
                            )}
                          </td>
                          <td className="hidden px-6 py-3 font-medium text-gray-700 md:table-cell">{user.email}</td>
                          <td className="hidden px-6 py-3 text-gray-500 whitespace-nowrap sm:table-cell">{formattedDate}</td>
                          {activeTab === 'admin' && (
                            <td className="hidden px-6 py-3 whitespace-nowrap md:table-cell">
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
                          )}
                          <td className="px-4 py-3 text-right whitespace-nowrap sm:px-6" onClick={(e) => e.stopPropagation()}>
                            {isCurrent ? (
                              <span className="text-[11px] font-medium text-gray-400">Current Session</span>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                {activeTab === 'customer' ? (
                                  <button
                                    onClick={() => handleToggleRole(user)}
                                    disabled={isUpdating || isDeleting}
                                    className="hidden rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-100 disabled:opacity-50 sm:block"
                                  >
                                    {isUpdating ? 'Updating...' : 'Promote to Admin'}
                                  </button>
                                ) : user.admin_access_listed ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDemoteListedAdmin(user)}
                                    disabled={isUpdating || isDeleting}
                                    title="Remove from allowlist and demote to Customer"
                                    className="hidden rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 sm:block"
                                  >
                                    {isUpdating ? 'Updating...' : 'Demote to Customer'}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleToggleRole(user)}
                                    disabled={isUpdating || isDeleting}
                                    className="hidden rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 sm:block"
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

                        {/* ── Expanded row (mobile only) ── */}
                        {isExpanded && (
                          <tr className="md:hidden bg-[#fefaf2]">
                            <td colSpan={2} className="px-4 pb-4 pt-2 pl-16">
                              <div className="space-y-2.5 text-xs">
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Display Name</p>
                                  <p className="font-medium text-gray-700">{displayName || 'Not set'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Email</p>
                                  <p className="font-medium text-gray-700 break-all">{user.email}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">User ID</p>
                                  <p className="font-mono text-gray-500 break-all">{user.id}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Joined</p>
                                  <p className="font-medium text-gray-700">{formattedDate}</p>
                                </div>
                                {activeTab === 'admin' && (
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Access</p>
                                    {user.admin_access_listed ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                                        <CheckCircle size={11} /> Access List
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                                        <Shield size={11} /> Manual
                                      </span>
                                    )}
                                  </div>
                                )}
                                {!isCurrent && (
                                  activeTab === 'customer' ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleToggleRole(user) }}
                                      disabled={isUpdating || isDeleting}
                                      className="w-full rounded-lg border border-orange-200 bg-orange-50 py-2 text-xs font-semibold text-orange-600 transition hover:bg-orange-100 disabled:opacity-50"
                                    >
                                      {isUpdating ? 'Updating...' : 'Promote to Admin'}
                                    </button>
                                  ) : user.admin_access_listed ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDemoteListedAdmin(user) }}
                                      disabled={isUpdating || isDeleting}
                                      className="w-full rounded-lg border border-amber-200 bg-amber-50 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                                    >
                                      {isUpdating ? 'Updating...' : 'Demote to Customer'}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleToggleRole(user) }}
                                      disabled={isUpdating || isDeleting}
                                      className="w-full rounded-lg border border-amber-200 bg-amber-50 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                                    >
                                      {isUpdating ? 'Updating...' : 'Demote to Customer'}
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
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