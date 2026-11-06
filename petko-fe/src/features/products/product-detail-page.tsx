import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  ChevronRight, 
  ShoppingCart, 
  Check, 
  ShieldCheck, 
  Truck, 
  RefreshCw, 
  Heart, 
  Minus, 
  Plus 
} from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchProductById, type Product } from './products-api'
import { useCartStore } from '@/store/cart.store'
import { getApiErrorMessage } from '@/lib/api-error'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  
  // Cart & Quantity States
  const [quantity, setQuantity] = useState(1)
  const [isAdded, setIsAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)

  // Placeholder States
  const [selectedSize, setSelectedSize] = useState('1Kg')
  const [activeTab, setActiveTab] = useState('Description')

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
      stock: product.stock,
    })

    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 1500)

    toast.success(`Added ${quantity} item(s) to your cart!`, {
      icon: '🐾',
    })
    
    setQuantity(1)
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
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center max-w-lg mx-auto mt-12">
        <h2 className="text-xl font-bold text-[#0B3B8C]">Product not found</h2>
        <p className="mt-2 text-sm text-gray-500">The product you are looking for does not exist or has been removed.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0B3B8C] px-6 py-3 text-sm font-bold text-white hover:bg-blue-800 transition"
        >
          Back to Store
        </Link>
      </div>
    )
  }

  const itemInCart = cartItems.find((i) => i.product_id === product.id)
  const currentCartQty = itemInCart ? itemInCart.quantity : 0
  const remainingStock = product.stock - currentCartQty

  return (
    <div className="min-h-screen bg-[#FFFBEB] p-4 md:p-8 font-sans">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 font-medium">
          <Link to="/" className="hover:text-[#0B3B8C] transition">Home</Link>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="capitalize">{product.pet_type === 'cat' ? 'Cats' : product.pet_type === 'dog' ? 'Dogs' : 'Pets'}</span>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="capitalize">{product.category}</span>
          <ChevronRight size={14} className="text-gray-400" />
          <span className="font-bold text-gray-900">{product.name}</span>
        </nav>

        {/* Top Section: Images & Primary Details */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr]">
          
          {/* Left Column: Image Gallery */}
          <div className="flex gap-4">
            {/* Thumbnails (Placeholder) */}
            <div className="flex w-20 flex-col gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div 
                  key={i} 
                  className={`aspect-square cursor-pointer overflow-hidden rounded-xl border-2 bg-white p-1 transition ${
                    i === 1 ? 'border-[#0B3B8C]' : 'border-transparent hover:border-gray-300'
                  }`}
                  title="Thumbnail Placeholder"
                >
                  <img src={product.image_url} alt="thumbnail" className="h-full w-full object-contain" />
                </div>
              ))}
            </div>

            {/* Main Image */}
            <div className="relative flex flex-1 items-center justify-center rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
              <button 
                className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-400 shadow-md transition hover:text-red-500"
                title="Wishlist (Placeholder)"
              >
                <Heart size={20} />
              </button>
              <img
                src={product.image_url}
                alt={product.name}
                className="max-h-[450px] w-auto object-contain drop-shadow-xl"
              />
            </div>
          </div>

          {/* Right Column: Product Details */}
          <div className="flex flex-col space-y-5 py-2">
            <div>
              <h1 className="text-3xl font-extrabold text-[#0B3B8C] sm:text-4xl">
                {product.name}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {product.description}
              </p>
            </div>

            <div className="text-3xl font-extrabold text-[#D32F2F]">
              ₱ {Number(product.price).toLocaleString('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>

            {/* Size Variants (Placeholder) */}
            <div className="space-y-2 pt-2">
              <span className="text-sm font-semibold text-gray-800">
                Size <span className="font-normal text-gray-400">(Placeholder)</span>
              </span>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: '500g', price: '₱ 199.00' },
                  { label: '1Kg', price: '₱ 349.00' },
                  { label: '2.5Kg', price: '₱ 799.00' },
                  { label: '5Kg', price: '₱ 1,499.00' },
                ].map((size) => (
                  <button
                    key={size.label}
                    onClick={() => setSelectedSize(size.label)}
                    className={`flex min-w-[80px] flex-col items-center justify-center rounded-xl border p-2 transition ${
                      selectedSize === size.label
                        ? 'border-[#D32F2F] bg-red-50 text-[#D32F2F]'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <span className="text-sm font-bold">{size.label}</span>
                    <span className="text-[10px] opacity-80">{size.price}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* "For" Target (Placeholder) */}
            <div className="space-y-2 pt-2">
              <span className="text-sm font-semibold text-gray-800">
                For <span className="font-normal text-gray-400">(Placeholder)</span>
              </span>
              <div>
                <button className="flex items-center gap-2 rounded-xl border border-[#D32F2F] bg-white px-5 py-2.5 text-sm font-bold text-[#D32F2F] shadow-sm">
                  {product.pet_type === 'cat' ? '🐱 Cats' : product.pet_type === 'dog' ? '🐶 Dogs' : '🐾 All Pets'}
                </button>
              </div>
            </div>

            {/* Meta Information Grid (Placeholder) */}
            <div className="grid grid-cols-4 divide-x divide-gray-200 border-y border-gray-200 py-4 text-center text-xs">
              <div className="flex flex-col px-2">
                <span className={product.stock > 0 ? 'font-bold text-green-600' : 'font-bold text-red-500'}>
                  {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                </span>
                <span className="text-gray-500">({product.stock} available)</span>
              </div>
              <div className="flex flex-col px-2">
                <span className="font-bold text-gray-800">Net Weight</span>
                <span className="text-gray-500">1 Kg</span>
              </div>
              <div className="flex flex-col px-2">
                <span className="font-bold text-gray-800">Suitable For</span>
                <span className="text-gray-500">All Life Stages</span>
              </div>
              <div className="flex flex-col px-2">
                <span className="font-bold text-gray-800">Made in</span>
                <span className="text-gray-500">Philippines</span>
              </div>
            </div>

            {/* Add to Cart / Quantity Actions */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500">Quantity</span>
              <div className="flex items-stretch gap-3">
                {/* Quantity Selector */}
                <div className="flex items-center rounded-xl border-2 border-[#0B3B8C] bg-white overflow-hidden">
                  <button
                    type="button"
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

                {/* Buy Now Button (Placeholder) */}
                <button
                  disabled={remainingStock <= 0}
                  className="flex flex-1 flex-col items-center justify-center rounded-xl bg-[#D32F2F] px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-[#B71C1C] disabled:bg-gray-300 disabled:text-gray-500"
                >
                  <span>Buy Now</span>
                </button>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-[#FDF3E1] p-4 text-center text-[11px] font-semibold text-gray-700 sm:text-xs">
              <div className="flex flex-col items-center justify-center gap-1 sm:flex-row">
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

        {/* Bottom Section: Tabs & Cross-Sell */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* Tabs Container */}
          <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex gap-8 border-b border-gray-200">
              {['Description', 'Ingredients', 'Feeding Guide'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 text-sm font-bold transition-colors ${
                    activeTab === tab
                      ? 'border-b-2 border-[#0B3B8C] text-[#0B3B8C]'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {tab} {tab !== 'Description' && <span className="font-normal text-[10px] text-gray-400"> (Placeholder)</span>}
                </button>
              ))}
            </div>
            <div className="py-6 text-sm leading-relaxed text-gray-600">
              {activeTab === 'Description' ? (
                <p>{product.description}</p>
              ) : (
                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
                  <p className="text-gray-400 italic">This content section is a placeholder for {activeTab}.</p>
                </div>
              )}
            </div>
          </div>

          {/* Cross-Sell Container (Placeholder) */}
          <div className="rounded-3xl bg-[#FDF3E1] p-6 shadow-sm">
            <h3 className="mb-4 font-extrabold text-[#0B3B8C]">
              You May Also Like <span className="font-normal text-xs text-gray-500">(Placeholder)</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Dummy Cards for mockup */}
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl border border-white bg-white/50 p-3 text-center opacity-75 backdrop-blur-sm">
                  <div className="mb-3 flex aspect-square items-center justify-center rounded-lg bg-gray-100/80">
                     <span className="text-[10px] text-gray-400">Image</span>
                  </div>
                  <div className="mx-auto mb-2 h-3 w-3/4 rounded bg-gray-300/50"></div>
                  <div className="mx-auto h-3 w-1/2 rounded bg-gray-300/50"></div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}