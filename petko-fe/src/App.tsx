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

// Admin pages
import AdminDashboardPage from '@/features/admin/admin-dashboard-page'
import AdminProductsPage from '@/features/admin/admin-products-page'
import AdminOrdersPage from '@/features/admin/admin-orders-page'
import AdminUsersPage from '@/features/admin/admin-users-page'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Authenticated customer routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrdersPage />} />
          </Route>
        </Route>

        {/* Admin-only routes */}
        <Route element={<ProtectedRoute requiredRole="admin" />}>
          <Route element={<AppLayout />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/products" element={<AdminProductsPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
