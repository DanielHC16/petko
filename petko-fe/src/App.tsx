import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'

// Auth
import AuthPage from '@/features/auth/auth-page'
import AuthCallbackPage from '@/features/auth/auth-callback'

// Customer pages
import ProductsPage from '@/features/products/products-page'
import ProductDetailPage from '@/features/products/product-detail-page'
import CartPage from '@/features/cart/cart-page'
import CheckoutPage from '@/features/checkout/checkout-page'
import OrdersPage from '@/features/orders/orders-page'
import Profile from '@/features/customer/profile'

// Dev preview (lazy loaded)
const LoadingPreview = lazy(() => import('@/features/auth/loading-preview'))

// Admin pages (lazy-loaded so they do not bloat the storefront bundle)
const AdminDashboardPage = lazy(() => import('@/features/admin/admin-dashboard-page'))
const AdminProductsPage  = lazy(() => import('@/features/admin/admin-products-page'))
const AdminOrdersPage    = lazy(() => import('@/features/admin/admin-orders-page'))
const AdminUsersPage     = lazy(() => import('@/features/admin/admin-users-page'))

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-sm font-semibold text-petko-blue">Loading…</div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public / Auth */}
          <Route path="/login"         element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Dev preview */}
          <Route path="/loading-preview" element={<LoadingPreview />} />

          {/* Authenticated customer routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/"             element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/cart"         element={<CartPage />} />
              <Route path="/checkout"     element={<CheckoutPage />} />
              <Route path="/orders"       element={<OrdersPage />} />
              <Route path="/profile"       element={<Profile />} />
            </Route>
          </Route>

          {/* Admin-only routes */}
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route element={<AppLayout />}>
              <Route path="/admin"          element={<AdminDashboardPage />} />
              <Route path="/admin/products" element={<AdminProductsPage />} />
              <Route path="/admin/orders"   element={<AdminOrdersPage />} />
              <Route path="/admin/users"    element={<AdminUsersPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
