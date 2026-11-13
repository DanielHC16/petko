import { useId, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ShoppingCart,
  ChevronRight,
  Truck,
  Zap,
  ShieldCheck,
  PackageCheck,
  RotateCcw,
  Heart,
} from 'lucide-react'
import { useCartStore, type CartItem } from '@/store/cart.store'
import { useAuthStore } from '@/store/auth.store'
import logoImg from '@/assets/logo.png'
import PageBanner from '@/components/layout/PageBanner'
import gcashImg from '@/assets/GCash_logo.png'
import { useCheckout } from './use-checkout'

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
function StepBreadcrumb() {
  return (
    <nav className="flex items-center gap-2 text-sm font-medium text-gray-500">
      <Link
        to="/cart"
        className="flex items-center gap-1.5 hover:text-gray-700"
      >
        <ShoppingCart size={15} />
        <span>Cart</span>
      </Link>
      <ChevronRight size={14} className="text-gray-400" />
      <span className="flex items-center gap-1.5 font-bold text-orange-500">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[11px] font-bold text-white">
          2
        </span>
        Checkout
      </span>
      <ChevronRight size={14} className="text-gray-400" />
      <span className="flex items-center gap-1.5 text-gray-400">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[11px] text-gray-400">
          3
        </span>
        Confirmation
      </span>
    </nav>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({
  number,
  title,
  children,
  grow,
}: {
  number: number
  title: string
  children: React.ReactNode
  grow?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm ${grow ? 'flex-1' : ''}`}
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-petko-blue text-sm font-bold text-white">
          {number}
        </span>
        <h2 className="text-sm font-bold text-petko-blue">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────
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

// ─── Delivery option ──────────────────────────────────────────────────────────
function DeliveryOption({
  selected,
  onSelect,
  icon,
  title,
  description,
  price,
  free,
}: {
  selected: boolean
  onSelect: () => void
  icon: React.ReactNode
  title: string
  description: string
  price?: string
  free?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition
        ${selected ? 'border-petko-blue bg-blue-50' : 'border-gray-200 bg-white hover:border-petko-blue/40'}`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-petko-blue text-white' : 'bg-gray-100 text-gray-500'}`}
      >
        {icon}
      </span>
      <div className="flex-1">
        <p
          className={`text-xs font-bold ${selected ? 'text-petko-blue' : 'text-gray-800'}`}
        >
          {title}
        </p>
        <p className="text-[11px] text-gray-400">{description}</p>
      </div>
      {free && <span className="text-sm font-bold text-green-600">FREE</span>}
      {price && (
        <span className="text-sm font-bold text-orange-500">{price}</span>
      )}
    </button>
  )
}

// ─── Payment method card ──────────────────────────────────────────────────────
function PaymentCard({
  selected,
  onSelect,
  children,
  label,
  sub,
  disabled = false,
}: {
  selected: boolean
  onSelect: () => void
  children: React.ReactNode
  label: string
  sub: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 transition w-full disabled:cursor-not-allowed disabled:opacity-50
        ${selected ? 'border-petko-blue bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
    >
      <div className="flex items-center justify-center h-8">{children}</div>
      <span className="text-xs font-bold text-gray-800">{label}</span>
      <span className="text-[10px] text-gray-400 text-center leading-tight">
        {sub}
      </span>
    </button>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isDirect = searchParams.get('mode') === 'direct'
  const cartItems = useCartStore((s) => s.items)
  const profile = useAuthStore((s) => s.profile)

  const directItem = useMemo((): CartItem | null => {
    if (!isDirect) return null
    try {
      const raw = sessionStorage.getItem('direct_checkout_item')
      if (!raw) return null
      return JSON.parse(raw) as CartItem
    } catch {
      return null
    }
  }, [isDirect])

  const items = isDirect && directItem ? [directItem] : cartItems
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [email, setEmail] = useState(profile?.email ?? '')
  const [contactNumber, setContactNumber] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [delivery, setDelivery] = useState<'standard' | 'express'>('standard')
  const checkout = useCheckout()
  const errors = checkout.errors

  const isFreeShipping = totalPrice >= 999
  const shippingFee = delivery === 'express' ? 199 : isFreeShipping ? 0 : 99
  const grandTotal = totalPrice + shippingFee

  async function handlePlaceOrder(): Promise<void> {
    const directOrderItems = isDirect && directItem
      ? [{ product_id: directItem.product_id, quantity: directItem.quantity }]
      : undefined
    const order = await checkout.submit(
      {
        full_name: fullName,
        email,
        phone: contactNumber,
        address_line1: addressLine1,
        address_line2: addressLine2,
        city,
        province,
        postal_code: postalCode,
      },
      delivery,
      directOrderItems,
    )
    if (order) {
      if (isDirect) sessionStorage.removeItem('direct_checkout_item')
      navigate(`/orders?order=${order.id}`)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#ecdab6] p-6 font-sans lg:p-10">
     {/* ── Page banner ───────────────────────────────────────────── */}
      <PageBanner
        title="Checkout"
        subtitle="Almost there! Review your details and place your order."
      />

      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="flex justify-center py-3">
        <StepBreadcrumb />
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-screen-xl px-4 pb-10 sm:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px] lg:items-stretch">
          {/* LEFT ── form sections */}
          <fieldset
            disabled={checkout.isPending}
            className="min-w-0 flex flex-col gap-4"
          >
            {/* 1 · Contact Details */}
            <SectionCard number={1} title="Contact Details">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field
                  label="Full Name"
                  required
                  placeholder="Juan Dela Cruz"
                  value={fullName}
                  onChange={setFullName}
                  error={errors.fullName}
                />
                <Field
                  label="Email Address"
                  required
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={setEmail}
                  error={errors.email}
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
                  placeholder="09xxxxxxxxx"
                  value={contactNumber}
                  onChange={(v) => {
                    if (/^\d*$/.test(v) && v.length <= 11) setContactNumber(v)
                  }}
                  type="tel"
                  error={errors.contactNumber}
                />
              </div>
            </SectionCard>

            {/* 2 · Shipping Details */}
            <SectionCard number={2} title="Shipping Details">
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label="Address Line 1"
                    required
                    placeholder="12 Pet Residence"
                    value={addressLine1}
                    onChange={setAddressLine1}
                    error={errors.addressLine1}
                  />
                  <Field
                    label="Address Line 2"
                    optional
                    placeholder="123 St., Brgy Woof"
                    value={addressLine2}
                    onChange={setAddressLine2}
                    error={errors.addressLine2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Field
                    label="City/Municipality"
                    required
                    placeholder="Sta Mesa"
                    value={city}
                    onChange={setCity}
                    error={errors.city}
                  />
                  <Field
                    label="Province"
                    required
                    placeholder="Metro Manila"
                    value={province}
                    onChange={setProvince}
                    error={errors.province}
                  />
                  <Field
                    label="Postal Code"
                    required
                    placeholder="1100"
                    value={postalCode}
                    onChange={(v) => {
                      if (/^\d*$/.test(v) && v.length <= 4) setPostalCode(v)
                    }}
                    error={errors.postalCode}
                  />
                </div>
              </div>
            </SectionCard>

            {/* 3 · Delivery Option */}
            <SectionCard number={3} title="Delivery Option">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DeliveryOption
                  selected={delivery === 'standard'}
                  onSelect={() => setDelivery('standard')}
                  icon={<Truck size={15} />}
                  title="Standard Delivery"
                  description="3-5 Business Days"
                  free={isFreeShipping}
                  price={!isFreeShipping ? '₱ 99.00' : undefined}
                />
                <DeliveryOption
                  selected={delivery === 'express'}
                  onSelect={() => setDelivery('express')}
                  icon={<Zap size={15} />}
                  title="Express Delivery"
                  description="1-2 Business Days"
                  price="₱ 199.00"
                />
              </div>
            </SectionCard>

            {/* 4 · Payment Method */}
            <SectionCard number={4} title="Payment Method" grow>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <PaymentCard
                  selected={false}
                  disabled
                  onSelect={() => undefined}
                  label="GCash"
                  sub="Not available yet"
                >
                  <img
                    src={gcashImg}
                    alt="GCash"
                    className="h-7 object-contain"
                  />
                </PaymentCard>
                <PaymentCard
                  selected={false}
                  disabled
                  onSelect={() => undefined}
                  label="Maya"
                  sub="Not available yet"
                >
                  <span
                    className="text-base font-black"
                    style={{ color: '#00B865' }}
                  >
                    maya
                  </span>
                </PaymentCard>
                <PaymentCard
                  selected={false}
                  disabled
                  onSelect={() => undefined}
                  label="Credit / Debit Card"
                  sub="Not available yet"
                >
                  <div className="flex items-center gap-1">
                    <div className="h-5 w-7 rounded bg-red-500 flex items-center justify-center">
                      <div className="h-3 w-3 rounded-full bg-yellow-400 -ml-1.5" />
                      <div className="h-3 w-3 rounded-full bg-red-400 -ml-1.5 opacity-70" />
                    </div>
                    <span className="text-[10px] font-bold text-petko-blue">
                      VISA
                    </span>
                  </div>
                </PaymentCard>
                <PaymentCard
                  selected
                  onSelect={() => undefined}
                  label="Cash on Delivery"
                  sub="Pay when you receive"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
                    <span className="text-base">💵</span>
                  </div>
                </PaymentCard>
              </div>
            </SectionCard>
          </fieldset>

          {/* RIGHT ── Order Summary */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm space-y-4">
              {/* header */}
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-petko-blue">
                  Order Summary
                </h2>
                {isDirect && directItem ? (
                  <Link
                    to={`/products/${directItem.product_id}`}
                    className="text-xs font-semibold text-petko-blue underline underline-offset-2 hover:opacity-80"
                  >
                    Change Item
                  </Link>
                ) : (
                  <Link
                    to="/cart"
                    className="text-xs font-semibold text-petko-blue underline underline-offset-2 hover:opacity-80"
                  >
                    Edit Cart
                  </Link>
                )}
              </div>

              {/* Items stay scrollable so large carts keep the summary compact. */}
              <ul className="max-h-[280px] divide-y divide-gray-100 overflow-y-auto pr-1">
                {items.map((item) => (
                  <li
                    key={item.product_id}
                    className="flex items-center gap-3 py-3 pl-2"
                  >
                    <div className="relative ml-1 shrink-0">
                      <div className="h-14 w-14 rounded-xl border border-gray-100 overflow-hidden bg-petko-cream flex items-center justify-center">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <img
                            src={logoImg}
                            alt="PetKo"
                            className="w-3/4 object-contain"
                          />
                        )}
                      </div>
                      <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-petko-blue text-[10px] font-bold text-white">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 line-clamp-1">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-gray-400 tabular-nums">
                        ₱{' '}
                        {item.price.toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        each
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-gray-800 tabular-nums">
                      ₱{' '}
                      {(item.price * item.quantity).toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </li>
                ))}
              </ul>

              {/* totals */}
              <div className="space-y-2 border-t border-gray-100 pt-3 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>
                    Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'}
                    )
                  </span>
                  <span className="font-medium text-gray-800 tabular-nums">
                    ₱{' '}
                    {totalPrice.toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping Fee</span>
                  {shippingFee === 0 ? (
                    <span className="font-bold text-green-600">FREE</span>
                  ) : (
                    <span className="font-medium text-gray-800 tabular-nums">
                      ₱ {shippingFee.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <p className="border-t border-gray-100 pt-3 text-xs text-gray-500">
                Cash on Delivery is currently available. Online payments and
                vouchers are not available yet.
              </p>

              {/* grand total */}
              <div className="flex items-baseline justify-between border-t border-gray-100 pt-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Total Amount
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Inclusive of VAT where applicable
                  </p>
                </div>
                <span className="text-xl font-black text-orange-500">
                  ₱{' '}
                  {grandTotal.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              {/* CTA */}
              {checkout.error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                  {checkout.error}
                </p>
              )}
              {items.length === 0 && (
                <p className="text-sm text-gray-600">
                  Your cart is empty.{' '}
                  <Link to="/" className="font-bold text-petko-blue underline">
                    Browse products
                  </Link>
                </p>
              )}
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={items.length === 0 || checkout.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-petko-red py-3.5 text-sm font-bold text-white
                  hover:bg-red-700 active:scale-[0.98] transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checkout.isPending ? 'Placing your order…' : 'Place Order'}
              </button>

              {/* secure checkout */}
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <ShieldCheck size={14} />
                <div>
                  <p className="text-[11px] font-semibold text-gray-600">
                    Secure Checkout
                  </p>
                  <p className="text-[10px]">Your data is safe with us</p>
                </div>
              </div>
            </div>

            {/* info strip */}
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-1 text-center">
                  <PackageCheck size={18} className="text-petko-blue" />
                  <p className="text-[11px] font-bold text-gray-700">
                    Free Shipping
                  </p>
                  <p className="text-[10px] text-gray-400 leading-tight">
                    Standard delivery on orders ₱999+
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <RotateCcw size={18} className="text-petko-blue" />
                  <p className="text-[11px] font-bold text-gray-700">
                    7-Days Returns
                  </p>
                  <p className="text-[10px] text-gray-400 leading-tight">
                    No hassle returns for eligible items
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <Heart size={18} className="text-petko-blue" />
                  <p className="text-[11px] font-bold text-gray-700">We Care</p>
                  <p className="text-[10px] text-gray-400 leading-tight">
                    Quality Products for your pets
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
