import { useEffect, useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Calendar,
  MapPin,
  Phone,
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Package,
  Pencil,
  Plus,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { deleteCurrentAccount, updateDisplayName, fetchAccountDetails, saveShippingDetails } from '@/lib/account-api'
import { validateCheckoutShipping } from '@/features/checkout/checkout-validation'
import type { OrderShipping } from '@/lib/order-types'
import { useCartStore } from '@/store/cart.store'
import { signOut } from '@/lib/auth'
import { getApiErrorMessage } from '@/lib/api-error'
import { toastStyle, toastIconTheme } from '@/lib/toast-style'
import { useAuthStore } from '@/store/auth.store'
import PageBanner from '@/components/layout/PageBanner'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface ShippingErrors {
  fullName?: string
  email?: string
  contactNumber?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  province?: string
  postalCode?: string
}

function ReadOnlyField({
  label,
  value,
  mono = false,
}: {
  label: string
  value?: string | null
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </span>
      <div
        className={`rounded-lg border border-gray-200 bg-gray-50/90 px-3 py-2 text-sm text-gray-700 ${
          mono ? 'font-mono text-xs break-all' : 'font-medium'
        }`}
      >
        {value && value.trim() !== '' ? (
          value
        ) : (
          <span className="italic text-gray-400">Not set</span>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  optional,
  placeholder,
  value,
  onChange,
  type = 'text',
  icon,
  className = '',
  error,
}: {
  label: string
  required?: boolean
  optional?: boolean
  placeholder?: string
  value: string
  onChange: (v: string) => void
  type?: string
  icon?: React.ReactNode
  className?: string
  error?: string
}) {
  const fieldId = useId()
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={fieldId} className="text-xs font-semibold text-gray-600">
        {label}
        {required && <span className="ml-0.5 text-orange-500">*</span>}
        {optional && (
          <span className="ml-1 font-normal text-gray-400">(Optional)</span>
        )}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        )}
        <input
          id={fieldId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className={`w-full rounded-lg border py-2 text-sm text-gray-800 placeholder-gray-400 outline-none transition bg-white
            ${error ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-petko-blue focus:ring-2 focus:ring-petko-blue/20'}
            ${icon ? 'pl-9 pr-3' : 'px-3'}`}
        />
      </div>
      {error && (
        <p id={`${fieldId}-error`} className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)

  const [displayName, setDisplayName] = useState(profile?.full_name ?? '')
  const [nameError, setNameError] = useState<string | undefined>()
  const [isSavingName, setIsSavingName] = useState(false)
  const [isLoadingMeta, setIsLoadingMeta] = useState(true)
  const [joinedDate, setJoinedDate] = useState<string>('')
  const [savedShipping, setSavedShipping] = useState<OrderShipping | null>(null)

  // Shipping edit form state
  const [isEditingShipping, setIsEditingShipping] = useState(false)
  const [isSavingShipping, setIsSavingShipping] = useState(false)
  const [shipFullName, setShipFullName] = useState('')
  const [shipEmail, setShipEmail] = useState('')
  const [shipPhone, setShipPhone] = useState('')
  const [shipAddress1, setShipAddress1] = useState('')
  const [shipAddress2, setShipAddress2] = useState('')
  const [shipCity, setShipCity] = useState('')
  const [shipProvince, setShipProvince] = useState('')
  const [shipPostalCode, setShipPostalCode] = useState('')
  const [shippingErrors, setShippingErrors] = useState<ShippingErrors>({})

  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  useEffect(() => {
    let active = true

    async function loadDetails(): Promise<void> {
      try {
        const details = await fetchAccountDetails()
        if (!active) return
        setSavedShipping(details.shipping)
        setJoinedDate(new Date(details.createdAt).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        }))
      } catch (err: unknown) {
        if (active) toast.error(getApiErrorMessage(err, 'Could not load your saved details.'))
      } finally {
        if (active) setIsLoadingMeta(false)
      }
    }
    void loadDetails()

    return () => {
      active = false
    }
  }, [])

  function openShippingEditor() {
    setShipFullName(savedShipping?.full_name || displayName || profile?.full_name || '')
    setShipEmail(savedShipping?.email || profile?.email || '')
    setShipPhone(savedShipping?.phone || '')
    setShipAddress1(savedShipping?.address_line1 || '')
    setShipAddress2(savedShipping?.address_line2 || '')
    setShipCity(savedShipping?.city || '')
    setShipProvince(savedShipping?.province || '')
    setShipPostalCode(savedShipping?.postal_code || '')
    setShippingErrors({})
    setIsEditingShipping(true)
  }

  function validateShipping(): ShippingErrors {
    return validateCheckoutShipping({
      full_name: shipFullName, email: shipEmail, phone: shipPhone,
      address_line1: shipAddress1, address_line2: shipAddress2, city: shipCity,
      province: shipProvince, postal_code: shipPostalCode,
    })
  }

  function clearFieldError(field: keyof ShippingErrors) {
    setShippingErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  async function handleSaveShipping(e: React.FormEvent) {
    e.preventDefault()

    const validationErrors = validateShipping()
    if (Object.keys(validationErrors).length > 0) {
      setShippingErrors(validationErrors)
      return
    }

    const updatedShipping: OrderShipping = {
      full_name: shipFullName.trim(),
      email: shipEmail.trim(),
      phone: shipPhone.trim(),
      address_line1: shipAddress1.trim(),
      address_line2: shipAddress2.trim(),
      city: shipCity.trim(),
      province: shipProvince.trim(),
      postal_code: shipPostalCode.trim(),
    }

    setIsSavingShipping(true)
    try {
      if (!profile) return
      await saveShippingDetails(updatedShipping, profile.id)

      setSavedShipping(updatedShipping)
      setShippingErrors({})
      setIsEditingShipping(false)
      toast.success('Contact & shipping details saved!', {
        style: toastStyle('success'),
        iconTheme: toastIconTheme('success'),
      })
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save shipping details'), {
        style: toastStyle('error'),
        iconTheme: toastIconTheme('error'),
      })
    } finally {
      setIsSavingShipping(false)
    }
  }

  async function handleClearShipping() {
    setIsSavingShipping(true)
    try {
      if (!profile) return
      await saveShippingDetails(null, profile.id)

      setSavedShipping(null)
      setShippingErrors({})
      setIsEditingShipping(false)
      toast.success('Saved shipping details cleared.', {
        style: toastStyle('success'),
        iconTheme: toastIconTheme('success'),
      })
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to clear shipping details'), {
        style: toastStyle('error'),
        iconTheme: toastIconTheme('error'),
      })
    } finally {
      setIsSavingShipping(false)
    }
  }

  const trimmedName = displayName.trim()
  const currentSavedName = (profile?.full_name ?? '').trim()
  const hasNameChanged = trimmedName.length > 0 && trimmedName !== currentSavedName

  async function handleSaveDisplayName(e: React.FormEvent) {
    e.preventDefault()
    if (!trimmedName || trimmedName.length > 120) {
      setNameError('Enter a display name, up to 120 characters.')
      return
    }
    setNameError(undefined)

    setIsSavingName(true)
    try {
      const updated = await updateDisplayName(trimmedName)
      if (useAuthStore.getState().profile?.id !== updated.id) return
      useAuthStore.getState().setProfile(updated)
      setDisplayName(updated.full_name)

      toast.success('Display name updated!', {
        style: toastStyle('success'),
        iconTheme: toastIconTheme('success'),
      })
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to update display name'), {
        style: toastStyle('error'),
        iconTheme: toastIconTheme('error'),
      })
    } finally {
      setIsSavingName(false)
    }
  }

  async function handleDeleteAccount() {
    const deletingUserId = profile?.id
    if (!deletingUserId) return
    setConfirmDeleteOpen(false)
    setIsDeleting(true)

    try {
      await deleteCurrentAccount()
      if (useAuthStore.getState().session?.user.id !== deletingUserId) return
      // The account is already gone; an expired sign-out token must not report
      // that deletion failed or leave the old profile/cart visible.
      try { await signOut() } catch { /* Deleted sessions can no longer be revoked. */ }
      useAuthStore.getState().clearSession()
      useCartStore.getState().setOwner(null)
      toast.success('Your account has been permanently deleted.', {
        style: toastStyle('success'),
        iconTheme: toastIconTheme('success'),
      })
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to delete account'), {
        style: toastStyle('error'),
        iconTheme: toastIconTheme('error'),
      })
      setIsDeleting(false)
    }
  }

  const avatarInitial =
    trimmedName.charAt(0).toUpperCase() ||
    profile?.email?.charAt(0).toUpperCase() ||
    'U'

  return (
    <div
      className="min-h-screen w-full bg-petko-cream p-4 font-sans sm:p-6 lg:p-10"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      {/* ── Page Banner ─────────────────────────────────────────────────── */}
      <PageBanner
        title="My Profile"
        subtitle="Manage your display name, edit your saved shipping details, and view account info."
      >
        <div className="flex items-center border-t border-orange-100 bg-orange-50/60 px-3 py-2 sm:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#10298E] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0B3B8C] active:scale-95 sm:px-3"
          >
            <ArrowLeft size={13} />
            <span>
              Back<span className="hidden sm:inline"> to Storefront</span>
            </span>
          </Link>
        </div>
      </PageBanner>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div className="mx-auto mt-6 max-w-screen-xl space-y-6 pb-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr] lg:items-start">
          {/* ── LEFT COLUMN: Profile Summary Card ── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={trimmedName || 'User avatar'}
                  className="h-24 w-24 rounded-full border-4 border-orange-100 object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-orange-100 bg-orange-50 text-3xl font-black text-orange-600 shadow-sm">
                  {avatarInitial}
                </div>
              )}

              <h2 className="mt-4 text-lg font-extrabold text-[#10298E]">
                {trimmedName || 'PetKo Shopper'}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500 break-all">
                {profile?.email ?? 'Signed in via Google'}
              </p>

              <span
                className={`mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                  profile?.role === 'admin'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-blue-100 text-[#10298E]'
                }`}
              >
                <Shield size={11} />
                {profile?.role ?? 'customer'}
              </span>
            </div>

            <div className="mt-6 space-y-3 border-t border-gray-100 pt-5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <Mail size={13} />
                  Sign-in Provider
                </span>
                <span className="font-semibold text-gray-700">Google OAuth</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <Calendar size={13} />
                  Member Since
                </span>
                <span className="font-semibold text-gray-700">
                  {isLoadingMeta ? 'Loading…' : joinedDate || 'Active Member'}
                </span>
              </div>

              {profile?.id && (
                <div className="pt-1">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Account ID
                  </span>
                  <p className="mt-0.5 break-all rounded-md bg-gray-50 px-2.5 py-1.5 font-mono text-[11px] text-gray-500">
                    {profile.id}
                  </p>
                </div>
              )}

              <div className="pt-2">
                <Link
                  to="/orders"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50/70 px-4 py-2.5 text-xs font-bold text-[#10298E] transition hover:border-orange-300 hover:bg-orange-100/80"
                >
                  <Package size={14} className="text-orange-600" />
                  <span>View My Orders</span>
                </Link>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Editable Display Name + Editable Shipping + Danger Zone ── */}
          <div className="space-y-6">
            {/* 1. Account & Display Name */}
            <form
              noValidate
              onSubmit={handleSaveDisplayName}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#10298E]">
                  <User size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#10298E]">
                    Account Information
                  </h3>
                  <p className="text-xs text-gray-400">
                    You can update your display name.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Editable Display Name */}
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label
                    htmlFor="profile-display-name"
                    className="text-xs font-semibold text-gray-700"
                  >
                    Display Name <span className="text-orange-500">*</span>
                  </label>
                  <div className="flex flex-col gap-2.5 sm:flex-row">
                    <input
                      id="profile-display-name"
                      type="text"
                      maxLength={120}
                      disabled={isSavingName || isDeleting}
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value)
                        if (nameError) setNameError(undefined)
                      }}
                      placeholder="Enter your display name"
                      aria-invalid={Boolean(nameError)}
                      aria-describedby={nameError ? 'profile-display-name-error' : undefined}
                      className={`flex-1 rounded-lg border bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none transition ${
                        nameError
                          ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                          : 'border-gray-200 focus:border-petko-blue focus:ring-2 focus:ring-petko-blue/20'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={isSavingName || !hasNameChanged}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#10298E] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#0B3B8C] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Save size={14} />
                      {isSavingName ? 'Saving…' : 'Save Name'}
                    </button>
                  </div>
                  {nameError && (
                    <p id="profile-display-name-error" className="text-xs text-red-700">
                      {nameError}
                    </p>
                  )}
                </div>

                {/* Read-Only Email */}
                <div className="sm:col-span-2">
                  <ReadOnlyField label="Email Address (Read-Only)" value={profile?.email} />
                </div>
              </div>
            </form>

            {/* 2. Saved Contact & Shipping Information (Editable with Checkout-style inline errors) */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <MapPin size={16} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#10298E]">
                      Saved Contact &amp; Shipping Details
                    </h3>
                    <p className="text-xs text-gray-400">
                      Automatically pre-filled during checkout. You can add or update them here anytime.
                    </p>
                  </div>
                </div>

                {!isLoadingMeta && !isEditingShipping && savedShipping && (
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                      <CheckCircle2 size={12} />
                      Saved
                    </span>
                    <button
                      type="button"
                      onClick={openShippingEditor}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-[#10298E] shadow-sm transition hover:border-[#10298E]/40 hover:bg-blue-50/50"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                  </div>
                )}
              </div>

              {isLoadingMeta ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="space-y-1.5">
                      <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                      <div className="h-9 w-full animate-pulse rounded-lg bg-gray-100" />
                    </div>
                  ))}
                </div>
              ) : isEditingShipping ? (
                <form noValidate onSubmit={handleSaveShipping}>
                  <fieldset disabled={isSavingShipping} className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Field
                        label="Full Name"
                        required
                        placeholder="Juan Dela Cruz"
                        value={shipFullName}
                        onChange={(v) => {
                          setShipFullName(v)
                          clearFieldError('fullName')
                        }}
                        error={shippingErrors.fullName}
                      />
                      <Field
                        label="Email Address"
                        required
                        type="email"
                        placeholder="your@email.com"
                        value={shipEmail}
                        onChange={(v) => {
                          setShipEmail(v)
                          clearFieldError('email')
                        }}
                        error={shippingErrors.email}
                        icon={
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <path d="m2 7 10 7 10-7" />
                          </svg>
                        }
                      />
                      <Field
                        label="Contact Number"
                        required
                        type="tel"
                        placeholder="09xxxxxxxxx"
                        value={shipPhone}
                        onChange={(v) => {
                          if (/^\d*$/.test(v) && v.length <= 11) {
                            setShipPhone(v)
                            clearFieldError('contactNumber')
                          }
                        }}
                        error={shippingErrors.contactNumber}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field
                        label="Address Line 1"
                        required
                        placeholder="12 Pet Residence"
                        value={shipAddress1}
                        onChange={(v) => {
                          setShipAddress1(v)
                          clearFieldError('addressLine1')
                        }}
                        error={shippingErrors.addressLine1}
                      />
                      <Field
                        label="Address Line 2"
                        optional
                        placeholder="123 St., Brgy Woof"
                        value={shipAddress2}
                        onChange={(v) => {
                          setShipAddress2(v)
                          clearFieldError('addressLine2')
                        }}
                        error={shippingErrors.addressLine2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <Field
                        label="City/Municipality"
                        required
                        placeholder="Sta Mesa"
                        value={shipCity}
                        onChange={(v) => {
                          setShipCity(v)
                          clearFieldError('city')
                        }}
                        error={shippingErrors.city}
                      />
                      <Field
                        label="Province"
                        required
                        placeholder="Metro Manila"
                        value={shipProvince}
                        onChange={(v) => {
                          setShipProvince(v)
                          clearFieldError('province')
                        }}
                        error={shippingErrors.province}
                      />
                      <Field
                        label="Postal Code"
                        required
                        placeholder="1100"
                        className="col-span-2 sm:col-span-1"
                        value={shipPostalCode}
                        onChange={(v) => {
                          if (/^\d*$/.test(v) && v.length <= 4) {
                            setShipPostalCode(v)
                            clearFieldError('postalCode')
                          }
                        }}
                        error={shippingErrors.postalCode}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                      {savedShipping ? (
                        <button
                          type="button"
                          onClick={handleClearShipping}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={13} />
                          Remove Saved Address
                        </button>
                      ) : (
                        <div />
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShippingErrors({})
                            setIsEditingShipping(false)
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                          <X size={13} />
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#10298E] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#0B3B8C] active:scale-95 disabled:opacity-50"
                        >
                          <Save size={13} />
                          {isSavingShipping ? 'Saving…' : 'Save Details'}
                        </button>
                      </div>
                    </div>
                  </fieldset>
                </form>
              ) : savedShipping ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <ReadOnlyField label="Recipient Name" value={savedShipping.full_name} />
                    <ReadOnlyField label="Checkout Email" value={savedShipping.email} />
                    <ReadOnlyField label="Contact Number" value={savedShipping.phone} />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <ReadOnlyField label="Address Line 1" value={savedShipping.address_line1} />
                    <ReadOnlyField label="Address Line 2" value={savedShipping.address_line2} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <ReadOnlyField label="City / Municipality" value={savedShipping.city} />
                    <ReadOnlyField label="Province" value={savedShipping.province} />
                    <ReadOnlyField label="Postal Code" value={savedShipping.postal_code} />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-6 text-center">
                  <Phone className="mx-auto text-gray-300" size={28} />
                  <p className="mt-2 text-sm font-bold text-gray-700">
                    No saved shipping details yet
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Add your contact number and delivery address now so checkout is faster next time.
                  </p>
                  <button
                    type="button"
                    onClick={openShippingEditor}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600 active:scale-95"
                  >
                    <Plus size={14} />
                    Add Shipping Details
                  </button>
                </div>
              )}
            </div>

            {/* 3. Danger Zone — Delete Account */}
            <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-red-900">
                      Delete Account
                    </h3>
                    <p className="mt-0.5 text-xs text-red-700">
                      Permanently delete your PetKo profile, saved shipping details, and sign-in account. Complete or cancel active orders first. Completed order history is anonymized.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={isDeleting}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {isDeleting ? 'Deleting…' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Delete Confirmation Dialog ──────────────────────────────────── */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete your account?"
        message={`Are you sure you want to permanently delete ${
          profile?.email ?? 'your account'
        }?\n\nThis will remove your profile and saved details permanently and sign you out.`}
        confirmLabel="Yes, Delete My Account"
        variant="danger"
        onConfirm={handleDeleteAccount}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  )
}
