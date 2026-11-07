import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ChevronRight,
  Check,
  ShieldCheck,
  Truck,
  RefreshCw,
  Minus,
  Plus
} from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchProductById, fetchProducts, type Product } from './products-api'
import { useCartStore } from '@/store/cart.store'
import { getApiErrorMessage } from '@/lib/api-error'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [loadedId, setLoadedId] = useState<string | null>(null)

  // Cart & Quantity States
  const [quantity, setQuantity] = useState(1)
  const [isAdded, setIsAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)

  const isLoading = Boolean(id) && loadedId !== id

  useEffect(() => {
    if (!id) return
    let isMounted = true
    const productId = id

    async function load(): Promise<void> {
      try {
        const data = await fetchProductById(productId)
        if (isMounted) {
          setProduct(data)
          setQuantity(1)
          setSuggestions([])
          setLoadedId(productId)
          try {
            const relatedData = await fetchProducts({
              category: data.category,
              pet_type: data.pet_type
            })
            // Filter out the current product and take up to 4 items
            const related = relatedData.filter((p) => p.id !== data.id).slice(0, 4)
            if (isMounted) setSuggestions(related)
          } catch (suggestionErr) {
            console.error('Failed to load suggestions', suggestionErr)
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setProduct(null)
          toast.error(getApiErrorMessage(err, 'Product not found'))
        }
      } finally {
        if (isMounted) setLoadedId(productId)
      }
    }
    load()

    return () => {
      isMounted = false
    }
  }, [id])

  function handleAddToCart() {
    if (!product) return
    const cartQuantity = cartItems.find((item) => item.product_id === product.id)?.quantity ?? 0
    const quantityToAdd = Math.min(quantity, Math.max(0, product.stock - cartQuantity))
    if (quantityToAdd <= 0) return

    addItem({
      product_id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: quantityToAdd,
      image_url: product.image_url,
      stock: product.stock,
    })

    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 1500)

    toast.success(`Added ${quantityToAdd} item(s) to your cart!`, {
      icon: '🐾',
    })

    setQuantity(1)
  }

  function handleBuyNow() {
    if (!product) return

    // Create a temporary direct checkout item
    const directItem = {
      product_id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity,
      image_url: product.image_url,
      stock: product.stock,
    }

    // Save it to session storage so the checkout page can read it immediately
    sessionStorage.setItem('direct_checkout_item', JSON.stringify(directItem))

    // Redirect to checkout with a direct mode parameter
    window.location.href = '/checkout?mode=direct'
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center bg-[#FFF9EA]">
        <div className="text-sm font-medium text-gray-500">Loading product details...</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <h2 className="text-xl font-bold text-[#0B3B8C]">Product not found</h2>
        <p className="mt-2 text-sm text-gray-500">The product you are looking for does not exist or has been removed.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B3B8C] px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
        >
          Back to Store
        </Link>
      </div>
    )
  }

  const itemInCart = cartItems.find((i) => i.product_id === product.id)
  const currentCartQty = itemInCart ? itemInCart.quantity : 0
  const remainingStock = product.stock - currentCartQty
  const CATEGORIES = [
  { id: 'all',         label: 'All Items' },
  { id: 'food',        label: 'Pet Food' },
  { id: 'treats',      label: 'Treats' },
  { id: 'toys',        label: 'Toys' },
  { id: 'grooming',    label: 'Grooming' },
  { id: 'wellness',    label: 'Health & Wellness' },
  { id: 'litter',      label: 'Litter & Toilet' },
  { id: 'bedding',     label: 'Beds & Furniture' },
  { id: 'apparel',     label: 'Clothing' },
  { id: 'cleaning',    label: 'Training & Cleaning' },
  { id: 'travel',      label: 'Travel & Outdoor' },
  { id: 'accessories', label: 'Collars & Leashes' },
]

  return (
<div className="min-h-screen bg-[#fbe8c1] p-4 font-sans md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">

        {/* Breadcrumb Navigation */}
        <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-600">
          <Link to="/" className="transition hover:text-[#0B3B8C]">Home</Link>
          <ChevronRight size={14} className="text-gray-400" />

          <Link
            to={`/?pet=${product.pet_type}`}
            className="transition hover:text-[#0B3B8C]"
          >
            {product.pet_type === 'cat' ? 'Cats' : product.pet_type === 'dog' ? 'Dogs' : 'All Pets'}
          </Link>

          <ChevronRight size={14} className="text-gray-400" />

          <Link
            to={`/?pet=${product.pet_type}&cat=${product.category}`}
            className="transition hover:text-[#0B3B8C]"
          >
            {CATEGORIES.find(c => c.id === product.category)?.label || product.category}
          </Link>

          <ChevronRight size={14} className="text-gray-400" />
          <span className="font-bold text-gray-900">{product.name}</span>
        </nav>

        {/* Top Section: Images & Primary Details */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr]">

          {/* Left Column: Image Gallery */}
          <div className="relative flex items-center justify-center rounded-[2rem] border border-gray-200 bg-white p-8 shadow-md">
            <img
              src={product.image_url}
              alt={product.name}
              className="max-h-[450px] max-w-full w-auto object-contain drop-shadow-xl"
            />
          </div>

          {/* Right Column: Product Details */}
          <div className="flex flex-col space-y-5 py-2">
            <div>
              <h1 className="text-3xl font-extrabold text-[#0B3B8C] sm:text-4xl">
                {product.name}
              </h1>
            </div>

            <div className="text-3xl font-extrabold text-[#D32F2F]">
              ₱ {Number(product.price).toLocaleString('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>

            {/* "For" Target */}
            <div className="space-y-2 pt-2">
              <span className="text-sm font-semibold text-gray-800">
                For
              </span>
              <div>
                <span className="inline-flex items-center gap-2 rounded-xl border border-[#D32F2F] bg-white px-5 py-2.5 text-sm font-bold text-[#D32F2F] shadow-sm">
                  {product.pet_type === 'cat' ? '🐱 Cats' : product.pet_type === 'dog' ? '🐶 Dogs' : '🐾 All Pets'}
                </span>
              </div>
            </div>

              {/* Meta Information Grid */}
              <div className="grid grid-cols-2 divide-x divide-gray-800 py-4 text-center text-xs">
                <div className="flex flex-col px-2">
                  <span className={product.stock > 0 ? 'font-bold text-green-600' : 'font-bold text-red-500'}>
                    {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                  <span className="font-bold text-gray-800">({product.stock} available)</span>
                </div>
                <div className="flex flex-col px-2">
                  <span className="font-bold text-[#0B3B8C]">Made in</span>
                  <span className="font-bold text-gray-800">Philippines</span>
                </div>
              </div>

            {/* Add to Cart / Quantity Actions */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500">Quantity</span>
              <div className="flex items-stretch gap-3">
                {/* Quantity Selector */}
                <div className="flex items-center overflow-hidden rounded-xl border-2 border-[#0B3B8C] bg-white">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="flex items-center justify-center p-3 text-[#0B3B8C] transition hover:bg-blue-50 disabled:opacity-30"
                  >
                    <Minus size={18} strokeWidth={3} />
                  </button>
                  <span className="w-10 text-center font-bold text-[#0B3B8C]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity((q) => Math.min(remainingStock, q + 1))}
                    disabled={quantity >= remainingStock}
                    className="flex items-center justify-center p-3 text-[#0B3B8C] transition hover:bg-blue-50 disabled:opacity-30"
                  >
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={remainingStock <= 0}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-md transition ${
                    isAdded
                      ? 'bg-green-600 text-white'
                      : 'bg-[#0B3B8C] text-white hover:bg-[#082B69] disabled:bg-gray-300 disabled:text-gray-500'
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check size={18} /> Added!
                    </>
                  ) : (
                    'Add to Cart'
                  )}
                </button>

                {/* Buy Now Button */}
                <button
                  onClick={handleBuyNow}
                  disabled={remainingStock <= 0}
                  className="flex flex-1 flex-col items-center justify-center rounded-xl bg-[#D32F2F] px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-[#B71C1C] disabled:bg-gray-300 disabled:text-gray-500"
                >
                  <span>Buy Now</span>
                  <span className="text-[10px] font-normal">Express Checkout</span>
                </button>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-[#fdf2e1] border border-gray-200 shadow-md p-4 text-center text-[11px] font-semibold text-gray-700 sm:text-xs">              <div className="flex flex-col items-center justify-center gap-1 sm:flex-row">
                <ShieldCheck size={18} className="text-gray-500" />
                <span>Secure Checkout</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 sm:flex-row">
                <RefreshCw size={18} className="text-gray-500" />
                <span>7-Days Returns</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 sm:flex-row">
                <Truck size={18} className="text-gray-500" />
                <span>Fast Delivery</span>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Section: Description & Cross-Sell */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* Description Container */}
          <div className="rounded-3xl border border-gray-200 bg-[#fdf2e1] p-8 shadow-md lg:col-span-2">            <h2 className="mb-4 border-b border-gray-200 pb-4 text-lg font-bold text-[#0B3B8C]">
              Description
            </h2>
            <div className="py-2 text-sm leading-relaxed text-gray-600">
              <p>{product.description}</p>
            </div>
          </div>

          {/* Cross-Sell Container (Placeholder) */}
          <div className="rounded-3xl border border-gray-200 bg-[#fdf2e1] p-6 shadow-md">            <h3 className="mb-4 font-extrabold text-[#0B3B8C]">
              You May Also Like
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {suggestions.length > 0 ? (
                suggestions.map((suggestion) => (
                  <Link
                    key={suggestion.id}
                    to={`/products/${suggestion.id}`}
                    className="group flex flex-col justify-between rounded-xl border border-white bg-white p-3 text-center shadow-sm transition hover:shadow-md"
                  >
                    <div className="mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-gray-50 p-2">
                      <img
                        src={suggestion.image_url}
                        alt={suggestion.name}
                        className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div>
                      <h4 className="line-clamp-2 text-xs font-bold text-[#0B3B8C] group-hover:underline">
                        {suggestion.name}
                      </h4>
                      <div className="mt-1 text-sm font-extrabold text-[#D32F2F]">
                        ₱ {Number(suggestion.price).toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-2 py-8 text-center text-xs text-gray-500">
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
