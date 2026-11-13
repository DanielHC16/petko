import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Trash2, ArrowLeft, Ticket, Truck, RefreshCcw, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCartStore } from '@/store/cart.store'
import PageBanner from '@/components/layout/PageBanner'
import { useAuthStore } from '@/store/auth.store'
import { saveCheckoutSelection } from '@/lib/checkout-selection'

export default function CartPage() {
  const navigate       = useNavigate()
  const items          = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem     = useCartStore((s) => s.removeItem)

  const isLoading     = useCartStore((s) => s.isLoading)
  const cartError     = useCartStore((s) => s.error)
  const isCheckingOut = useCartStore((s) => s.isCheckingOut)
  const profile       = useAuthStore((s) => s.profile)

  const [isProcessingOrder, setIsProcessingOrder] = useState(false)
  const [selection, setSelectedIds]               = useState<string[] | null>(null)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)

  const selectedIds = useMemo(
    () =>
      items
        .filter((item) => item.stock > 0 && (selection === null || selection.includes(String(item.product_id))))
        .map((item) => String(item.product_id)),
    [items, selection]
  )

  useEffect(() => {
    if (profile?.id) void useCartStore.getState().syncWithRemote(profile.id)
  }, [profile?.id])

  const toggleSelectItem = (productId: string) => {
    setSelectedIds(
      selectedIds.includes(productId)
        ? selectedIds.filter((id) => id !== productId)
        : [...selectedIds, productId]
    )
  }

  const inStockItems = useMemo(() => items.filter((i) => i.stock > 0), [items])
  const allSelected =
    inStockItems.length > 0 && inStockItems.every((item) => selectedIds.includes(String(item.product_id)))

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(inStockItems.map((i) => String(i.product_id)))
    }
  }

  const handleRemoveSelectedClick = () => {
    if (selectedIds.length === 0) return
    setIsConfirmModalOpen(true)
  }

  const confirmRemoveSelected = () => {
    selectedIds.forEach((id) => removeItem(id))
    setSelectedIds([])
    setIsConfirmModalOpen(false)
    toast.success('Selected items removed from cart')
  }

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(String(item.product_id)) && item.stock > 0),
    [items, selectedIds]
  )

  const selectedTotalItems = useMemo(
    () => selectedItems.reduce((acc, item) => acc + item.quantity, 0),
    [selectedItems]
  )

  const selectedSubtotal = useMemo(
    () => selectedItems.reduce((acc, item) => acc + Number(item.price) * item.quantity, 0),
    [selectedItems]
  )

  const isFreeShipping   = selectedSubtotal >= 999
  const shippingEstimate = selectedItems.length === 0 ? 0 : isFreeShipping ? 0 : 99

  const handleProceedToCheckout = () => {
    if (cartError || isLoading || isCheckingOut) return
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to proceed to checkout.')
      return
    }
    if (!profile) {
      toast.error('Please log in to proceed to checkout.')
      return
    }

    setIsProcessingOrder(true)
    saveCheckoutSelection(
      profile.id,
      selectedItems.map((item) => String(item.product_id))
    )

    setTimeout(() => {
      navigate('/checkout', {
        state: {
          selectedItems,
          selectedIds,
          subtotal: selectedSubtotal,
          shippingEstimate,
          total: selectedSubtotal + shippingEstimate,
        },
      })
    }, 600)
  }

  return (
    <div
      className="min-h-screen w-full bg-petko-cream p-6 font-sans lg:p-10"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      {/* Shared checkout-style banner */}
      <PageBanner
        title={
          <>
            Your Cart{' '}
          </>
        }
        subtitle="Review your items and adjust quantities, proceed to checkout"
      />

      {/* ── Main Body Container ───────────────────────────────────────────── */}
      <div className="mx-auto mt-6 sm:mt-8 max-w-6xl px-4 sm:px-6 lg:px-8">
        {isCheckingOut && (
          <p role="status" className="mb-4 rounded-xl bg-blue-50 p-4 text-sm text-petko-blue">
            Your order is being confirmed. Cart changes will be available shortly.
          </p>
        )}
        <fieldset disabled={isCheckingOut} className="min-w-0">
          {cartError && (
            <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {cartError}
              <button
                type="button"
                className="ml-3 font-bold underline"
                onClick={() => {
                  if (profile) void useCartStore.getState().syncWithRemote(profile.id)
                }}
              >
                Try again
              </button>
            </div>
          )}

          {isLoading || isProcessingOrder ? (
            /* ── Skeleton Loading Screen (Initial Load & Proceeding to Checkout) ── */
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start animate-pulse">
              {/* Left Skeleton Column */}
              <div className="flex-1 min-w-0 space-y-4">
                <div className="h-12 w-full rounded-xl bg-[#e6d3b3]" />
                <div className="rounded-2xl border border-[#e1cba5] bg-[#fefaf2] p-6 space-y-6">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-4 border-b border-gray-200/40 pb-6 last:border-0 last:pb-0">
                      <div className="h-5 w-5 rounded bg-[#e6d3b3]" />
                      <div className="h-16 w-16 rounded-lg bg-[#e6d3b3]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-[#e6d3b3]" />
                        <div className="h-3 w-1/2 rounded bg-[#e6d3b3]" />
                      </div>
                      <div className="h-6 w-16 rounded bg-[#e6d3b3]" />
                      <div className="h-7 w-20 rounded bg-[#e6d3b3]" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Skeleton Column */}
              <div className="w-full shrink-0 space-y-4 lg:w-[360px] xl:w-[380px]">
                <div className="rounded-2xl border border-[#e1cba5] bg-[#fefaf2] p-6 space-y-4">
                  <div className="h-6 w-1/2 rounded bg-[#e6d3b3]" />
                  <div className="space-y-3 pt-2">
                    <div className="h-4 w-full rounded bg-[#e6d3b3]" />
                    <div className="h-4 w-full rounded bg-[#e6d3b3]" />
                  </div>
                  <div className="h-10 w-full rounded-lg bg-[#e6d3b3] mt-4" />
                  <div className="h-12 w-full rounded-lg bg-[#e6d3b3] mt-4" />
                </div>
                <div className="rounded-2xl border border-[#e1cba5] bg-[#fefaf2] p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-[#e6d3b3]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-1/2 rounded bg-[#e6d3b3]" />
                      <div className="h-3 w-3/4 rounded bg-[#e6d3b3]" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-[#e6d3b3]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-1/2 rounded bg-[#e6d3b3]" />
                      <div className="h-3 w-3/4 rounded bg-[#e6d3b3]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-[#e1cba5] bg-[#fefaf2] px-4 py-16 text-center shadow-sm">
              <ShoppingBag className="mx-auto text-gray-400" size={54} />
              <h2 className="mt-4 text-base sm:text-lg font-extrabold text-[#0B419A]">
                Your cart is currently empty
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
                Browse our catalog of pet essentials and add items to your cart.
              </p>
              <Link
                to="/"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#E53935] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700 transition"
              >
                <ArrowLeft size={16} />
                Explore Storefront
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              {/* ── Left Column: Cart Items ─────────────────────────────────── */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* ── Back to Products / Storefront Button Bar ──────────────── */}
                <div className="justify-self-start">
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

                {/* Top Action Bar (Mobile + Desktop Select All) */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[#e1cba5] bg-[#fefaf2] px-4 sm:px-6 py-3.5 text-sm font-bold text-[#0B419A] shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      aria-label="Select all items"
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                        allSelected
                          ? 'border-[#0B419A] bg-[#0B419A] text-white'
                          : 'border-gray-400 bg-white hover:border-[#0B419A]'
                      }`}
                    >
                      {allSelected && <Check size={14} strokeWidth={3} />}
                    </button>
                    <span className="truncate text-xs sm:text-sm font-extrabold text-[#0B419A]">
                      Select All ({selectedIds.length}/{inStockItems.length} selected)
                    </span>
                  </div>

                  {/* Desktop Column Headers */}
                  <div className="hidden md:grid md:grid-cols-[100px_110px_100px_32px] md:items-center md:gap-4 text-xs lg:text-sm font-extrabold text-[#0B419A]">
                    <div className="text-center">Price</div>
                    <div className="text-center">Quantity</div>
                    <div className="text-center">Total</div>
                    <div className="w-8"></div>
                  </div>
                </div>

                {/* Items List Card */}
                <div className="relative rounded-2xl border border-[#e1cba5] bg-[#fefaf2] p-4 sm:p-6 shadow-sm">
                  {/* Top-Right "Remove Checked" Action Header */}
                  {selectedIds.length > 0 && (
                    <div className="mb-3 flex justify-end border-b border-gray-200/60 pb-2.5">
                      <button
                        type="button"
                        onClick={handleRemoveSelectedClick}
                        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0B419A] underline transition hover:text-red-600 shrink-0"
                      >
                        <Trash2 size={14} />
                        Remove Checked ({selectedIds.length})
                      </button>
                    </div>
                  )}

                  <div className="divide-y divide-gray-200/70">
                    {items.map((item) => {
                      const isChecked  = selectedIds.includes(String(item.product_id))
                      const outOfStock = item.stock <= 0
                      const itemTotal  = Number(item.price) * item.quantity

                      return (
                        <div
                          key={item.product_id}
                          className={`py-4 first:pt-0 last:pb-0 transition ${
                            !isChecked ? 'opacity-75' : ''
                          }`}
                        >
                          {/* Responsive Row Layout: Stacks cleanly on mobile, aligns with grid on md+ */}
                          <div className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_100px_110px_100px_32px] md:items-center md:gap-4">
                            
                            {/* Product Details + Checkbox */}
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                              <button
                                type="button"
                                disabled={outOfStock}
                                onClick={() => toggleSelectItem(String(item.product_id))}
                                aria-label={`Select ${item.name}`}
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                                  outOfStock
                                    ? 'cursor-not-allowed border-gray-300 bg-gray-100'
                                    : isChecked
                                    ? 'border-[#0B419A] bg-[#0B419A] text-white'
                                    : 'border-gray-400 bg-white hover:border-[#0B419A]'
                                }`}
                              >
                                {isChecked && !outOfStock && <Check size={14} strokeWidth={3} />}
                              </button>

                              <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-lg border border-[#e1cba5] bg-white p-1">
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="max-h-full max-w-full object-contain"
                                />
                              </div>

                              <div className="flex flex-col min-w-0 flex-1">
                                <h3
                                  className="truncate text-sm sm:text-base font-extrabold text-[#0B419A]"
                                  title={item.name}
                                >
                                  {item.name}
                                </h3>
                                <p className="truncate text-xs text-gray-500">
                                  Pet Supply Essential
                                </p>
                                <div className="mt-1 flex items-center gap-2">
                                  {item.stock > 0 ? (
                                    <span className="text-[11px] sm:text-xs font-bold text-green-600">
                                      In Stock ({item.stock})
                                    </span>
                                  ) : (
                                    <span className="text-[11px] sm:text-xs font-bold text-red-500">
                                      Out of Stock
                                    </span>
                                  )}
                                  {/* Mobile-only Unit Price */}
                                  <span className="md:hidden text-xs font-bold text-gray-600">
                                    • ₱{Number(item.price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>

                              {/* Mobile Remove Button */}
                              <button
                                type="button"
                                onClick={() => removeItem(String(item.product_id))}
                                className="md:hidden text-gray-400 hover:text-red-500 p-1 shrink-0"
                                title="Remove Item"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>

                            {/* Desktop Unit Price */}
                            <div className="hidden md:block text-center text-sm font-bold text-gray-700 truncate">
                              ₱{Number(item.price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>

                            {/* Mobile Bottom Bar / Desktop Quantity & Total */}
                            <div className="flex items-center justify-between pl-8 md:pl-0 md:contents">
                              {/* Quantity Selector */}
                              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.product_id, Math.max(1, item.quantity - 1))}
                                  className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded bg-[#0B419A] text-white font-bold hover:bg-blue-900 transition"
                                >
                                  -
                                </button>
                                <span className="flex h-7 w-9 sm:w-10 items-center justify-center rounded border-2 border-[#0B419A] bg-white text-xs sm:text-sm font-extrabold text-[#0B419A]">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                  disabled={item.quantity >= item.stock}
                                  className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded text-white font-bold transition ${
                                    item.quantity >= item.stock
                                      ? 'cursor-not-allowed bg-gray-400'
                                      : 'bg-[#0B419A] hover:bg-blue-900'
                                  }`}
                                >
                                  +
                                </button>
                              </div>

                              {/* Item Total */}
                              <div className="text-right md:text-center text-sm font-extrabold text-[#E53935] truncate">
                                ₱{itemTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>

                            {/* Desktop Remove Action */}
                            <div className="hidden md:flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeItem(String(item.product_id))}
                                className="text-gray-400 transition-colors hover:text-red-500"
                                title="Remove Item"
                              >
                                <Trash2 size={19} />
                              </button>
                            </div>

                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* ── Confirmation Modal Dialog ───────────────────────────────────── */}
                {isConfirmModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-sm rounded-2xl border border-[#e1cba5] bg-[#fefaf2] p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center gap-3 text-[#E53935]">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                          <Trash2 size={20} />
                        </div>
                        <h3 className="text-base sm:text-lg font-extrabold text-[#0B419A]">
                          Remove Checked Items?
                        </h3>
                      </div>
                      <p className="mt-3 text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Are you sure you want to remove the{' '}
                        <span className="font-extrabold text-[#0B419A]">
                          {selectedIds.length} selected {selectedIds.length === 1 ? 'item' : 'items'}
                        </span>{' '}
                        from your cart?
                      </p>
                      <div className="mt-6 flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setIsConfirmModalOpen(false)}
                          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={confirmRemoveSelected}
                          className="rounded-lg bg-[#E53935] px-4 py-2 text-xs sm:text-sm font-extrabold text-white shadow-sm hover:bg-red-700 transition"
                        >
                          Yes, Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Right Column: Order Summary ─────────────────────────────── */}
              <div className="w-full shrink-0 space-y-4 lg:w-[360px] xl:w-[380px]">
                <div className="rounded-2xl border border-[#e1cba5] bg-[#fefaf2] p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-200/60 pb-4">
                    <h2 className="text-base sm:text-lg font-extrabold text-[#0B419A] truncate">
                      Order Summary
                    </h2>
                  </div>

                  <div className="space-y-4 py-4 text-sm">
                    <div className="flex justify-between gap-2 text-gray-600">
                      <span className="truncate">Subtotal ({selectedTotalItems} items)</span>
                      <span className="font-extrabold text-gray-800 shrink-0">
                        ₱{selectedSubtotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2 text-gray-600">
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">Shipping Estimate</span>
                        <span className="text-xs text-gray-400 truncate">Standard Delivery (3-5 days)</span>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className={`font-extrabold ${isFreeShipping && selectedItems.length > 0 ? 'text-green-600' : 'text-gray-800'}`}>
                          {selectedItems.length === 0
                            ? '₱0.00'
                            : isFreeShipping
                            ? 'FREE'
                            : `₱${shippingEstimate.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Promo Code */}
                  <div className="border-t border-gray-200/60 py-4">
                    <h3 className="mb-2 text-sm font-bold text-gray-700">Promo Code</h3>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        toast('Online vouchers and promo codes are not available yet.', { icon: '🎟️' })
                      }}
                      className="flex gap-2"
                    >
                      <div className="relative flex-1 min-w-0">
                        <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="text"
                          placeholder="Enter voucher code"
                          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-xs sm:text-sm focus:border-[#0B419A] focus:outline-none focus:ring-1 focus:ring-[#0B419A] truncate"
                        />
                      </div>
                      <button
                        type="submit"
                        className="shrink-0 rounded-lg bg-[#0B419A] px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-blue-900 transition"
                      >
                        Apply
                      </button>
                    </form>
                  </div>

                  {/* Total & Checkout */}
                  <div className="border-t border-gray-200/60 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col min-w-0">
                        <span className="text-base font-extrabold text-[#0B419A] truncate">
                          Estimated Total
                        </span>
                        <span className="text-[11px] text-gray-500 truncate">
                          Inclusive of VAT where applicable
                        </span>
                      </div>
                      <span className="text-lg sm:text-xl font-extrabold text-[#E53935] shrink-0">
                        ₱{(selectedSubtotal + shippingEstimate).toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleProceedToCheckout}
                      disabled={selectedItems.length === 0}
                      className={`mt-6 flex w-full items-center justify-center rounded-lg py-3.5 text-sm font-extrabold text-white shadow-md transition ${
                        selectedItems.length === 0
                          ? 'cursor-not-allowed bg-gray-400'
                          : 'bg-[#E53935] hover:bg-red-700'
                      }`}
                    >
                      Proceed to Checkout ({selectedTotalItems})
                    </button>
                  </div>
                </div>

                {/* Badges */}
                <div className="space-y-4 rounded-2xl border border-[#e1cba5] bg-[#fefaf2] p-5 shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#0B419A]">
                      <Truck size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold text-gray-800 truncate">Free Shipping</h4>
                      <p className="text-xs text-gray-500 truncate">₱ 999 minimum spend in Metro Manila</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#0B419A]">
                      <RefreshCcw size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold text-gray-800 truncate">7-Days Returns</h4>
                      <p className="text-xs text-gray-500 truncate">No hassle returns for eligible items</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </fieldset>
      </div>
    </div>
  )
}