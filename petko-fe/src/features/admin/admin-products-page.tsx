import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
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
  ImageIcon,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/axios'
import { getApiErrorMessage } from '@/lib/api-error'
import type { Product } from '@/features/products/products-api'

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
  'food',
  'treats',
  'toys',
  'grooming',
  'wellness',
  'litter',
  'bedding',
  'apparel',
  'cleaning',
  'travel',
  'accessories',
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

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<ProductFormData>(emptyFormData)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setIsLoading(true)
    try {
      const res = await api.get<{ success: boolean; data: Product[] }>('/products/admin/all')
      setProducts(res.data.data || [])
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to fetch products'))
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

    if (isNaN(priceNum) || priceNum < 0) {
      toast.error('Please enter a valid price')
      return
    }

    if (isNaN(stockNum) || stockNum < 0) {
      toast.error('Please enter a valid stock quantity')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: priceNum,
        stock: stockNum,
        category: formData.category,
        pet_type: formData.pet_type,
        image_url: formData.image_url.trim() || 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop',
        is_active: formData.is_active,
      }

      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, payload)
        toast.success(`Updated "${payload.name}" successfully!`)
      } else {
        await api.post('/products', payload)
        toast.success(`Created "${payload.name}" successfully!`)
      }

      setIsModalOpen(false)
      loadProducts()
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save product'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleActive(product: Product) {
    const nextState = !product.is_active
    try {
      await api.patch(`/products/${product.id}`, { is_active: nextState })
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_active: nextState } : p)),
      )
      toast.success(
        `Product marked as ${nextState ? 'ACTIVE' : 'INACTIVE'}`,
      )
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to update status'))
    }
  }

  async function handleDeleteProduct(product: Product) {
    const confirmMsg = `Are you sure you want to permanently delete "${product.name}"?`
    if (!window.confirm(confirmMsg)) return

    setDeletingId(product.id)
    try {
      await api.delete(`/products/${product.id}`)
      toast.success(`Deleted "${product.name}"`, { icon: '🗑️' })
      setProducts((prev) => prev.filter((p) => p.id !== product.id))
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to delete product'))
    } finally {
      setDeletingId(null)
    }
  }

  // Filtered list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      const matchesSearch =
        search.trim() === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())

      // Category
      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter

      // Pet Type
      const matchesPet = petTypeFilter === 'all' || p.pet_type === petTypeFilter

      // Stock
      let matchesStock = true
      if (stockFilter === 'in_stock') matchesStock = p.stock > 5
      else if (stockFilter === 'low_stock') matchesStock = p.stock > 0 && p.stock <= 5
      else if (stockFilter === 'out_of_stock') matchesStock = p.stock === 0

      return matchesSearch && matchesCat && matchesPet && matchesStock
    })
  }, [products, search, categoryFilter, petTypeFilter, stockFilter])

  // Stats
  const totalCount = products.length
  const activeCount = products.filter((p) => p.is_active).length
  const lowStockCount = products.filter((p) => p.stock <= 5).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-orange-600 mb-2"
          >
            <ArrowLeft size={14} />
            Back to Admin Portal
          </Link>
          <h1 className="text-2xl font-black text-gray-900 sm:text-3xl">
            Product Management &amp; Catalog
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Create, edit, update inventory, toggle active status, and delete items from your live database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadProducts}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600"
          >
            <Plus size={16} />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Total Products
          </span>
          <p className="mt-1 text-xl font-black text-gray-900">{totalCount}</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            Active in Store
          </span>
          <p className="mt-1 text-xl font-black text-emerald-950">{activeCount}</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
            Low / Out of Stock
          </span>
          <p className="mt-1 text-xl font-black text-amber-950">{lowStockCount}</p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
            Categories
          </span>
          <p className="mt-1 text-xl font-black text-blue-950">{CATEGORIES.length}</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name or description..."
            className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-xs text-gray-800 placeholder-gray-400 focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-orange-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>

          {/* Pet Type */}
          <select
            value={petTypeFilter}
            onChange={(e) => setPetTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-orange-500 focus:outline-none"
          >
            <option value="all">All Pets</option>
            <option value="dog">🐶 Dogs</option>
            <option value="cat">🐱 Cats</option>
            <option value="both">🐾 Both</option>
          </select>

          {/* Stock */}
          <select
            value={stockFilter}
            onChange={(e) => {
              if (isStockFilter(e.target.value)) setStockFilter(e.target.value)
            }}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-orange-500 focus:outline-none"
          >
            <option value="all">All Stock Levels</option>
            <option value="in_stock">In Stock (&gt; 5)</option>
            <option value="low_stock">Low Stock (1-5)</option>
            <option value="out_of_stock">Out of Stock (0)</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3.5">
          <span className="text-xs font-bold text-gray-700">
            Showing {filteredProducts.length} of {products.length} products
          </span>
          <Link
            to="/"
            className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
          >
            <Eye size={14} />
            View Live Customer Storefront
          </Link>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            Loading products catalog...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <Package className="mx-auto text-gray-300 mb-2" size={36} />
            <p className="font-semibold text-gray-700">No products match your criteria</p>
            <button
              onClick={() => {
                setSearch('')
                setCategoryFilter('all')
                setPetTypeFilter('all')
                setStockFilter('all')
              }}
              className="mt-3 text-xs font-bold text-orange-600 underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Product</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Pet Type</th>
                  <th className="px-6 py-3.5">Price</th>
                  <th className="px-6 py-3.5">Stock</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((product) => {
                  const isDeleting = deletingId === product.id

                  return (
                    <tr key={product.id} className="hover:bg-gray-50/70 transition">
                      {/* Product Name & Image */}
                      <td className="px-6 py-3.5 max-w-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-50 p-1 border border-gray-100">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <ImageIcon size={18} className="text-gray-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 line-clamp-1" title={product.name}>
                              {product.name}
                            </p>
                            <p className="text-[11px] text-gray-400 line-clamp-1">
                              {product.description || 'No description'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-3.5">
                        <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-700">
                          {product.category}
                        </span>
                      </td>

                      {/* Pet Type */}
                      <td className="px-6 py-3.5">
                        <span className="font-medium text-gray-700">
                          {product.pet_type === 'dog'
                            ? '🐶 Dog'
                            : product.pet_type === 'cat'
                              ? '🐱 Cat'
                              : '🐾 Both'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-6 py-3.5 font-bold text-gray-900">
                        ₱{Number(product.price).toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Stock */}
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            product.stock <= 0
                              ? 'text-red-500'
                              : product.stock <= 5
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                          }`}
                        >
                          {product.stock <= 5 && <AlertTriangle size={12} />}
                          {product.stock} units
                        </span>
                      </td>

                      {/* Active Status */}
                      <td className="px-6 py-3.5">
                        <button
                          onClick={() => handleToggleActive(product)}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition ${
                            product.is_active
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Click to toggle visibility in store"
                        >
                          {product.is_active ? '● Active' : '○ Inactive'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(product)}
                            className="rounded-lg border border-gray-200 p-1.5 text-gray-600 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
                            title="Edit Product"
                            aria-label={`Edit ${product.name}`}
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            onClick={() => handleDeleteProduct(product)}
                            disabled={isDeleting}
                            className="rounded-lg border border-red-200 p-1.5 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            title="Delete Product"
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 size={14} className={isDeleting ? 'animate-pulse' : ''} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitProduct} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. PetKo Salmon & Rice Adult Dog Food 2kg"
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm text-gray-800 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Price and Stock */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700">
                    Price (₱ PHP) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="e.g. 850.00"
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm text-gray-800 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700">
                    Stock Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="e.g. 30"
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm text-gray-800 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Category and Pet Type */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-800 focus:border-orange-500 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700">
                    Target Pet Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.pet_type}
                    onChange={(e) => {
                      const value = e.target.value
                      if (isPetType(value)) setFormData({ ...formData, pet_type: value })
                    }}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-800 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="both">🐾 For All Pets (Both)</option>
                    <option value="dog">🐶 Dogs</option>
                    <option value="cat">🐱 Cats</option>
                  </select>
                </div>
              </div>

              {/* Image URL with live preview */}
              <div>
                <label className="block text-xs font-bold text-gray-700">
                  Image URL (Direct image link)
                </label>
                <div className="mt-1 flex gap-3">
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://cdn.shopify.com/s/files/... or Unsplash image"
                    className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2 text-sm text-gray-800 focus:border-orange-500 focus:outline-none"
                  />
                  {formData.image_url && (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 overflow-hidden">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          ;(e.target as HTMLElement).style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  Leave blank to use the high-resolution category fallback image.
                </p>
              </div>

              {/* Is Active Toggle */}
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 bg-gray-50">
                <input
                  type="checkbox"
                  id="modal-is-active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="modal-is-active" className="text-xs font-semibold text-gray-800 cursor-pointer">
                  Publish to Storefront (Item is active and purchasable by customers)
                </label>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700">
                  Product Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details, ingredients, usage directions, size specifications..."
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm text-gray-800 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-50"
                >
                  {isSaving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                  <span>{editingProduct ? 'Save Changes' : 'Create Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
