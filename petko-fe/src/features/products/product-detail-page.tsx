import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toastStyle, toastIconTheme } from '@/lib/toast-style'
import {
  ChevronRight,
  Check,
  ShieldCheck,
  Truck,
  RefreshCw,
  Minus,
  Plus,
  Package,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useProductDetail } from './use-product-detail'
import {
  PRODUCT_CATEGORIES,
  PRODUCT_DETAIL_FIELDS,
  VARIANT_FIELDS,
  variantLabel,
} from '@/lib/product-catalog'
import { useCartStore } from '@/store/cart.store'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Custom hook provides synchronous cached sibling selection & family-scoped data
  const { product, variants, suggestions, status, error, retry } = useProductDetail(id)

  // Selection-scoped cart & quantity states
  const [selectedId, setSelectedId] = useState(id)
  const [quantity, setQuantity] = useState(1)
  const [isAdded, setIsAdded] = useState(false)
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Local image cache tracking by URL
  const [loadedImageUrls, setLoadedImageUrls] = useState<Record<string, boolean>>({})
  const [failedImageUrls, setFailedImageUrls] = useState<Record<string, boolean>>({})

  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)

  const clearAddedTimer = useCallback(() => {
    if (addedTimerRef.current !== null) {
      clearTimeout(addedTimerRef.current)
      addedTimerRef.current = null
    }
  }, [])

  // Clear timer when selected route ID changes or component unmounts
  useEffect(() => {
    return () => {
      clearAddedTimer()
    }
  }, [id, clearAddedTimer])

  // Synchronously reset quantity and added state on actual route ID change
  if (id !== selectedId) {
    setSelectedId(id)
    setQuantity(1)
    setIsAdded(false)
  }

  function handleAddToCart(): void {
    if (!product) return
    const cartQuantity = cartItems.find((item) => item.product_id === product.id)?.quantity ?? 0
    const quantityToAdd = Math.min(quantity, Math.max(0, product.stock - cartQuantity))
    if (quantityToAdd <= 0) {
      toast.error('You already have all available stock in your cart.', {
        icon: '⚠️',
        style: toastStyle('error'),
        iconTheme: toastIconTheme('error'),
      })
      return
    }

    addItem({
      product_id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: quantityToAdd,
      image_url: product.image_url,
      stock: product.stock,
    })

    clearAddedTimer()
    setIsAdded(true)
    addedTimerRef.current = setTimeout(() => {
      setIsAdded(false)
      addedTimerRef.current = null
    }, 1500)

    toast.success(`Added ${quantityToAdd} item(s) to your cart!`, {
      icon: '🐾',
      style: toastStyle('success'),
      iconTheme: toastIconTheme('success'),
    })

    setQuantity(1)
  }

  function handleBuyNow(): void {
    if (!product || product.stock <= 0) return

    const buyQty = Math.max(1, Math.min(quantity, product.stock))

    // Create a temporary direct checkout item
    const directItem = {
      product_id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: buyQty,
      image_url: product.image_url,
      stock: product.stock,
    }

    // Save it to session storage so the checkout page can read it immediately
    sessionStorage.setItem('direct_checkout_item', JSON.stringify(directItem))

    // Redirect to checkout with a direct mode parameter
    navigate('/checkout?mode=direct')
  }

  if (status === 'loading') {
    return (
      <div
        className="min-h-screen bg-[#f5eddb] px-4 py-5 sm:px-6 sm:py-8 lg:px-10 lg:py-10"
        style={{ fontFamily: "'Nunito', sans-serif" }}
        role="status"
      >
        <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
          {/* Breadcrumb Skeleton */}
          <div className="relative h-4 w-48 overflow-hidden rounded bg-gray-200/80">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          </div>

          {/* Top Section Skeleton */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-[1fr_1.1fr] lg:gap-8">
            {/* Left Image Square Skeleton */}
            <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-md sm:rounded-[2rem]">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-gray-100/60 to-transparent" />
            </div>

            {/* Right Details Skeleton */}
            <div className="flex flex-col space-y-5 py-2">
              <div className="space-y-2">
                <div className="relative h-8 w-3/4 overflow-hidden rounded-lg bg-gray-200/80">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                </div>
                <div className="relative h-4 w-1/4 overflow-hidden rounded bg-gray-200/80">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                </div>
              </div>
              
              <div className="relative h-8 w-1/3 overflow-hidden rounded-lg bg-gray-200/80">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              </div>
              
              {/* Variation Pills Skeleton */}
              <div className="relative h-20 w-full overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-gray-100/50 to-transparent" />
              </div>

              {/* Target / For Skeleton */}
              <div className="relative h-10 w-28 overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-gray-100/50 to-transparent" />
              </div>

              {/* Meta Grid Skeleton */}
              <div className="relative h-12 w-full overflow-hidden rounded bg-white/50">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              </div>

              {/* Action Buttons Skeleton */}
              <div className="grid grid-cols-2 gap-3 sm:flex">
                <div className="relative col-span-2 h-12 flex-1 overflow-hidden rounded-xl bg-gray-200/80 sm:col-span-1">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                </div>
                <div className="relative h-12 flex-1 overflow-hidden rounded-xl bg-gray-200/80">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section Skeleton */}
          <div className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 lg:grid-cols-3 lg:gap-8">
            <div className="relative h-48 w-full overflow-hidden rounded-3xl border border-gray-200 bg-[#fdf2e1] p-6 shadow-md lg:col-span-2">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
            <div className="relative h-48 w-full overflow-hidden rounded-3xl border border-gray-200 bg-[#fdf2e1] p-6 shadow-md">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error' || !product) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#f5eddb] p-4"
        style={{ fontFamily: "'Nunito', sans-serif" }}
      >
        <div
          className="mx-auto w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-md sm:p-8"
          role="alert"
        >
          <h2 className="text-xl font-extrabold text-[#0B3B8C]">Product not found</h2>
          <p className="mt-2 line-clamp-3 text-sm text-gray-500">
            {error || 'The product you are looking for does not exist or has been removed.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {status === 'error' && (
              <button
                type="button"
                onClick={retry}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B3B8C] px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
              >
                <RefreshCw size={14} />
                Try again
              </button>
            )}
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
            >
              Back to Store
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const currentImageUrl = product.image_url
  const isImageLoaded = Boolean(loadedImageUrls[currentImageUrl])
  const isImageFailed = Boolean(failedImageUrls[currentImageUrl])

  const itemInCart = cartItems.find((i) => i.product_id === product.id)
  const currentCartQty = itemInCart ? itemInCart.quantity : 0
  const remainingStock = product.stock - currentCartQty

  return (
    <div
      className="min-h-screen bg-[#f5eddb] px-4 py-5 sm:px-6 sm:py-8 lg:px-10 lg:py-10"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        {/* Breadcrumb Navigation (Auto-truncating on smaller viewports) */}
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1.5 overflow-hidden text-xs font-semibold text-gray-600 sm:gap-2 sm:text-sm"
        >
          <div className="justify-self-start">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#10298E] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0B3B8C] active:scale-95 sm:px-3"
            >
              <span>
                <span className="hidden sm:inline">Home</span>
              </span>
            </Link>
          </div>
          <ChevronRight size={14} className="shrink-0 text-gray-400" />

          <Link
            to={`/?pet=${product.pet_type}`}
            className="shrink-0 transition hover:text-[#0B3B8C]"
          >
            {product.pet_type === 'cat' ? 'Cats' : product.pet_type === 'dog' ? 'Dogs' : 'All Pets'}
          </Link>

          <ChevronRight size={14} className="shrink-0 text-gray-400" />

          <Link
            to={`/?pet=${product.pet_type}&cat=${product.category}`}
            className="max-w-[110px] shrink-0 truncate transition hover:text-[#0B3B8C] sm:max-w-[200px]"
            title={PRODUCT_CATEGORIES.find((c) => c.id === product.category)?.label || product.category}
          >
            {PRODUCT_CATEGORIES.find((c) => c.id === product.category)?.label || product.category}
          </Link>

          <ChevronRight size={14} className="shrink-0 text-gray-400" />
          <span
            className="min-w-0 flex-1 truncate font-extrabold text-gray-900"
            title={product.name}
          >
            {product.name}
          </span>
        </nav>

        {/* Top Section: Images & Primary Details */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-[1fr_1.1fr] lg:gap-8">
          {/* Left Column: Stable Image Frame (1:1 Square Ratio) */}
          <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-md sm:rounded-[2rem] sm:p-8">
            {isImageFailed ? (
              <div
                className="flex flex-col items-center justify-center gap-2 text-gray-400"
                role="img"
                aria-label={product.name}
              >
                <Package size={48} className="text-gray-300" />
                <p className="text-xs font-medium">Image unavailable</p>
              </div>
            ) : (
              <>
                {!isImageLoaded && (
                  <div className="absolute inset-0 animate-pulse bg-gray-100" aria-hidden="true" />
                )}
                <img
                  src={currentImageUrl}
                  alt={product.name}
                  onLoad={() => setLoadedImageUrls((prev) => ({ ...prev, [currentImageUrl]: true }))}
                  onError={() => setFailedImageUrls((prev) => ({ ...prev, [currentImageUrl]: true }))}
                  className={`max-h-full max-w-full w-auto object-contain drop-shadow-xl transition-opacity duration-150 ${
                    isImageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </>
            )}
          </div>

          {/* Right Column: Product Details */}
          <div className="flex min-w-0 flex-col justify-between space-y-4 py-1 sm:space-y-5">
            <div className="min-w-0">
              <h1
                className="line-clamp-2 break-words text-2xl font-extrabold leading-tight text-[#0B3B8C] sm:text-3xl lg:text-4xl"
                title={product.parent_product_name || product.name}
              >
                {product.parent_product_name || product.name}
              </h1>
              {product.sku && (
                <p className="mt-1.5 truncate text-xs font-medium text-gray-500" title={product.sku}>
                  SKU: {product.sku}
                </p>
              )}
            </div>

            <div className="truncate text-2xl font-extrabold text-[#D32F2F] sm:text-3xl">
              ₱{' '}
              {Number(product.price).toLocaleString('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>

            {product.parent_product_name && (
              <fieldset className="min-w-0 space-y-2.5 rounded-2xl border border-orange-200 bg-white p-3.5 sm:p-4">
                <legend className="px-1 text-xs font-extrabold text-[#0B3B8C] sm:text-sm">
                  Choose a variation
                </legend>
                <div className="flex flex-wrap gap-2">
                  {variants.map((variant) => {
                    const label = variantLabel(variant)
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        title={label}
                        aria-pressed={variant.id === product.id}
                        onClick={() => {
                          if (variant.id !== product.id) {
                            navigate(`/products/${variant.id}`, { replace: true })
                          }
                        }}
                        className={`max-w-[160px] truncate rounded-xl border-2 px-3 py-1.5 text-left text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B3B8C] sm:max-w-[220px] sm:py-2 sm:text-sm ${
                          variant.id === product.id
                            ? 'border-[#0B3B8C] bg-blue-50 font-bold text-[#0B3B8C]'
                            : 'border-gray-200 text-gray-700 hover:border-orange-400'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                <p className="truncate text-[11px] text-gray-500 sm:text-xs">
                  Price, photo, and stock are for the selected variation.
                </p>
              </fieldset>
            )}

            {/* "For" Target */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-bold text-gray-800 sm:text-sm">For</span>
              <div>
                <span className="inline-flex max-w-full items-center gap-2 truncate rounded-xl border border-[#D32F2F] bg-white px-4 py-2 text-xs font-bold text-[#D32F2F] shadow-sm sm:px-5 sm:py-2.5 sm:text-sm">
                  {product.pet_type === 'cat' ? '🐱 Cats' : product.pet_type === 'dog' ? '🐶 Dogs' : '🐾 All Pets'}
                </span>
              </div>
            </div>

            {/* Meta Information Grid */}
            <div className="grid grid-cols-2 divide-x divide-gray-800 py-3 text-center text-xs sm:py-4">
              <div className="flex min-w-0 flex-col px-2">
                <span
                  className={`truncate ${
                    product.stock > 0 ? 'font-bold text-green-600' : 'font-bold text-red-500'
                  }`}
                >
                  {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
                <span className="truncate font-bold text-gray-800">
                  ({product.stock} available)
                </span>
              </div>
              <div className="flex min-w-0 flex-col px-2">
                <span className="font-bold text-[#0B3B8C]">SKU</span>
                <span
                  className="truncate font-bold text-gray-800"
                  title={product.sku || 'Not assigned'}
                >
                  {product.sku || 'Not assigned'}
                </span>
              </div>
            </div>

            {/* Add to Cart / Quantity Actions */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-gray-600">Quantity</span>
              <div className="grid grid-cols-2 items-stretch gap-2.5 sm:flex sm:gap-3">
                {/* Quantity Selector */}
                <div className="col-span-2 flex items-center justify-between overflow-hidden rounded-xl border-2 border-[#0B3B8C] bg-white sm:justify-center">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="flex h-full items-center justify-center px-4 py-2.5 text-[#0B3B8C] transition hover:bg-blue-50 disabled:opacity-30 sm:p-3"
                  >
                    <Minus size={18} strokeWidth={3} />
                  </button>
                  <span className="w-12 text-center text-sm font-extrabold text-[#0B3B8C] sm:w-10">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    disabled={quantity >= product.stock}
                    className="flex h-full items-center justify-center px-4 py-2.5 text-[#0B3B8C] transition hover:bg-blue-50 disabled:opacity-30 sm:p-3"
                  >
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={remainingStock <= 0}
                  className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-xs font-extrabold shadow-md transition sm:text-sm ${
                    isAdded
                      ? 'bg-green-600 text-white'
                      : 'bg-[#0B3B8C] text-white hover:bg-[#082B69] disabled:bg-gray-300 disabled:text-gray-500'
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check size={18} className="shrink-0" />
                      <span className="truncate">Added!</span>
                    </>
                  ) : (
                    <span className="truncate">Add to Cart</span>
                  )}
                </button>

                {/* Buy Now Button */}
                <button
                  onClick={handleBuyNow}
                  disabled={product.stock <= 0}
                  className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl bg-[#D32F2F] px-3 py-2 text-xs font-extrabold text-white shadow-md transition hover:bg-[#B71C1C] disabled:bg-gray-300 disabled:text-gray-500 sm:px-4 sm:text-sm"
                >
                  <span className="w-full truncate text-center">Buy Now</span>
                  <span className="w-full truncate text-center text-[10px] font-normal">
                    Express Checkout
                  </span>
                </button>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-gray-200 bg-[#fefaf2] p-3 text-center text-[11px] font-bold text-gray-700 shadow-md sm:p-4 sm:text-xs">
              <div className="flex min-w-0 flex-col items-center justify-center gap-1 sm:flex-row sm:gap-1.5">
                <ShieldCheck size={16} className="shrink-0 text-[#0B3B8C] sm:h-[18px] sm:w-[18px]" />
                <span className="w-full truncate">Secure Checkout</span>
              </div>
              <div className="flex min-w-0 flex-col items-center justify-center gap-1 sm:flex-row sm:gap-1.5">
                <RefreshCw size={16} className="shrink-0 text-[#0B3B8C] sm:h-[18px] sm:w-[18px]" />
                <span className="w-full truncate">7-Days Returns</span>
              </div>
              <div className="flex min-w-0 flex-col items-center justify-center gap-1 sm:flex-row sm:gap-1.5">
                <Truck size={16} className="shrink-0 text-[#0B3B8C] sm:h-[18px] sm:w-[18px]" />
                <span className="w-full truncate">Fast Delivery</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Description & Cross-Sell */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 lg:grid-cols-3 lg:gap-8">
          {/* Description Container */}
          <div className="min-w-0 rounded-3xl border border-gray-200 bg-[#fefaf2] p-5 shadow-md sm:p-8 lg:col-span-2">
            <h2 className="mb-4 border-b border-gray-200 pb-3 text-base font-extrabold text-[#0B3B8C] sm:pb-4 sm:text-lg">
              Description
            </h2>
            <div className="space-y-4 py-1 text-sm leading-relaxed text-gray-700">
              <p className="break-words">{product.description}</p>
              {VARIANT_FIELDS.some(({ key }) => product.variant_attributes?.[key]) && (
                <dl className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-white p-4 sm:grid-cols-2">
                  {VARIANT_FIELDS.map(({ key, label }) =>
                    product.variant_attributes?.[key] ? (
                      <div key={key} className="min-w-0">
                        <dt className="truncate text-xs font-extrabold text-[#0B3B8C]">{label}</dt>
                        <dd
                          className="truncate text-sm font-medium text-gray-800"
                          title={String(product.variant_attributes[key])}
                        >
                          {product.variant_attributes[key]}
                        </dd>
                      </div>
                    ) : null,
                  )}
                </dl>
              )}
              {PRODUCT_DETAIL_FIELDS.map(({ key, label }) =>
                product[key] ? (
                  <section key={key} className="mt-4 border-t border-gray-200 pt-4">
                    <h3 className="mb-1.5 font-extrabold text-[#0B3B8C]">{label}</h3>
                    <p className="whitespace-pre-line break-words text-sm">{product[key]}</p>
                  </section>
                ) : null,
              )}
            </div>
          </div>

          {/* Cross-Sell Container */}
          <div className="min-w-0 rounded-3xl border border-gray-200 bg-[#fefaf2] p-5 shadow-md sm:p-6">
            <h3 className="mb-4 text-base font-extrabold text-[#0B3B8C] sm:text-lg">
              You May Also Like
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 lg:gap-4">
              {suggestions.length > 0 ? (
                suggestions.map((suggestion) => (
                  <Link
                    key={suggestion.product.id}
                    to={`/products/${suggestion.product.id}`}
                    title={suggestion.name}
                    className="group flex min-w-0 flex-col justify-between rounded-xl border border-white bg-white p-2.5 text-center shadow-sm transition hover:shadow-md sm:p-3"
                  >
                    <div className="mb-2.5 flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-gray-50 p-2">
                      <img
                        src={suggestion.product.image_url}
                        alt={suggestion.name}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="line-clamp-2 min-h-[2rem] break-words text-xs font-bold leading-4 text-[#0B3B8C] group-hover:underline">
                        {suggestion.name}
                      </h4>
                      <div className="mt-1.5 truncate text-xs font-extrabold text-[#D32F2F] sm:text-sm">
                        {suggestion.minPrice !== suggestion.maxPrice && 'From '}₱{' '}
                        {Number(suggestion.minPrice).toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-full py-8 text-center text-xs font-medium text-gray-500">
                  No related products available.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}