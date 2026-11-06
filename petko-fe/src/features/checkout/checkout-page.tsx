import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, ChevronRight, Truck, Zap, Tag, ShieldCheck, PackageCheck, RotateCcw, Heart } from 'lucide-react'
import { useCartStore } from '@/store/cart.store'
import { useAuthStore } from '@/store/auth.store'
import pawImg from '@/assets/paw_white.png'
import logoImg from '@/assets/logo.png'
import pawYellowImg from '@/assets/paw_yellow.png'

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
function StepBreadcrumb() {
  return (
    <nav className="flex items-center gap-2 text-sm font-medium text-gray-500">
      <Link to="/cart" className="flex items-center gap-1.5 hover:text-gray-700">
        <ShoppingCart size={15} />
        <span>Cart</span>
      </Link>
      <ChevronRight size={14} className="text-gray-400" />
      <span className="flex items-center gap-1.5 font-bold text-orange-500">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[11px] font-bold text-white">2</span>
        Checkout
      </span>
      <ChevronRight size={14} className="text-gray-400" />
      <span className="flex items-center gap-1.5 text-gray-400">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[11px] text-gray-400">3</span>
        Confirmation
      </span>
    </nav>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({ number, title, children, grow }: { number: number; title: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm ${grow ? 'flex-1' : ''}`}>
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
function Field({ label, required, optional, placeholder, value, onChange, type = 'text', icon, className = '', error }: {
  label: string; required?: boolean; optional?: boolean; placeholder?: string
  value: string; onChange: (v: string) => void; type?: string; icon?: React.ReactNode; className?: string; error?: string
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-semibold text-gray-600">
        {label}
        {required && <span className="ml-0.5 text-orange-500">*</span>}
        {optional && <span className="ml-1 font-normal text-gray-400">(Optional)</span>}
      </label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full rounded-lg border py-2 text-sm text-gray-800 placeholder-gray-400 outline-none transition bg-white
            ${error ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-petko-blue focus:ring-2 focus:ring-petko-blue/20'}
            ${icon ? 'pl-9 pr-3' : 'px-3'}`} />
      </div>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  )
}

// ─── Delivery option ──────────────────────────────────────────────────────────
function DeliveryOption({ selected, onSelect, icon, title, description, price, free }: {
  selected: boolean; onSelect: () => void; icon: React.ReactNode
  title: string; description: string; price?: string; free?: boolean
}) {
  return (
    <button type="button" onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition
        ${selected ? 'border-petko-blue bg-blue-50' : 'border-gray-200 bg-white hover:border-petko-blue/40'}`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-petko-blue text-white' : 'bg-gray-100 text-gray-500'}`}>
        {icon}
      </span>
      <div className="flex-1">
        <p className={`text-xs font-bold ${selected ? 'text-petko-blue' : 'text-gray-800'}`}>{title}</p>
        <p className="text-[11px] text-gray-400">{description}</p>
      </div>
      {free && <span className="text-sm font-bold text-green-600">FREE</span>}
      {price && <span className="text-sm font-bold text-orange-500">{price}</span>}
    </button>
  )
}

// ─── Payment method card ──────────────────────────────────────────────────────
function PaymentCard({ selected, onSelect, children, label, sub }: {
  selected: boolean; onSelect: () => void; children: React.ReactNode; label: string; sub: string
}) {
  return (
    <button type="button" onClick={onSelect}
      className={`flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 transition w-full
        ${selected ? 'border-petko-blue bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
      <div className="flex items-center justify-center h-8">{children}</div>
      <span className="text-xs font-bold text-gray-800">{label}</span>
      <span className="text-[10px] text-gray-400 text-center leading-tight">{sub}</span>
    </button>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const navigate   = useNavigate()
  const items      = useCartStore(s => s.items)
  const totalPrice = useCartStore(s => s.totalPrice())
  const totalItems = useCartStore(s => s.totalItems())
  const profile    = useAuthStore(s => s.profile)

  const [fullName,      setFullName]      = useState(profile?.full_name ?? '')
  const [email,         setEmail]         = useState(profile?.email ?? '')
  const [contactNumber, setContactNumber] = useState('')
  const [addressLine1,  setAddressLine1]  = useState('')
  const [addressLine2,  setAddressLine2]  = useState('')
  const [city,          setCity]          = useState('')
  const [province,      setProvince]      = useState('')
  const [postalCode,    setPostalCode]    = useState('')
  const [delivery,      setDelivery]      = useState<'standard' | 'express'>('standard')
  const [payment,       setPayment]       = useState<'gcash' | 'maya' | 'card' | 'cod'>('gcash')
  const [voucher,       setVoucher]       = useState('')
  const [errors,        setErrors]        = useState<Record<string, string>>({})

  const isFreeShipping = totalPrice >= 999
  const shippingFee = delivery === 'express' ? 199 : (isFreeShipping ? 0 : 99)
  const grandTotal     = totalPrice + shippingFee

  function validate() {
    const e: Record<string, string> = {}
    if (!fullName.trim())      e.fullName      = 'Full name is required'
    if (!email.trim())         e.email         = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email'
    if (!contactNumber.trim())          e.contactNumber = 'Contact number is required'
    else if (!/^\d{10,11}$/.test(contactNumber)) e.contactNumber = 'Enter a valid PH number (10-11 digits)'
    if (!addressLine1.trim())  e.addressLine1  = 'Address is required'
    if (!city.trim())          e.city          = 'City is required'
    if (!province.trim())      e.province      = 'Province is required'
    if (!postalCode.trim())             e.postalCode    = 'Postal code is required'
    else if (!/^\d{4}$/.test(postalCode)) e.postalCode  = 'Enter a valid 4-digit postal code'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handlePlaceOrder() {
    if (!validate()) return
    navigate('/orders')
  }

  return (
    <div className="min-h-screen bg-petko-cream">

      {/* ── Banner ────────────────────────────────────────────────────────── */}
      <div className="rounded-b-2xl">
        <div className="relative overflow-hidden rounded-b-2xl bg-[#FFFBF5] h-[110px] sm:h-[130px] lg:h-[150px]">

          {/* Left paws */}
          <img src={pawYellowImg} alt="" aria-hidden="true"
            className="absolute z-10 pointer-events-none opacity-70 w-[100px] sm:w-[140px] lg:w-[180px]"
            style={{ top: '40%', left: '-25px', transform: 'rotate(23deg)' }} />
          <img src={pawYellowImg} alt="" aria-hidden="true"
            className="absolute z-10 pointer-events-none opacity-70 w-[100px] sm:w-[140px] lg:w-[180px]"
            style={{ top: 'calc(40% + 4px)', left: '-30px', transform: 'rotate(23deg)' }} />

          {/* Right paws */}
          <img src={pawYellowImg} alt="" aria-hidden="true"
            className="absolute z-10 pointer-events-none opacity-70 w-[110px] sm:w-[155px] lg:w-[200px]"
            style={{ top: '-45px', right: '-50px', transform: 'rotate(195deg)' }} />
          <img src={pawYellowImg} alt="" aria-hidden="true"
            className="absolute z-10 pointer-events-none opacity-70 w-[110px] sm:w-[155px] lg:w-[200px]"
            style={{ top: '-44px', right: '-55px', transform: 'rotate(195deg)' }} />

          {/* Content */}
          <div className="relative z-20 h-full max-w-4xl mx-auto px-6 sm:px-8 flex items-center">
            <div>
              <h1 className="font-extrabold text-[#0B419A] leading-[1.1] flex items-center gap-3"
                style={{ fontFamily: "'Nunito', sans-serif", fontSize: 'clamp(1.6rem, 4vw, 3rem)' }}>
                Checkout
                <img src={pawYellowImg} alt="" aria-hidden="true" className="inline-block object-contain opacity-80"
                  style={{ width: 'clamp(28px, 4vw, 44px)', height: 'clamp(28px, 4vw, 44px)' }} />
              </h1>
              <p className="mt-1 sm:mt-2 text-[11px] sm:text-[13px] font-medium text-gray-600 leading-snug">
                Almost there! Review your details and place your order.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="flex justify-center py-3">
        <StepBreadcrumb />
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-screen-xl px-4 pb-10 sm:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px] lg:items-stretch">

          {/* LEFT ── form sections */}
          <div className="flex flex-col gap-4">

            {/* 1 · Contact Details */}
            <SectionCard number={1} title="Contact Details">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Full Name" required placeholder="Juan Dela Cruz" value={fullName} onChange={setFullName} error={errors.fullName} />
                <Field label="Email Address" required type="email" placeholder="your@email.com" value={email} onChange={setEmail} error={errors.email}
                  icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>} />
                <Field label="Contact Number" required placeholder="09xxxxxxxxx" value={contactNumber} onChange={v => { if (/^\d*$/.test(v) && v.length <= 11) setContactNumber(v) }} type="tel" error={errors.contactNumber} />
              </div>
            </SectionCard>

            {/* 2 · Shipping Details */}
            <SectionCard number={2} title="Shipping Details">
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Address Line 1" required placeholder="12 Pet Residence" value={addressLine1} onChange={setAddressLine1} error={errors.addressLine1} />
                  <Field label="Address Line 2" optional placeholder="123 St., Brgy Woof" value={addressLine2} onChange={setAddressLine2} />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Field label="City/Municipality" required placeholder="Sta Mesa" value={city} onChange={setCity} error={errors.city} />
                  <Field label="Province" required placeholder="Metro Manila" value={province} onChange={setProvince} error={errors.province} />
                  <Field label="Postal Code" required placeholder="1100" value={postalCode} onChange={v => { if (/^\d*$/.test(v) && v.length <= 4) setPostalCode(v) }} error={errors.postalCode} />
                </div>
              </div>
            </SectionCard>

            {/* 3 · Delivery Option */}
            <SectionCard number={3} title="Delivery Option">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DeliveryOption
                  selected={delivery === 'standard'} onSelect={() => setDelivery('standard')}
                  icon={<Truck size={15} />} title="Standard Delivery" description="3-5 Business Days"
                  free={isFreeShipping} price={!isFreeShipping ? '₱ 99.00' : undefined}
                />
                <DeliveryOption
                  selected={delivery === 'express'} onSelect={() => setDelivery('express')}
                  icon={<Zap size={15} />} title="Express Delivery" description="1-2 Business Days"
                  price="₱ 199.00"
                />
              </div>
            </SectionCard>

            {/* 4 · Payment Method */}
            <SectionCard number={4} title="Payment Method" grow>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <PaymentCard selected={payment === 'gcash'} onSelect={() => setPayment('gcash')} label="GCash" sub="Pay easily via Gcash">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/GCash_logo.svg/200px-GCash_logo.svg.png"
                    alt="GCash" className="h-7 object-contain" onError={e => { (e.currentTarget as HTMLImageElement).style.display='none' }} />
                </PaymentCard>
                <PaymentCard selected={payment === 'maya'} onSelect={() => setPayment('maya')} label="Maya" sub="Pay with Maya wallet">
                  <span className="text-base font-black" style={{ color: '#00B865' }}>maya</span>
                </PaymentCard>
                <PaymentCard selected={payment === 'card'} onSelect={() => setPayment('card')} label="Credit / Debit Card" sub="Visa, Mastercard, JCB">
                  <div className="flex items-center gap-1">
                    <div className="h-5 w-7 rounded bg-red-500 flex items-center justify-center">
                      <div className="h-3 w-3 rounded-full bg-yellow-400 -ml-1.5" />
                      <div className="h-3 w-3 rounded-full bg-red-400 -ml-1.5 opacity-70" />
                    </div>
                    <span className="text-[10px] font-bold text-petko-blue">VISA</span>
                  </div>
                </PaymentCard>
                <PaymentCard selected={payment === 'cod'} onSelect={() => setPayment('cod')} label="Cash on Delivery" sub="Pay when you receive">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
                    <span className="text-base">💵</span>
                  </div>
                </PaymentCard>
              </div>
            </SectionCard>

          </div>

          {/* RIGHT ── Order Summary */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm space-y-4">

              {/* header */}
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-petko-blue">Order Summary</h2>
                <Link to="/cart" className="text-xs font-semibold text-petko-blue underline underline-offset-2 hover:opacity-80">
                  Edit Cart
                </Link>
              </div>

              {/* items */}
              <ul className="divide-y divide-gray-100">
                {items.map(item => (
                  <li key={item.product_id} className="flex items-center gap-3 py-3">
                    <div className="relative shrink-0">
                      <div className="h-14 w-14 rounded-xl border border-gray-100 overflow-hidden bg-petko-cream flex items-center justify-center">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <img src={logoImg} alt="PetKo" className="w-3/4 object-contain" />
                        )}
                      </div>
                      <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-petko-blue text-[10px] font-bold text-white">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 line-clamp-1">{item.name}</p>
                      <p className="text-[10px] text-gray-400 line-clamp-1">{item.name}</p>
                    </div>
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
                  {shippingFee === 0
                    ? <span className="font-bold text-green-600">FREE</span>
                    : <span className="font-medium text-gray-800 tabular-nums">₱ {shippingFee.toFixed(2)}</span>
                  }
                </div>
              </div>

              {/* voucher */}
              <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                  <input type="text" value={voucher} onChange={e => setVoucher(e.target.value)}
                    placeholder="Enter voucher code"
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-xs text-gray-700 placeholder-gray-400 outline-none focus:border-petko-blue focus:ring-1 focus:ring-petko-blue/20" />
                </div>
                <button className="shrink-0 rounded-lg bg-petko-blue px-4 py-2 text-xs font-bold text-white hover:bg-petko-blue/90 transition">
                  Apply
                </button>
              </div>

              {/* grand total */}
              <div className="flex items-baseline justify-between border-t border-gray-100 pt-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">Total Amount</p>
                  <p className="text-[10px] text-gray-400">Inclusive of VAT where applicable</p>
                </div>
                <span className="text-xl font-black text-orange-500">
                  ₱ {grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* CTA */}
              <button type="button" onClick={handlePlaceOrder} disabled={items.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-petko-red py-3.5 text-sm font-bold text-white
                  hover:bg-red-700 active:scale-[0.98] transition disabled:cursor-not-allowed disabled:opacity-50">
                Place Order
              </button>

              {/* secure checkout */}
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <ShieldCheck size={14} />
                <div>
                  <p className="text-[11px] font-semibold text-gray-600">Secure Checkout</p>
                  <p className="text-[10px]">Your data is safe with us</p>
                </div>
              </div>
            </div>

            {/* info strip */}
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-1 text-center">
                  <PackageCheck size={18} className="text-petko-blue" />
                  <p className="text-[11px] font-bold text-gray-700">Free Shipping</p>
                  <p className="text-[10px] text-gray-400 leading-tight">₱ 999 minimum spend in Metro Manila</p>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <RotateCcw size={18} className="text-petko-blue" />
                  <p className="text-[11px] font-bold text-gray-700">7-Days Returns</p>
                  <p className="text-[10px] text-gray-400 leading-tight">No hassle returns for eligible items</p>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <Heart size={18} className="text-petko-blue" />
                  <p className="text-[11px] font-bold text-gray-700">We Care</p>
                  <p className="text-[10px] text-gray-400 leading-tight">Quality Products for your pets</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
