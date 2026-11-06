import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, ChevronRight, Truck, Zap } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'
import { useAuthStore } from '@/store/auth.store'
import { calculateShippingFee, FREE_SHIPPING_THRESHOLD } from '@/lib/shipping'
import pawImg from '@/assets/paw_white.png'

// ─── Step breadcrumb ────────────────────────────────────────────────────────

function StepBreadcrumb() {
  return (
    <nav aria-label="Checkout steps" className="flex items-center gap-2 text-sm font-medium text-gray-500">
      {/* Step 1 — Cart */}
      <Link to="/cart" className="flex items-center gap-1.5 hover:text-gray-700">
        <ShoppingCart size={15} />
        <span>Cart</span>
      </Link>

      <ChevronRight size={14} className="text-gray-400" />

      {/* Step 2 — Checkout (active) */}
      <span className="flex items-center gap-1.5 font-bold text-orange-500">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[11px] font-bold text-white">
          2
        </span>
        Checkout
      </span>

      <ChevronRight size={14} className="text-gray-400" />

      {/* Step 3 — Confirmation (pending) */}
      <span className="flex items-center gap-1.5 text-gray-400">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[11px] text-gray-400">
          3
        </span>
        Confirmation
      </span>
    </nav>
  )
}

// ─── Section card ───────────────────────────────────────────────────────────

function SectionCard({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
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

// ─── Field ──────────────────────────────────────────────────────────────────

function Field({
  label, required, optional, placeholder, value, onChange, type = 'text', icon, className = '',
}: {
  label: string; required?: boolean; optional?: boolean; placeholder?: string
  value: string; onChange: (v: string) => void; type?: string; icon?: React.ReactNode; className?: string
}) {
  const inputId = useId()
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={inputId} className="text-xs font-semibold text-gray-600">
        {label}
        {required && <span className="ml-0.5 text-orange-500">*</span>}
        {optional && <span className="ml-1 font-normal text-gray-400">(Optional)</span>}
      </label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
        <input
          id={inputId}
          required={required}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-gray-200 bg-white py-2 text-sm text-gray-800 placeholder-gray-400 outline-none transition
            focus:border-petko-blue focus:ring-2 focus:ring-petko-blue/20
            ${icon ? 'pl-9 pr-3' : 'px-3'}`}
        />
      </div>
    </div>
  )
}

// ─── Delivery option ─────────────────────────────────────────────────────────

function DeliveryOption({ selected, onSelect, icon, title, description }: {
  selected: boolean; onSelect: () => void
  icon: React.ReactNode; title: string; description: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition
        ${selected ? 'border-petko-blue bg-blue-50' : 'border-gray-200 bg-white hover:border-petko-blue/40'}`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-petko-blue text-white' : 'bg-gray-100 text-gray-500'}`}>
        {icon}
      </span>
      <div>
        <p className={`text-xs font-bold ${selected ? 'text-petko-blue' : 'text-gray-800'}`}>{title}</p>
        <p className="text-[11px] text-gray-400">{description}</p>
      </div>
    </button>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const items      = useCartStore((s) => s.items)
  const totalPrice = useCartStore((s) => s.totalPrice())
  const totalItems = useCartStore((s) => s.totalItems())
  const profile    = useAuthStore((s) => s.profile)

  const [fullName,      setFullName]      = useState(profile?.full_name ?? '')
  const [email,         setEmail]         = useState(profile?.email ?? '')
  const [contactNumber, setContactNumber] = useState('')
  const [addressLine1,  setAddressLine1]  = useState('')
  const [addressLine2,  setAddressLine2]  = useState('')
  const [city,          setCity]          = useState('')
  const [province,      setProvince]      = useState('')
  const [postalCode,    setPostalCode]    = useState('')
  const [delivery,      setDelivery]      = useState<'standard' | 'express'>('standard')

  const isFreeShipping = totalPrice >= FREE_SHIPPING_THRESHOLD
  const shippingFee    = calculateShippingFee(totalPrice, delivery)
  const grandTotal     = totalPrice + shippingFee

  return (
    <div className="space-y-0">

      {/* ── Banner ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-petko-cream px-8 py-6 rounded-t-2xl">
        {/* large paw left */}
        {[
          { top: '-10%', left: '-3%',  size: 110, rotate: '-20deg', opacity: 0.5  },
          { top:  '30%', left: '-1%',  size:  80, rotate:  '10deg', opacity: 0.35 },
          { top:  '-5%', right: '-2%', size: 120, rotate:  '20deg', opacity: 0.5  },
          { top:  '40%', right:  '1%', size:  70, rotate: '-15deg', opacity: 0.3  },
        ].map((p, i) => (
          <img key={i} src={pawImg} alt="" aria-hidden="true"
            style={{
              position: 'absolute',
              top: p.top, left: p.left, right: p.right,
              width: `${p.size}px`, height: `${p.size}px`,
              objectFit: 'contain', opacity: p.opacity,
              transform: `rotate(${p.rotate})`,
              filter: 'sepia(1) saturate(6) hue-rotate(5deg)',
            }}
          />
        ))}

        <div className="relative z-10">
          <h1 className="flex items-center gap-2 text-3xl font-black text-petko-blue" style={{ fontFamily: "'Nunito', sans-serif" }}>
            Checkout
            <img src={pawImg} alt="" aria-hidden="true" className="h-8 w-8 object-contain"
              style={{ filter: 'sepia(1) saturate(6) hue-rotate(5deg)' }} />
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">Preview your delivery details. Ordering and payments are coming soon.</p>
        </div>
      </div>

      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <div className="flex justify-center bg-petko-cream/60 py-4">
        <StepBreadcrumb />
      </div>

      {/* ── Two-column body ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_320px]">

        {/* LEFT ── forms */}
        <div className="space-y-4 bg-petko-cream/40 px-6 py-6">

          {/* 1 · Contact Details */}
          <SectionCard number={1} title="Contact Details">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Full Name" required placeholder="Juan Dela Cruz" value={fullName} onChange={setFullName} />
              <Field label="Email Address" required type="email" placeholder="your@email.com" value={email} onChange={setEmail}
                icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>}
              />
              <Field label="Contact Number" required placeholder="09xxxxxxxxx" value={contactNumber} onChange={setContactNumber} />
            </div>
          </SectionCard>

          {/* 2 · Shipping Details */}
          <SectionCard number={2} title="Shipping Details">
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Address Line 1" required placeholder="12 Pet Residence" value={addressLine1} onChange={setAddressLine1} />
                <Field label="Address Line 2" optional placeholder="123 St Brgy Woof" value={addressLine2} onChange={setAddressLine2} />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="City/Municipality" required placeholder="Sta Mesa" value={city} onChange={setCity} />
                <Field label="Province" required placeholder="Metro Manila" value={province} onChange={setProvince} />
                <Field label="Postal Code" required placeholder="1100" value={postalCode} onChange={setPostalCode} />
              </div>
            </div>
          </SectionCard>

          {/* 3 · Delivery Option */}
          <SectionCard number={3} title="Delivery Option">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DeliveryOption
                selected={delivery === 'standard'} onSelect={() => setDelivery('standard')}
                icon={<Truck size={15} />} title="Standard Delivery" description="3–5 business days"
              />
              <DeliveryOption
                selected={delivery === 'express'} onSelect={() => setDelivery('express')}
                icon={<Zap size={15} />} title="Express Delivery" description="1–2 business days"
              />
            </div>
          </SectionCard>

        </div>

        {/* RIGHT ── Order Summary */}
        <div className="border-l border-gray-200 bg-white px-6 py-6 space-y-4">

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800">Order Summary</h2>
            <Link to="/cart" className="text-xs font-semibold text-petko-blue underline underline-offset-2 hover:opacity-80">
              Edit Cart
            </Link>
          </div>

          {/* item list */}
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <li key={item.product_id} className="flex items-center gap-3 py-3">
                {/* thumbnail + quantity badge */}
                <div className="relative shrink-0">
                  <img src={item.image_url} alt={item.name}
                    className="h-14 w-14 rounded-xl border border-gray-100 object-cover" />
                  <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-petko-blue text-[10px] font-bold text-white">
                    {item.quantity}
                  </span>
                </div>

                {/* name + desc */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 line-clamp-1">{item.name}</p>
                  <p className="text-[10px] text-gray-400 line-clamp-1">
                    {item.name}
                  </p>
                </div>

                {/* price */}
                <span className="shrink-0 text-xs font-semibold text-gray-800 tabular-nums">
                  ₱ {(item.price * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </li>
            ))}
          </ul>

          {/* totals */}
          <div className="space-y-2 border-t border-gray-100 pt-3 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'})</span>
              <span className="font-medium text-gray-800 tabular-nums">
                ₱ {totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Shipping Fee</span>
              {isFreeShipping
                ? <span className="font-bold text-green-600">FREE</span>
                : <span className="font-medium text-gray-800 tabular-nums">₱ {shippingFee.toFixed(2)}</span>
              }
            </div>
            {isFreeShipping && (
              <p className="text-[10px] font-medium text-green-600">You unlocked free shipping!</p>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-3 font-bold text-gray-800">
              <span>Estimated Total</span>
              <span>₱ {grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            disabled
            aria-describedby="checkout-preview-notice"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-petko-blue py-3 text-sm font-bold text-white
              hover:bg-petko-blue/90 active:scale-[0.98] transition
              disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ordering Coming Soon
          </button>
          <p id="checkout-preview-notice" className="text-center text-xs text-gray-500">
            Checkout preview only. No order or payment will be submitted.
          </p>

          <Link to="/cart" className="block text-center text-xs font-medium text-gray-400 hover:text-gray-700">
            ← Back to Cart
          </Link>
        </div>

      </div>
    </div>
  )
}
