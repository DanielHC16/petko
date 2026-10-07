import { useEffect, useState } from 'react'
import { KeyRound, Plus, RefreshCw, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import { useAuthStore } from '@/store/auth.store'
import {
  addAccessEmail,
  fetchAccessEmails,
  removeAccessEmail,
  type AdminAccessEmail,
} from './admin-api'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface AdminAccessSectionProps {
  /** Called after the list changes, since effective user roles change with it. */
  onChange: () => void
}

/**
 * Admin-only editor for public.admin_access_emails. Listed (confirmed) emails
 * are treated as admins by the backend and can switch between the customer
 * and admin views. The server enforces every rule shown here.
 */
export default function AdminAccessSection({ onChange }: AdminAccessSectionProps) {
  const profile = useAuthStore((s) => s.profile)
  const [emails, setEmails] = useState<AdminAccessEmail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [emailInput, setEmailInput] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const ownEmail = profile?.email.trim().toLowerCase() ?? ''

  async function loadEmails(): Promise<void> {
    try {
      setEmails(await fetchAccessEmails())
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to load the admin access list'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    fetchAccessEmails()
      .then((rows) => {
        if (isMounted) setEmails(rows)
      })
      .catch((err: unknown) => {
        if (isMounted) {
          toast.error(getApiErrorMessage(err, 'Failed to load the admin access list'))
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  async function handleAdd(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    const email = emailInput.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(email)) {
      toast.error('Please enter a valid email address')
      return
    }
    if (emails.some((row) => row.email === email)) {
      toast.error('That email already has admin access')
      return
    }

    setIsAdding(true)
    try {
      await addAccessEmail(email)
      toast.success(`${email} now has admin access`)
      setEmailInput('')
      await loadEmails()
      onChange()
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to add the email'))
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRemove(row: AdminAccessEmail): Promise<void> {
    if (
      !window.confirm(
        `Remove ${row.email} from the admin access list?\n\nThey lose list-granted admin access on their next request.`,
      )
    ) {
      return
    }

    setRemovingId(row.id)
    try {
      await removeAccessEmail(row.id)
      toast.success(`Removed ${row.email} from the admin access list`)
      await loadEmails()
      onChange()
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to remove the email'))
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <section
      aria-labelledby="admin-access-heading"
      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
          <KeyRound size={18} aria-hidden="true" />
        </div>
        <div>
          <h2 id="admin-access-heading" className="text-base font-bold text-gray-900">
            Admin access list
          </h2>
          <p className="text-xs text-gray-600">
            Listed emails can switch between the customer and admin views. Removing an
            email revokes list-granted access on their next request; stored admins keep
            their role.
          </p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="access-email" className="sr-only">
          Email to grant admin access
        </label>
        <input
          id="access-email"
          type="email"
          required
          autoComplete="off"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          placeholder="e.g. teammate@gmail.com"
          className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        />
        <button
          type="submit"
          disabled={isAdding}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {isAdding ? (
            <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Plus size={16} aria-hidden="true" />
          )}
          <span>Add email</span>
        </button>
      </form>

      {isLoading ? (
        <p role="status" aria-live="polite" className="mt-5 text-xs text-gray-600">
          Loading the admin access list...
        </p>
      ) : emails.length === 0 ? (
        <p role="status" aria-live="polite" className="mt-5 text-xs text-gray-600">
          No emails have admin access yet.
        </p>
      ) : (
        <ul
          aria-label="Emails with admin access"
          className="mt-5 divide-y divide-gray-100 rounded-xl border border-gray-200"
        >
          {emails.map((row) => {
            const isOwn = row.email === ownEmail
            const isOnly = emails.length <= 1
            const isRemoving = removingId === row.id
            const disabledReason = isOwn
              ? 'You cannot remove your own email'
              : isOnly
                ? 'At least one email must keep admin access'
                : undefined

            return (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {row.email}
                    {isOwn && (
                      <span className="ml-1.5 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-800">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-600">
                    Added{' '}
                    {new Date(row.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(row)}
                  disabled={Boolean(disabledReason) || isRemoving}
                  title={disabledReason ?? `Remove ${row.email}`}
                  aria-label={`Remove ${row.email} from admin access`}
                  className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-700 transition hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2
                    size={14}
                    className={isRemoving ? 'animate-pulse' : ''}
                    aria-hidden="true"
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
