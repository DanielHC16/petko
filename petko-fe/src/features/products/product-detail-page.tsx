import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Check, ShieldCheck, Truck, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchProductById, type Product } from './products-api'
import { useCartStore } from '@/store/cart.store'
import { getApiErrorMessage } from '@/lib/api-error'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  // Loading is derived: the id whose fetch has settled vs the current route id.
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isAdded, setIsAdded] = useState(false)

  const addItem = useCartStore((s) => s.addItem)

  const isLoading = Boolean(id) && loadedId !== id

  useEffect(() => {
    if (!id) return
    let isMounted = true
    const productId = id

    async function load(): Promise<void> {
      try {
        const data = await fetchProductById(productId)
        if (isMounted) setProduct(data)
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

    addItem({
      product_id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity,
      image_url: product.image_url,
    })

    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 1500)

    toast.success(`Added ${quantity} item(s) to your cart!`, {
      icon: '🐾',
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-gray-500">Loading product details...</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-gray-800">Product not found</h2>
        <p className="mt-1 text-sm text-gray-500">The product you are looking for does not exist or has been removed.</p>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          <ArrowLeft size={16} />
          Back to Store
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-orange-600"
      >
        <ArrowLeft size={16} />
        Back to Products
      </Link>

      <div className="grid grid-cols-1 gap-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-2 lg:p-8">
        {/* Product Image */}
        <div className="flex aspect-square items-center justify-center rounded-xl bg-gray-50 p-6">
          <img
            src={product.image_url}
            alt={product.name}
            className="max-h-full max-w-full object-contain"
          />
        </div>

        {/* Product Info */}
        <div className="flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase text-orange-600">
                {product.category}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {product.pet_type === 'dog'
                  ? '🐶 For Dogs'
                  : product.pet_type === 'cat'
                    ? '🐱 For Cats'
                    : '🐾 For All Pets'}
              </span>
            </div>

            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900">
                ₱{Number(product.price).toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-xs text-gray-500">VAT inclusive</span>
            </div>

            <p className="text-sm leading-relaxed text-gray-600">
              {product.description}
            </p>

            <div className="border-t border-b border-gray-100 py-3 text-xs text-gray-600">
              <span className="font-medium text-gray-900">Availability: </span>
              {product.stock > 0 ? (
                <span className="font-semibold text-green-600">
                  In Stock ({product.stock} units available)
                </span>
              ) : (
                <span className="font-semibold text-red-500">Out of Stock</span>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium text-gray-700">Quantity:</span>
              <div className="flex items-center rounded-lg border border-gray-300 bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="px-3 py-1 text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                >
                  -
                </button>
                <span className="w-10 text-center text-sm font-semibold text-gray-800">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock}
                  className="px-3 py-1 text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to Cart button */}
            <button
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold shadow-sm transition ${
                isAdded
                  ? 'bg-green-600 text-white'
                  : 'bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400'
              }`}
            >
              {isAdded ? (
                <>
                  <Check size={18} />
                  Added to Cart!
                </>
              ) : (
                <>
                  <ShoppingCart size={18} />
                  Add to Cart
                </>
              )}
            </button>
          </div>

          {/* Value Props */}
          <div className="mt-8 grid grid-cols-3 gap-2 border-t border-gray-100 pt-6 text-center text-xs text-gray-500">
            <div className="flex flex-col items-center gap-1">
              <Truck size={18} className="text-orange-500" />
              <span>Fast Metro Manila Shipping</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck size={18} className="text-orange-500" />
              <span>100% Authentic Products</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <RefreshCw size={18} className="text-orange-500" />
              <span>Easy Returns &amp; Exchange</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
