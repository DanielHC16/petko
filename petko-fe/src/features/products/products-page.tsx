import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, ShoppingBag, ShoppingCart, RotateCcw, Menu, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchProducts, type Product } from './products-api'
import { PRODUCT_CATEGORIES, groupProductFamilies } from '@/lib/product-catalog'
import { useCartStore } from '@/store/cart.store'
import { getApiErrorMessage } from '@/lib/api-error'
import dogcatImg    from '@/assets/proheader.png'
import pawYellowImg from '@/assets/paw_yellow.png'
import logoImg      from '@/assets/logo.png'
import pawImg       from '@/assets/paw_white.png'

const CATEGORIES = [{ id: 'all', label: 'All Items' }, ...PRODUCT_CATEGORIES]

const SORT_OPTIONS = ['newest', 'price_asc', 'price_desc', 'name'] as const
type SortOption = (typeof SORT_OPTIONS)[number]
type PetTab = 'all' | 'dog' | 'cat'
function isSortOption(v: string): v is SortOption {
  return (SORT_OPTIONS as readonly string[]).includes(v)
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts]                     = useState<Product[]>([])
  const [search, setSearch]                         = useState('')
  const selectedCategory = searchParams.get('cat') || 'all'
  const requestedPet = searchParams.get('pet')
  const petTab: PetTab = requestedPet === 'cat' || requestedPet === 'dog' ? requestedPet : 'all'
  const [sortBy, setSortBy]                         = useState<SortOption>('newest')
  const [loadedKey, setLoadedKey]                   = useState<string | null>(null)
  const [loadError, setLoadError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen]         = useState(false)

  const addItem     = useCartStore((s) => s.addItem)
  const removeItem  = useCartStore((s) => s.removeItem)
  const updateQty   = useCartStore((s) => s.updateQuantity)
  const cartItems   = useCartStore((s) => s.items)

  const requestKey = JSON.stringify({ cat: selectedCategory, pet: petTab, search, sortBy, retryCount })
  const isLoading  = loadedKey !== requestKey

  useEffect(() => {
    let mounted = true
    const key = requestKey
    async function load() {
      try {
        const data = await fetchProducts({
          category: selectedCategory === 'all' ? 'all' : selectedCategory,
          pet_type: petTab === 'all' ? 'all' : petTab,
          search, sortBy,
        })
        if (mounted) { setProducts(data); setLoadError('') }
      } catch (err) {
        if (mounted) setLoadError(getApiErrorMessage(err, 'Failed to load products'))
      } finally {
        if (mounted) setLoadedKey(key)
      }
    }
    load()
    return () => { mounted = false }
  }, [requestKey, selectedCategory, petTab, search, sortBy, retryCount])

  const displayed = useMemo(() => groupProductFamilies(products, sortBy), [products, sortBy])

  function clearFilters() {
    const params = new URLSearchParams(searchParams)
    params.delete('cat')
    params.delete('pet')
    setSearchParams(params)
    setSearch('')
  }
  function setSelectedCategory(category: string): void {
    const params = new URLSearchParams(searchParams)
    if (category === 'all') params.delete('cat')
    else params.set('cat', category)
    setSearchParams(params)
  }
  function setPetTab(pet: PetTab): void {
    const params = new URLSearchParams(searchParams)
    if (pet === 'all') params.delete('pet')
    else params.set('pet', pet)
    setSearchParams(params)
  }
  function handleAddToCart(product: Product) {
    addItem({ product_id: product.id, name: product.name, price: Number(product.price), quantity: 1, image_url: product.image_url, stock: product.stock })
    toast.success(`Added ${product.name} to cart!`, {
      duration: 2000,
      style: {
        background: '#1a7a1a',
        color: '#fff',
        fontWeight: '600',
        fontSize: '14px',
        borderRadius: '12px',
        padding: '14px 20px',
        minWidth: '260px',
        maxWidth: '340px',
        backgroundImage: `linear-gradient(rgba(26,122,26,0.82), rgba(26,122,26,0.82)), url(${pawImg})`,
        backgroundRepeat: 'no-repeat, no-repeat',
        backgroundPosition: 'center, right -8px bottom -8px',
        backgroundSize: 'cover, 80px 80px',
      } as React.CSSProperties,
      iconTheme: {
        primary: '#fff',
        secondary: '#1a7a1a',
      },
    })
  }

  const hasActiveFilters = petTab !== 'all' || selectedCategory !== 'all' || search !== ''

  return (
    <>
    <div className="bg-petko-cream min-h-screen flex flex-col">

      {/* ── Hero banner ───────────────────────────────────────────────────── */}
      <div className="rounded-b-2xl">
        <div className="relative overflow-hidden rounded-b-2xl bg-[#FFFBF5] h-[160px] sm:h-[190px] lg:h-[220px]">

          {/* Left paws — scale with viewport */}
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
          <div className="relative z-20 h-full max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-2">

            {/* Text */}
            <div className="flex-shrink-0 max-w-[55%] sm:max-w-[45%]">
              <h1 className="font-extrabold text-[#0B419A] leading-[1.1]"
                style={{ fontFamily: "'Nunito', sans-serif", fontSize: 'clamp(1.4rem, 5vw, 3.2rem)' }}>
                There's More<br />
                <span className="text-[#0B419A]">to </span>
                <span className="text-[#E31B23]">Care</span>
              </h1>
              <p className="mt-1 sm:mt-2 text-[10px] sm:text-[12px] lg:text-[13px] font-medium text-gray-700 leading-snug">
                Dekalidad na pagkain, laruan, at essentials para sa mas masayang buhay ng inyong pet
              </p>
            </div>

            {/* Animal image */}
            <div className="relative h-full flex items-end justify-center flex-1 min-w-0">
              <img src={dogcatImg} alt="" aria-hidden="true"
                className="absolute bottom-0 z-20 object-contain object-bottom pointer-events-none"
                style={{ height: '115%', right: 0 }} />
            </div>

          </div>
        </div>
      </div>

      {/* ── Sticky filter area ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-petko-cream border-b border-amber-200 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-6 py-3 space-y-2">

          <div className="hidden lg:flex items-center gap-3 rounded-xl bg-white border border-gray-200 px-4 py-2.5 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search dog food, cat treats, shampoo, toys..."
                className="w-full bg-transparent py-1 pl-9 pr-2 text-sm text-gray-700 placeholder-gray-400 outline-none" />
            </div>
            <div className="h-6 w-px bg-gray-200 shrink-0" />
            <div className="flex items-center gap-1 shrink-0">
              {([
                { value: 'all' as PetTab, label: 'All Pets', emoji: null },
                { value: 'dog' as PetTab, label: 'Dogs',     emoji: '🐶' },
                { value: 'cat' as PetTab, label: 'Cats',     emoji: '🐱' },
              ]).map(tab => (
                <button key={tab.value} onClick={() => setPetTab(tab.value)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium transition
                    ${petTab === tab.value ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-800'}`}>
                  {tab.emoji && <span>{tab.emoji}</span>}
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="h-6 w-px bg-gray-200 shrink-0" />
            <div className="flex items-center gap-1.5 shrink-0 text-sm text-gray-500">
              <span>Sort:</span>
              <select value={sortBy} onChange={e => { if (isSortOption(e.target.value)) setSortBy(e.target.value) }}
                className="rounded-md border border-orange-400 bg-white px-2 py-1 text-sm text-gray-700 outline-none focus:ring-1 focus:ring-orange-400">
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* ── DESKTOP row 2: category pills ───────────────────────────── */}
          <div className="hidden lg:flex flex-wrap items-center gap-1.5">
            <div className="flex flex-1 flex-wrap items-center gap-1 min-w-0">
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                  className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium transition text-center whitespace-nowrap
                    ${selectedCategory === cat.id
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'border border-gray-300 bg-white text-gray-600 hover:border-orange-400 hover:text-orange-600'}`}>
                  {cat.label}
                </button>
              ))}
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters}
                className="shrink-0 rounded-full border border-red-400 bg-white px-2.5 py-0.5 text-xs font-medium text-red-500 hover:bg-red-50 transition">
                ✕ Clear
              </button>
            )}
          </div>

          {/* ── MOBILE: search + hamburger button ───────────────────────── */}
          <div className="flex lg:hidden items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2.5 shadow-sm">
              <Search className="shrink-0 text-gray-400" size={15} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none" />
              {search && (
                <button onClick={() => setSearch('')} className="shrink-0 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
            {/* hamburger */}
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 shadow-sm transition
                ${mobileMenuOpen || hasActiveFilters
                  ? 'border-orange-400 bg-orange-50 text-orange-500'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
              aria-label="Toggle filters"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {/* ── MOBILE dropdown panel ───────────────────────────────────── */}
          {mobileMenuOpen && (
            <div className="lg:hidden rounded-xl border border-gray-200 bg-white shadow-md p-4 space-y-4">

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Pet Type</span>
                  <select value={petTab} onChange={e => setPetTab(e.target.value as PetTab)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400">
                    <option value="all">🐾 All Pets</option>
                    <option value="dog">🐶 Dogs</option>
                    <option value="cat">🐱 Cats</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Sort By</span>
                  <select value={sortBy} onChange={e => { if (isSortOption(e.target.value)) setSortBy(e.target.value) }}
                    className="rounded-lg border border-orange-400 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-500">
                    <option value="newest">Newest First</option>
                    <option value="price_asc">Price: Low → High</option>
                    <option value="price_desc">Price: High → Low</option>
                    <option value="name">Name (A–Z)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Category</span>
                  <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400">
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                {hasActiveFilters && (
                  <button onClick={() => { clearFilters(); setMobileMenuOpen(false) }}
                    className="rounded-lg border border-red-400 bg-white px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition self-end">
                    ✕ Clear
                  </button>
                )}
              </div>

            </div>
          )}

        </div>
      </div>

      {/* ── Product area ──────────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-6 space-y-3 max-w-screen-xl mx-auto w-full flex-1">

        <p className="text-xs text-gray-500">Showing {displayed.length} {displayed.length === 1 ? 'product' : 'products'}</p>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-white p-3 shadow-sm">
                <div className="h-32 w-full rounded-xl bg-gray-200 sm:h-40" />
                <div className="mt-3 h-3.5 w-3/4 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-1/2 rounded bg-gray-200" />
                <div className="mt-3 h-8 w-full rounded-lg bg-gray-200" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-white p-8 text-center">
            <p className="text-sm text-red-700">{loadError}</p>
            <button onClick={() => setRetryCount((count) => count + 1)}
              className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-petko-blue">
              Try again
            </button>
          </div>
        ) : displayed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <ShoppingBag className="mx-auto text-gray-300" size={44} />
            <h2 className="mt-3 text-base font-bold text-gray-700">No products found</h2>
            <p className="mt-1 text-sm text-gray-400">Try adjusting your filters or search.</p>
            <button onClick={clearFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
              <RotateCcw size={13} /> Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {displayed.map(family => {
              const { product } = family
              const hasOptions = Boolean(product.parent_product_name)
              const itemInCart = cartItems.find(i => i.product_id === product.id)
              const canAddMore = product.stock > (itemInCart?.quantity ?? 0)
              return (
                <div key={product.id}
                  className="group flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm transition hover:shadow-md isolate">
                  <Link to={`/products/${product.id}`}
                    className="relative aspect-square w-full flex items-center justify-center overflow-hidden bg-white-50">
                    <span className="absolute top-4 left-4 z-20 flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500">
                      {product.pet_type === 'dog' ? '🐶' : product.pet_type === 'cat' ? '🐱' : '🐾'}
                      {product.pet_type === 'dog' ? 'DOG' : product.pet_type === 'cat' ? 'CAT' : 'ALL'}
                    </span>
                    <div className="absolute inset-2 flex items-center justify-center rounded-2xl bg-petko-cream overflow-hidden">
                      <img src={pawYellowImg} alt="" aria-hidden="true"
                        className="absolute inset-0 m-auto w-4/5 h-4/5 object-contain opacity-40 pointer-events-none" />
                      <img src={logoImg} alt="PetKo" className="relative w-3/5 object-contain" />
                    </div>
                    <img src={product.image_url} alt="" loading="lazy"
                      className="absolute inset-0 m-auto max-h-[85%] max-w-[85%] object-contain transition duration-300 group-hover:scale-105"
                      style={{ zIndex: 1 }}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      onLoad={e => {
                        const el = e.currentTarget as HTMLImageElement
                        const fallback = el.previousElementSibling as HTMLElement | null
                        if (fallback) fallback.style.display = 'none'
                      }}
                    />
                  </Link>
                  <div className="flex flex-col gap-1 px-3 pt-2 pb-3">
                    <Link to={`/products/${product.id}`}
                      className="min-h-10 text-sm font-bold text-petko-blue line-clamp-2 hover:underline"
                      style={{ fontFamily: "'Nunito', sans-serif" }}>
                      {family.name}
                    </Link>
                    <p className="text-xs text-gray-400 line-clamp-1">{product.description}</p>
                    <div className="mt-0.5 flex items-center justify-between">
                      <span className="text-sm font-bold text-orange-500">
                        {family.minPrice !== family.maxPrice && <span className="text-[10px] font-medium">From </span>}
                        ₱ {family.minPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                      <div className="flex flex-col items-end">
                        <span className={`text-xs font-semibold ${family.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {family.stock > 0 ? 'In Stock' : 'Out of Stock'}
                        </span>
                        {family.stock > 0 && (
                          <span className="text-[10px] text-gray-400">{hasOptions ? `${family.variants.length} ${family.variants.length === 1 ? 'option' : 'options'}` : `${product.stock} in stock`}</span>
                        )}
                      </div>
                    </div>
                    {hasOptions ? (
                      <Link to={`/products/${product.id}`}
                        className="mt-1.5 flex w-full items-center justify-center rounded-lg border border-orange-300 bg-orange-50 py-2 text-xs font-semibold text-orange-800 transition hover:bg-orange-100 focus-visible:ring-2 focus-visible:ring-petko-blue">
                        Choose options
                      </Link>
                    ) : itemInCart ? (
                      /* Quantity stepper — same style as Add to Cart button */
                      <div className="mt-1.5 flex w-full items-center justify-between rounded-lg border border-gray-300 bg-gray-50 overflow-hidden">
                        <button
                          onClick={() => {
                            if (itemInCart.quantity <= 1) removeItem(product.id)
                            else updateQty(product.id, itemInCart.quantity - 1)
                          }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500 hover:bg-orange-500 hover:text-white transition"
                          aria-label="Remove one"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14"/>
                          </svg>
                        </button>
                        <span className="flex-1 text-center text-xs font-semibold text-gray-700">
                          {itemInCart.quantity} in cart
                        </span>
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={!canAddMore}
                          className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500 hover:bg-orange-500 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Add one more"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 5v14M5 12h14"/>
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleAddToCart(product)} disabled={!canAddMore}
                        className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50 py-2 text-xs font-semibold text-gray-700 transition
                          hover:border-orange-500 hover:bg-orange-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                        <ShoppingCart size={12} /> Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
    </>
  )
}
