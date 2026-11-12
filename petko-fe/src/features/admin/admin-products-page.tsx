import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { toastStyle, toastIconTheme } from '@/lib/toast-style'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  ArrowLeft,
  RefreshCw,
  Eye,
  AlertTriangle,
  X,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/axios'
import { getApiErrorMessage } from '@/lib/api-error'
import type { Product } from '@/features/products/products-api'
import pawYellowImg from '@/assets/paw_yellow.png'
import logoImg      from '@/assets/logo.png'
import PageBanner from '@/components/layout/PageBanner'

const STOCK_FILTERS = ['all', 'in_stock', 'low_stock', 'out_of_stock'] as const
type StockFilter = (typeof STOCK_FILTERS)[number]

const PET_TYPES = ['cat', 'dog', 'both'] as const
type PetType = (typeof PET_TYPES)[number]

function isStockFilter(value: string): value is StockFilter {
  return (STOCK_FILTERS as readonly string[]).includes(value)
}

function isPetType(value: string): value is PetType {
  return (PET_TYPES as readonly string[]).includes(value)
}

const CATEGORIES = [
  'food', 'treats', 'toys', 'grooming', 'wellness', 'litter',
  'bedding', 'apparel', 'cleaning', 'travel', 'accessories',
]

interface ProductFormData {
  name: string
  description: string
  price: string
  stock: string
  category: string
  pet_type: PetType
  image_url: string
  is_active: boolean
}

const emptyFormData: ProductFormData = {
  name: '',
  description: '',
  price: '',
  stock: '25',
  category: 'food',
  pet_type: 'both',
  image_url: '',
  is_active: true,
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [petTypeFilter, setPetTypeFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<ProductFormData>(emptyFormData)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; message: string; confirmLabel: string; onConfirm: () => void
  }>({ open: false, title: '', message: '', confirmLabel: 'Delete', onConfirm: () => {} })

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    setIsLoading(true)
    try {
      const res = await api.get<{ success: boolean; data: Product[] }>('/products/admin/all')
      setProducts(res.data.data || [])
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to fetch products'), { style: toastStyle('error'), iconTheme: toastIconTheme('error') })
    } finally {
      setIsLoading(false)
    }
  }

  function handleOpenCreateModal() {
    setEditingProduct(null)
    setFormData(emptyFormData)
    setIsModalOpen(true)
  }

  function handleOpenEditModal(product: Product) {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category,
      pet_type: product.pet_type,
      image_url: product.image_url,
      is_active: product.is_active,
    })
    setIsModalOpen(true)
  }

  async function handleSubmitProduct(e: React.FormEvent) {
    e.preventDefault()
    const priceNum = parseFloat(formData.price)
    const stockNum = parseInt(formData.stock, 10)
    if (isNaN(priceNum) || priceNum < 0) { toast.error('Please enter a valid price', { style: toastStyle('error'), iconTheme: toastIconTheme('error') }); return }
    if (isNaN(stockNum) || stockNum < 0) { toast.error('Please enter a valid stock quantity', { style: toastStyle('error'), iconTheme: toastIconTheme('error') }); return }

    setIsSaving(true)
    try {
      const isOutOfStock = stockNum <= 0
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: priceNum,
        stock: stockNum,
        category: formData.category,
        pet_type: formData.pet_type,
        image_url: formData.image_url.trim() || 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop',
        is_active: isOutOfStock ? false : formData.is_active,
      }
      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, payload)
        toast.success(`Updated "${payload.name}" successfully!`, { style: toastStyle('warning'), iconTheme: toastIconTheme('warning') })
      } else {
        await api.post('/products', payload)
        toast.success(`Created "${payload.name}" successfully!`, { style: toastStyle('success'), iconTheme: toastIconTheme('success') })
      }
      setIsModalOpen(false)
      loadProducts()
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save product'), { style: toastStyle('error'), iconTheme: toastIconTheme('error') })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleActive(product: Product) {
    if (!product.is_active && product.stock <= 0) {
      toast.error('Cannot activate an out-of-stock product. Update stock first.', { icon: '⚠️', style: toastStyle('error'), iconTheme: toastIconTheme('error') })
      return
    }
    const nextState = !product.is_active
    try {
      await api.patch(`/products/${product.id}`, { is_active: nextState })
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, is_active: nextState } : p))
      toast.success(`Product marked as ${nextState ? 'ACTIVE' : 'INACTIVE'}`, { style: toastStyle('warning'), iconTheme: toastIconTheme('warning') })
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to update status'), { style: toastStyle('error'), iconTheme: toastIconTheme('error') })
    }
  }

  async function handleDeleteProduct(product: Product) {
    setConfirmDialog({
      open: true,
      title: 'Delete product',
      message: `Permanently delete "${product.name}"?`,
      confirmLabel: 'Delete Product',
      onConfirm: async () => {
        setConfirmDialog((d) => ({ ...d, open: false }))
        setDeletingId(product.id)
        try {
          await api.delete(`/products/${product.id}`)
          toast.success(`Deleted "${product.name}"`, { icon: '🗑️', style: toastStyle('error'), iconTheme: toastIconTheme('error') })
          setProducts((prev) => prev.filter((p) => p.id !== product.id))
        } catch (err: unknown) {
          toast.error(getApiErrorMessage(err, 'Failed to delete product'), { style: toastStyle('error'), iconTheme: toastIconTheme('error') })
        } finally {
          setDeletingId(null)
        }
      },
    })
  }

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = search.trim() === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter
      const matchesPet = petTypeFilter === 'all' || p.pet_type === petTypeFilter
      let matchesStock = true
      if (stockFilter === 'in_stock') matchesStock = p.stock > 5
      else if (stockFilter === 'low_stock') matchesStock = p.stock > 0 && p.stock <= 5
      else if (stockFilter === 'out_of_stock') matchesStock = p.stock === 0
      return matchesSearch && matchesCat && matchesPet && matchesStock
    })
  }, [products, search, categoryFilter, petTypeFilter, stockFilter])

  const totalCount = products.length
  const activeCount = products.filter((p) => p.is_active && p.stock > 0).length
  const lowStockCount = products.filter((p) => p.stock <= 5).length

  return (
    <div className="min-h-screen w-full bg-[#ecdab6] p-6 font-sans lg:p-10">
      <div className="space-y-6">

        {/* ── Page banner ───────────────────────────────────────────── */}
        <PageBanner
          title="Product Management & Catalog"
          subtitle="Create, edit, update inventory, toggle active status, and delete items from your live database."
        >
          {/* Back button + action buttons in the banner's children slot */}
          <div className="flex items-center justify-between gap-2 border-t border-orange-100 bg-orange-50/60 px-3 py-2 sm:px-8">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#10298E] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0B3B8C] active:scale-95 sm:px-3"
            >
              <ArrowLeft size={13} />
              <span>Back<span className="hidden sm:inline"> to Admin Portal</span></span>
            </Link>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={loadProducts}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#e1cba5] bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-[#fef8e8] disabled:opacity-50 sm:px-3"
                title="Refresh list"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600 sm:px-3"
              >
                <Plus size={13} />
                <span>Add<span className="hidden sm:inline"> New</span> Product</span>
              </button>
            </div>
          </div>
        </PageBanner>

        {/* ── Metrics ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[#e1cba5] bg-[#fdf2e1] p-4 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Total Products</span>
            <p className="mt-1 text-xl font-black text-[#10298E]">{totalCount}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Active in Store</span>
            <p className="mt-1 text-xl font-black text-emerald-950">{activeCount}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Low / Out of Stock</span>
            <p className="mt-1 text-xl font-black text-amber-950">{lowStockCount}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Categories</span>
            <p className="mt-1 text-xl font-black text-blue-950">{CATEGORIES.length}</p>
          </div>
        </div>

        {/* ── Filter toolbar ────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 rounded-xl border border-[#e1cba5] bg-[#fdf2e1] p-3 shadow-sm sm:flex-row sm:items-center">
          {/* Search — grows to fill space */}
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or description..."
              className="w-full rounded-lg border border-[#e1cba5] bg-white py-2 pl-9 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:border-orange-500 focus:outline-none" />
          </div>
          {/* Dropdowns — always one row, never wrap */}
          <div className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0 sm:items-center">
            {/* Category */}
            <div className="flex min-w-0 flex-col gap-1">
              <label
                htmlFor="filter-category"
                className="px-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600"
              >
                Category
              </label>
              <select
                id="filter-category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full min-w-0 truncate rounded-lg border border-[#e1cba5] bg-white px-2.5 py-2 text-xs text-gray-700 focus:border-orange-500 focus:outline-none sm:w-auto"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Pet Type */}
            <div className="flex min-w-0 flex-col gap-1">
              <label
                htmlFor="filter-pet-type"
                className="px-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600"
              >
                Pet Type
              </label>
              <select
                id="filter-pet-type"
                value={petTypeFilter}
                onChange={(e) => setPetTypeFilter(e.target.value)}
                className="w-full min-w-0 truncate rounded-lg border border-[#e1cba5] bg-white px-2.5 py-2 text-xs text-gray-700 focus:border-orange-500 focus:outline-none sm:w-auto"
              >
                <option value="all">🐾 All Pets</option>
                <option value="dog">🐶 Dogs</option>
                <option value="cat">🐱 Cats</option>
              </select>
            </div>

            {/* Stock Status */}
            <div className="flex min-w-0 flex-col gap-1">
              <label
                htmlFor="filter-stock"
                className="px-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600"
              >
                Stock
              </label>
              <select
                id="filter-stock"
                value={stockFilter}
                onChange={(e) => {
                  if (isStockFilter(e.target.value)) setStockFilter(e.target.value)
                }}
                className="w-full min-w-0 truncate rounded-lg border border-[#e1cba5] bg-white px-2.5 py-2 text-xs text-gray-700 focus:border-orange-500 focus:outline-none sm:w-auto"
              >
                <option value="all">All Stock</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>
        </div>
        {/* ── Products table ────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[#e1cba5] bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-[#e1cba5] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span className="text-xs font-bold text-[#10298E]">
              Showing {filteredProducts.length} of {products.length} products
            </span>
            <Link to="/" className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700">
              <Eye size={14} />
              View Live Customer Storefront
            </Link>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-sm text-gray-500">Loading products catalog...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500">
              <Package className="mx-auto text-gray-300 mb-2" size={36} />
              <p className="font-semibold text-gray-700">No products match your criteria</p>
              <button onClick={() => { setSearch(''); setCategoryFilter('all'); setPetTypeFilter('all'); setStockFilter('all') }}
                className="mt-3 text-xs font-bold text-orange-600 underline">Reset Filters</button>
            </div>
          ) : (
            <div>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#e1cba5] bg-[#fdf2e1] uppercase tracking-wider font-semibold text-[#10298E] text-xs">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="hidden px-4 py-3 md:table-cell">Category</th>
                    <th className="hidden px-4 py-3 md:table-cell">Pet Type</th>
                    <th className="hidden px-4 py-3 md:table-cell">Price</th>
                    <th className="hidden px-4 py-3 md:table-cell">Stock</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e1cba5]/60">
                  {filteredProducts.map((product) => {
                    const isDeleting = deletingId === product.id
                    const isExpanded = expandedId === product.id

                    return (
                      <>
                        {/* ── Main row ─────────────────────────────── */}
                        <tr
                          key={product.id}
                          onClick={() => setExpandedId(isExpanded ? null : product.id)}
                          className={`hover:bg-[#fef8e8] transition cursor-pointer ${isExpanded ? 'hidden' : ''}`}
                        >
                          {/* Product — always visible */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {/* Expand toggle */}
                              <button
                                onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : product.id) }}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#10298E] hover:bg-blue-50 transition"
                                aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                                aria-expanded={isExpanded}
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>

                              {/* Thumbnail */}
                              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e1cba5]">
                                <div className="absolute inset-0 flex items-center justify-center bg-petko-cream">
                                  <img src={pawYellowImg} alt="" aria-hidden="true"
                                    className="absolute inset-0 m-auto h-4/5 w-4/5 object-contain opacity-40 pointer-events-none" />
                                  <img src={logoImg} alt="PetKo"
                                    className="relative w-3/5 object-contain" />
                                </div>
                                {product.image_url && (
                                  <img src={product.image_url} alt={product.name}
                                    className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
                                    style={{ zIndex: 1 }}
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                                    onLoad={(e) => {
                                      const el = e.currentTarget as HTMLImageElement
                                      const fallback = el.previousElementSibling as HTMLElement | null
                                      if (fallback) fallback.style.display = 'none'
                                    }}
                                  />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate font-bold text-[#10298E] text-xs sm:text-sm" title={product.name}>
                                  {product.name}
                                </p>
                                <p className="hidden truncate text-[11px] text-gray-400 md:block">
                                  {product.description || 'No description'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Desktop-only columns — hidden when row is expanded */}
                          <td className="hidden px-4 py-3 md:table-cell">
                            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-700">
                              {product.category}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 font-medium text-gray-700 text-xs md:table-cell">
                            {product.pet_type === 'dog' ? '🐶 Dog' : product.pet_type === 'cat' ? '🐱 Cat' : '🐾 Both'}
                          </td>
                          <td className="hidden px-4 py-3 font-bold text-[#10298E] text-sm md:table-cell">
                            ₱{Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="hidden px-4 py-3 md:table-cell">
                            <span className={`inline-flex items-center gap-1 font-semibold text-xs ${product.stock <= 0 ? 'text-red-500' : product.stock <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {product.stock <= 5 && <AlertTriangle size={12} />}
                              {product.stock} units
                            </span>
                          </td>

                          {/* Status — always visible */}
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleToggleActive(product)}
                              disabled={product.stock <= 0}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition whitespace-nowrap ${
                                product.stock <= 0
                                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-75'
                                  : product.is_active
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                              title={
                                product.stock <= 0
                                  ? 'Out-of-stock items are automatically deemed inactive'
                                  : 'Click to toggle visibility in store'
                              }
                            >
                              {product.stock <= 0 ? 'Inactive' : product.is_active ? 'Active' : 'Inactive'}
                            </button>
                          </td>

                          {/* Actions — always visible */}
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(product)}
                                className="rounded-lg border border-[#e1cba5] p-1.5 text-gray-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
                                title="Edit Product"
                                aria-label={`Edit ${product.name}`}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product)}
                                disabled={isDeleting}
                                className="rounded-lg border border-red-200 p-1.5 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                title="Delete Product"
                                aria-label={`Delete ${product.name}`}
                              >
                                <Trash2 size={13} className={isDeleting ? 'animate-pulse' : ''} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* ── Expandable detail row (all breakpoints) ── */}
                        {isExpanded && (
                          <tr key={`${product.id}-expanded`} className="bg-[#fefaf2]">

                            {/* ── MOBILE: colSpan=3, stacked layout ── */}
                            <td colSpan={3} className="px-3 pb-3 pt-2 md:hidden">
                              {/* Top: chevron + name + status pill */}
                              <div className="flex items-start gap-2 mb-3">
                                <button onClick={() => setExpandedId(null)}
                                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#10298E] hover:bg-blue-50 transition"
                                  aria-label="Collapse details">
                                  <ChevronUp size={13} />
                                </button>
                                {/* Image */}
                                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e1cba5] bg-petko-cream">
                                  <img src={pawYellowImg} alt="" aria-hidden="true" className="absolute inset-0 m-auto h-4/5 w-4/5 object-contain opacity-40 pointer-events-none" />
                                  <img src={logoImg} alt="PetKo" className="relative w-3/5 object-contain" />
                                  {product.image_url && (
                                    <img src={product.image_url} alt={product.name} className="absolute inset-0 m-auto max-h-full max-w-full object-contain" style={{ zIndex: 1 }}
                                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                                      onLoad={(e) => { const el = e.currentTarget as HTMLImageElement; const fb = el.previousElementSibling as HTMLElement | null; if (fb) fb.style.display = 'none' }} />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black text-[#10298E] leading-snug mb-1">{product.name}</p>
                                  <button onClick={() => handleToggleActive(product)} disabled={product.stock <= 0}
                                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition whitespace-nowrap ${product.stock <= 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : product.is_active ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                    {product.stock <= 0 ? 'Inactive' : product.is_active ? 'Active' : 'Inactive'}
                                  </button>
                                </div>
                              </div>
                              {/* Details grid */}
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pl-7 text-[10px] mb-3">
                                <div><p className="font-semibold uppercase tracking-wider text-gray-400">Category</p><span className="inline-block rounded bg-orange-50 px-1.5 py-0.5 font-bold uppercase text-orange-700">{product.category}</span></div>
                                <div><p className="font-semibold uppercase tracking-wider text-gray-400">Stock</p><p className={`inline-flex items-center gap-0.5 font-semibold ${product.stock <= 0 ? 'text-red-500' : product.stock <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>{product.stock <= 5 && <AlertTriangle size={10} />}{product.stock} units</p></div>
                                <div><p className="font-semibold uppercase tracking-wider text-gray-400">Price</p><p className="font-bold text-[#10298E]">₱{Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                                <div><p className="font-semibold uppercase tracking-wider text-gray-400">Pet Type</p><p className="font-medium text-gray-700">{product.pet_type === 'dog' ? '🐶 Dog' : product.pet_type === 'cat' ? '🐱 Cat' : '🐾 Both'}</p></div>
                                {product.description && (
                                  <div className="col-span-2"><p className="font-semibold uppercase tracking-wider text-gray-400">Description</p><p className="mt-0.5 text-gray-600 line-clamp-3">{product.description}</p></div>
                                )}
                              </div>
                              {/* Bottom: edit + delete buttons */}
                              <div className="flex gap-2 pl-7">
                                <button onClick={() => handleOpenEditModal(product)}
                                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#e1cba5] bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
                                  aria-label={`Edit ${product.name}`}>
                                  <Edit2 size={15} /> Edit
                                </button>
                                <button onClick={() => handleDeleteProduct(product)} disabled={isDeleting}
                                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                  aria-label={`Delete ${product.name}`}>
                                  <Trash2 size={15} className={isDeleting ? 'animate-pulse' : ''} /> Delete
                                </button>
                              </div>
                            </td>

                            {/* ── DESKTOP: colSpan=5 + Status + Actions cells ── */}
                            <td colSpan={5} className="hidden px-6 pb-5 pt-3 md:table-cell">
                              <div className="flex gap-5">
                                <button onClick={() => setExpandedId(null)}
                                  className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#10298E] hover:bg-blue-50 transition self-start"
                                  aria-label="Collapse details">
                                  <ChevronUp size={14} />
                                </button>
                                <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e1cba5] bg-petko-cream">
                                  <img src={pawYellowImg} alt="" aria-hidden="true" className="absolute inset-0 m-auto h-4/5 w-4/5 object-contain opacity-40 pointer-events-none" />
                                  <img src={logoImg} alt="PetKo" className="relative w-3/5 object-contain" />
                                  {product.image_url && (
                                    <img src={product.image_url} alt={product.name} className="absolute inset-0 m-auto max-h-full max-w-full object-contain" style={{ zIndex: 1 }}
                                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                                      onLoad={(e) => { const el = e.currentTarget as HTMLImageElement; const fb = el.previousElementSibling as HTMLElement | null; if (fb) fb.style.display = 'none' }} />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 space-y-3">
                                  <p className="text-base font-black text-[#10298E] leading-snug">{product.name}</p>
                                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                                    <div><p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Category</p><span className="mt-0.5 inline-block rounded bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-700">{product.category}</span></div>
                                    <div><p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Stock</p><p className={`mt-0.5 inline-flex items-center gap-1 font-semibold ${product.stock <= 0 ? 'text-red-500' : product.stock <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>{product.stock <= 5 && <AlertTriangle size={11} />}{product.stock} units</p></div>
                                  </div>
                                  <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
                                    <div><p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Price</p><p className="mt-0.5 font-bold text-[#10298E]">₱{Number(product.price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
                                    <div><p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Pet Type</p><p className="mt-0.5 font-medium text-gray-700">{product.pet_type === 'dog' ? '🐶 Dog' : product.pet_type === 'cat' ? '🐱 Cat' : '🐾 Both'}</p></div>
                                  </div>
                                  {product.description && (
                                    <div><p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Description</p><p className="mt-0.5 text-xs text-gray-600">{product.description}</p></div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="hidden px-4 pb-5 pt-3 align-top md:table-cell">
                              <button onClick={() => handleToggleActive(product)} disabled={product.stock <= 0}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition whitespace-nowrap ${product.stock <= 0 ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-75' : product.is_active ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                title={product.stock <= 0 ? 'Out-of-stock items are automatically deemed inactive' : 'Click to toggle visibility in store'}>
                                {product.stock <= 0 ? 'Inactive' : product.is_active ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="hidden px-4 pb-5 pt-3 text-right align-top md:table-cell">
                              <div className="flex items-center justify-end gap-1.5">
                                <button onClick={() => handleOpenEditModal(product)} className="rounded-lg border border-[#e1cba5] p-1.5 text-gray-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600" title="Edit Product" aria-label={`Edit ${product.name}`}><Edit2 size={13} /></button>
                                <button onClick={() => handleDeleteProduct(product)} disabled={isDeleting} className="rounded-lg border border-red-200 p-1.5 text-red-600 transition hover:bg-red-50 disabled:opacity-50" title="Delete Product" aria-label={`Delete ${product.name}`}><Trash2 size={13} className={isDeleting ? 'animate-pulse' : ''} /></button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Create / Edit Product Modal ────────────────────────────── */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="flex w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-2xl overflow-hidden sm:rounded-2xl" style={{ maxHeight: '92dvh' }}>
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[#e1cba5] bg-[#fdf2e1] px-5 py-4 sm:px-6">
                <h2 className="text-base font-bold text-[#10298E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmitProduct} className="flex-1 overflow-y-auto p-5 space-y-4 sm:p-6">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-[#10298E]">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" required value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. PetKo Salmon & Rice Adult Dog Food 2kg"
                    className="mt-1 w-full rounded-xl border border-[#e1cba5] bg-[#fefaf2] px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-orange-500 focus:outline-none" />
                </div>

                {/* Price + Stock */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-[#10298E]">
                      Price (₱ PHP) <span className="text-red-500">*</span>
                    </label>
                    <input type="number" step="0.01" min="0" required value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="e.g. 850.00"
                      className="mt-1 w-full rounded-xl border border-[#e1cba5] bg-[#fefaf2] px-3.5 py-2.5 text-sm text-gray-800 focus:border-orange-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#10298E]">
                      Stock Quantity <span className="text-red-500">*</span>
                    </label>
                    <input type="number" min="0" required value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="e.g. 30"
                      className="mt-1 w-full rounded-xl border border-[#e1cba5] bg-[#fefaf2] px-3.5 py-2.5 text-sm text-gray-800 focus:border-orange-500 focus:outline-none" />
                  </div>
                </div>

                {/* Category + Pet Type */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-[#10298E]">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-[#e1cba5] bg-[#fefaf2] px-3.5 py-2.5 text-sm text-gray-800 focus:border-orange-500 focus:outline-none">
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#10298E]">
                      Target Pet Type <span className="text-red-500">*</span>
                    </label>
                    <select value={formData.pet_type} onChange={(e) => { if (isPetType(e.target.value)) setFormData({ ...formData, pet_type: e.target.value }) }}
                      className="mt-1 w-full rounded-xl border border-[#e1cba5] bg-[#fefaf2] px-3.5 py-2.5 text-sm text-gray-800 focus:border-orange-500 focus:outline-none">
                      <option value="both">🐾 For All Pets (Both)</option>
                      <option value="dog">🐶 Dogs</option>
                      <option value="cat">🐱 Cats</option>
                    </select>
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-xs font-bold text-[#10298E]">
                    Image URL (Direct image link)
                  </label>
                  <div className="mt-1 flex gap-3">
                    <input type="url" value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://cdn.shopify.com/s/files/... or Unsplash image"
                      className="flex-1 rounded-xl border border-[#e1cba5] bg-[#fefaf2] px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-orange-500 focus:outline-none" />
                    {formData.image_url && (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#e1cba5] bg-[#fefaf2] p-0.5 overflow-hidden">
                        <img src={formData.image_url} alt="Preview"
                          className="h-full w-full object-contain"
                          onError={(e) => { ;(e.target as HTMLElement).style.display = 'none' }} />
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">
                    Leave blank to use the high-resolution category fallback image.
                  </p>
                </div>

                {/* Is Active Toggle */}
                {(() => {
                  const stockNum = parseInt(formData.stock, 10)
                  const isOut = isNaN(stockNum) || stockNum <= 0
                  return (
                    <div className="flex items-center gap-3 rounded-xl border border-[#e1cba5] bg-[#fefaf2] p-3">
                      <input
                        type="checkbox"
                        id="modal-is-active"
                        checked={isOut ? false : formData.is_active}
                        disabled={isOut}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500 disabled:opacity-50"
                      />
                      <div className="flex flex-col">
                        <label
                          htmlFor="modal-is-active"
                          className={`text-xs font-semibold ${isOut ? 'text-gray-400 cursor-not-allowed' : 'text-gray-800 cursor-pointer'}`}
                        >
                          Publish to Storefront (Item is active and purchasable by customers)
                        </label>
                        {isOut && (
                          <span className="text-[11px] text-amber-700 font-medium mt-0.5">
                            Out-of-stock items are automatically deemed inactive.
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-[#10298E]">
                    Product Description
                  </label>
                  <textarea rows={3} value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Details, ingredients, usage directions, size specifications..."
                    className="mt-1 w-full rounded-xl border border-[#e1cba5] bg-[#fefaf2] px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-orange-500 focus:outline-none" />
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-[#e1cba5] pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-[#e1cba5] px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-[#fef8e8]">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-50">
                    {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    <span>{editingProduct ? 'Save Changes' : 'Create Product'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* ── Confirm Dialog ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        variant="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((d) => ({ ...d, open: false }))}
      />
    </div>
  )
}
