import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, ShoppingBag, Plus, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchProducts, type Product } from './products-api'
import { useCartStore } from '@/store/cart.store'
import { getApiErrorMessage } from '@/lib/api-error'

const CATEGORIES = [
  { id: 'all', label: 'All Items' },
  { id: 'food', label: 'Pet Food' },
  { id: 'treats', label: 'Treats' },
  { id: 'toys', label: 'Toys' },
  { id: 'grooming', label: 'Grooming' },
  { id: 'wellness', label: 'Health & Wellness' },
  { id: 'litter', label: 'Litter & Toilet' },
  { id: 'bedding', label: 'Beds & Furniture' },
  { id: 'apparel', label: 'Clothing' },
  { id: 'cleaning', label: 'Training & Cleaning' },
  { id: 'travel', label: 'Travel & Outdoor' },
  { id: 'accessories', label: 'Collars & Leashes' },
]

const SORT_OPTIONS = ['newest', 'price_asc', 'price_desc', 'name'] as const
type SortOption = (typeof SORT_OPTIONS)[number]

function isSortOption(value: string): value is SortOption {
  return (SORT_OPTIONS as readonly string[]).includes(value)
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedPetType, setSelectedPetType] = useState<'all' | 'dog' | 'cat'>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  // Loading is derived: the filters that produced the current results vs the current filters.
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  const addItem = useCartStore((s) => s.addItem)

  const requestKey = JSON.stringify({ selectedCategory, selectedPetType, search, sortBy })
  const isLoading = loadedKey !== requestKey

  useEffect(() => {
    let isMounted = true
    const key = JSON.stringify({ selectedCategory, selectedPetType, search, sortBy })

    async function load(): Promise<void> {
      try {
        const data = await fetchProducts({
          category: selectedCategory,
          pet_type: selectedPetType,
          search,
          sortBy,
        })
        if (isMounted) setProducts(data)
      } catch (err: unknown) {
        if (isMounted) {
          toast.error(getApiErrorMessage(err, 'Failed to load products'))
        }
      } finally {
        if (isMounted) setLoadedKey(key)
      }
    }
    load()

    return () => {
      isMounted = false
    }
  }, [selectedCategory, selectedPetType, search, sortBy])

  const totalCount = useMemo(() => products.length, [products])

  function handleAddToCart(product: Product) {
    addItem({
      product_id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      image_url: product.image_url,
    })

    setAddedIds((prev) => new Set(prev).add(product.id))
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev)
        next.delete(product.id)
        return next
      })
    }, 1200)

    toast.success(`Added ${product.name} to cart!`, {
      icon: '🐾',
      duration: 2000,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white shadow-sm sm:p-8">
        <div className="max-w-2xl">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            Filipino Pet Store Essentials
          </span>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">
            Welcome to Petko Storefront
          </h1>
          <p className="mt-1 text-sm text-orange-100 sm:text-base">
            High quality cat &amp; dog supplies, premium kibble, dental treats, and hygiene essentials.
          </p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dog food, cat treats, shampoo, toys..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-800 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        {/* Pet Type Filter */}
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 text-xs font-medium text-gray-600">
          <button
            onClick={() => setSelectedPetType('all')}
            className={`rounded-md px-3 py-1.5 transition ${
              selectedPetType === 'all'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'hover:text-gray-900'
            }`}
          >
            All Pets
          </button>
          <button
            onClick={() => setSelectedPetType('dog')}
            className={`rounded-md px-3 py-1.5 transition ${
              selectedPetType === 'dog'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'hover:text-gray-900'
            }`}
          >
            🐶 Dogs
          </button>
          <button
            onClick={() => setSelectedPetType('cat')}
            className={`rounded-md px-3 py-1.5 transition ${
              selectedPetType === 'cat'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'hover:text-gray-900'
            }`}
          >
            🐱 Cats
          </button>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-xs text-gray-500">
            Sort:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => {
              if (isSortOption(e.target.value)) setSortBy(e.target.value)
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-orange-500 focus:outline-none"
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              selectedCategory === cat.id
                ? 'bg-orange-500 text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:text-gray-900'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results stats */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Showing {totalCount} {totalCount === 1 ? 'product' : 'products'}</span>
        {search && <span>Filtered by &quot;{search}&quot;</span>}
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="aspect-square w-full rounded-lg bg-gray-200" />
              <div className="mt-3 h-4 w-3/4 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-1/2 rounded bg-gray-200" />
              <div className="mt-4 flex items-center justify-between">
                <div className="h-5 w-1/3 rounded bg-gray-200" />
                <div className="h-8 w-8 rounded-full bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <ShoppingBag className="mx-auto text-gray-300" size={48} />
          <h2 className="mt-4 text-base font-semibold text-gray-800">No products found</h2>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search keywords or category filters.
          </p>
          <button
            onClick={() => {
              setSearch('')
              setSelectedCategory('all')
              setSelectedPetType('all')
            }}
            className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
          {products.map((product) => {
            const isAdded = addedIds.has(product.id)
            return (
              <div
                key={product.id}
                className="group flex flex-col justify-between overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:border-orange-300 hover:shadow-md"
              >
                <Link
                  to={`/products/${product.id}`}
                  className="relative aspect-square w-full overflow-hidden bg-gray-50 p-4"
                >
                  <img
                    src={product.image_url}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-contain object-center transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1">
                    <span className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-700 shadow-sm backdrop-blur-sm">
                      {product.pet_type === 'dog'
                        ? '🐶 Dog'
                        : product.pet_type === 'cat'
                          ? '🐱 Cat'
                          : '🐾 All'}
                    </span>
                  </div>
                </Link>

                <div className="flex flex-1 flex-col justify-between p-3.5">
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-orange-600">
                      {product.category}
                    </span>
                    <Link
                      to={`/products/${product.id}`}
                      className="mt-1 line-clamp-2 block text-xs font-semibold text-gray-800 hover:text-orange-600 sm:text-sm"
                      title={product.name}
                    >
                      {product.name}
                    </Link>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5">
                    <div>
                      <span className="text-sm font-extrabold text-gray-900 sm:text-base">
                        ₱{Number(product.price).toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <p className="text-[10px] text-gray-400">
                        {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock <= 0}
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                        isAdded
                          ? 'bg-green-500 text-white'
                          : 'bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400'
                      }`}
                      aria-label={`Add ${product.name} to cart`}
                      title="Add to cart"
                    >
                      {isAdded ? <Check size={16} /> : <Plus size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
