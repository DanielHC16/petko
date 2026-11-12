/**
 * Local-dev mock layer.  Activated only in development when VITE_MOCK=true.
 *
 * What it does:
 *  1. Seeds the Zustand auth store with a mock admin profile so ProtectedRoute
 *     and the Navbar render correctly without a real Supabase session.
 *  2. Patches the Supabase client's auth.* methods so the onAuthStateChange
 *     listener in main.tsx fires with a fake session.
 *  3. Replaces the axios adapter so every NestJS /api/* call is handled
 *     in-memory — create / update / delete mutations persist for the session.
 *
 * Import this module once at the very top of main.tsx.
 * When VITE_MOCK !== 'true' the module is a no-op and tree-shakes cleanly.
 */

import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { api } from '@/lib/axios'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import type { Product } from '@/features/products/products-api'
import { VARIANT_FIELDS } from '@/lib/product-catalog'
import type { AdminUser, AdminAccessEmail } from '@/features/admin/admin-api'
import {
  mockProfile,
  mockProducts,
  MOCK_PRODUCT_CONTENT,
  mockUsers,
  mockAccessEmails,
  getMockStats,
  getMockOrderList,
  mockOrders,
} from '@/lib/mock-data'

export const isMock = import.meta.env.DEV && import.meta.env.VITE_MOCK === 'true'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip /api prefix and return the bare path, e.g. "/products/admin/all" */
function endpoint(config: InternalAxiosRequestConfig): string {
  const url = config.url ?? ''
  try {
    return new URL(url, 'http://localhost').pathname.replace(/^\/api/, '')
  } catch {
    return url.replace(/^\/api/, '')
  }
}

function body(config: InternalAxiosRequestConfig): Record<string, unknown> {
  if (typeof config.data === 'string') {
    try { return JSON.parse(config.data) } catch { return {} }
  }
  return (config.data as Record<string, unknown>) ?? {}
}

function ok(data: unknown, config: InternalAxiosRequestConfig): AxiosResponse {
  return { data: { success: true, data, message: 'OK' }, status: 200, statusText: 'OK', headers: {}, config, request: {} }
}

function okVoid(config: InternalAxiosRequestConfig): AxiosResponse {
  return { data: { success: true, data: null, message: 'OK' }, status: 200, statusText: 'OK', headers: {}, config, request: {} }
}

// ─── Fake Supabase session ────────────────────────────────────────────────────


// ─── Supabase query builder mock (for products-api direct queries) ────────────

class MockQuery {
  private table: string
  private filters: Array<(row: Record<string, unknown>) => boolean> = []
  private orderField?: string
  private orderAsc = true
  private isSingle = false

  constructor(table: string) { this.table = table }

  select() { return this }

  eq(field: string, value: unknown) {
    this.filters.push((row) => row[field] === value)
    return this
  }

  or(filterStr: string) {
    const conditions = filterStr.split(',').map((c) => {
      const parts = c.split('.')
      return { field: parts[0], op: parts[1], value: parts.slice(2).join('.') }
    })
    this.filters.push((row) =>
      conditions.some(({ field, op, value }) => {
        if (op === 'eq') return String(row[field]) === value
        if (op === 'ilike') {
          const pattern = value.replace(/%/g, '').toLowerCase()
          return String(row[field] ?? '').toLowerCase().includes(pattern)
        }
        return false
      }),
    )
    return this
  }

  order(field: string, opts?: { ascending?: boolean }) {
    this.orderField = field
    this.orderAsc = opts?.ascending ?? true
    return this
  }

  single() { this.isSingle = true; return this }
  maybeSingle() { this.isSingle = true; return this }

  then<TResult>(
    onFulfilled: (value: { data: unknown; error: unknown }) => TResult,
  ): Promise<TResult> {
    let rows: Record<string, unknown>[] = []

    if (this.table === 'products') {
      rows = [...mockProducts] as unknown as Record<string, unknown>[]
    } else if (this.table === 'cart_items') {
      // cart-api queries cart_items — return empty so local cart is used
      rows = []
    }

    for (const f of this.filters) rows = rows.filter(f)

    if (this.orderField) {
      const field = this.orderField
      const asc = this.orderAsc
      rows = [...rows].sort((a, b) => {
        const av = a[field] as string | number
        const bv = b[field] as string | number
        if (av < bv) return asc ? -1 : 1
        if (av > bv) return asc ? 1 : -1
        return 0
      })
    }

    const result = this.isSingle
      ? { data: rows[0] ?? null, error: rows.length ? null : { message: 'Not found' } }
      : { data: rows, error: null }

    return Promise.resolve(onFulfilled(result))
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

if (isMock) {

  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer' as const,
    user: {
      id: mockProfile.id,
      email: mockProfile.email,
      app_metadata: {},
      user_metadata: { full_name: mockProfile.full_name },
      aud: 'authenticated',
      created_at: '2025-09-01T08:00:00Z',
    },
  }

  console.info('[mock] VITE_MOCK=true — running without a backend')

  // 1. Seed auth store immediately (no loading flash, ProtectedRoute passes)
  useAuthStore.setState({
    session: mockSession as never,
    profile: mockProfile,
    isLoading: false,
  })

  // 2. Patch Supabase auth so main.tsx onAuthStateChange fires correctly
  supabase.auth.getSession = (() =>
    Promise.resolve({ data: { session: mockSession as never }, error: null })
  ) as unknown as typeof supabase.auth.getSession

  supabase.auth.onAuthStateChange = ((
    callback: (event: string, session: unknown) => void,
  ) => {
    setTimeout(() => callback('INITIAL_SESSION', mockSession), 0)
    return { data: { subscription: { unsubscribe: () => {} } } }
  }) as unknown as typeof supabase.auth.onAuthStateChange

  supabase.auth.signOut = (() => {
    useAuthStore.getState().clearSession()
    return Promise.resolve({ error: null })
  }) as unknown as typeof supabase.auth.signOut

  supabase.auth.signInWithOAuth = (() => {
    // In mock mode redirect to home — no real OAuth
    window.location.href = '/'
    return Promise.resolve({ data: { provider: 'google', url: '/' }, error: null })
  }) as unknown as typeof supabase.auth.signInWithOAuth

  // 3. Patch Supabase from() for direct product / cart queries
  ;(supabase as unknown as { from: (t: string) => MockQuery }).from =
    (table: string) => new MockQuery(table)

  // 4. Replace the axios adapter so all /api/* calls are handled in-memory
  api.defaults.adapter = (async (
    config: InternalAxiosRequestConfig,
  ): Promise<AxiosResponse> => {
    const path = endpoint(config)
    const method = (config.method ?? 'get').toLowerCase()

    // ── Auth / profile ──────────────────────────────────────────────────────
    if (path === '/users/me' && method === 'get') {
      return ok(mockProfile, config)
    }

    // Accept TOS — just return success; profile already has tos_accepted:true
    if (path === '/users/me/tos-acceptance' && method === 'post') {
      useAuthStore.setState({ profile: { ...useAuthStore.getState().profile!, tos_accepted: true } })
      return ok({ tos_accepted: true }, config)
    }

    // ── Admin stats ─────────────────────────────────────────────────────────
    if (path === '/admin/stats' && method === 'get') {
      return ok(getMockStats(), config)
    }

    // ── Admin access emails ─────────────────────────────────────────────────
    if (path === '/admin-access-emails') {
      if (method === 'get') return ok([...mockAccessEmails], config)
      if (method === 'post') {
        const { email } = body(config)
        const entry: AdminAccessEmail = {
          id: `acc-${Date.now()}`,
          email: String(email ?? ''),
          added_by: mockProfile.email,
          created_at: new Date().toISOString(),
        }
        mockAccessEmails.push(entry)
        return ok(entry, config)
      }
    }
    const aemMatch = path.match(/^\/admin-access-emails\/([^/]+)$/)
    if (aemMatch && method === 'delete') {
      const idx = mockAccessEmails.findIndex((e) => e.id === aemMatch[1])
      if (idx >= 0) mockAccessEmails.splice(idx, 1)
      return okVoid(config)
    }

    // ── Users ───────────────────────────────────────────────────────────────
    if (path === '/users' && method === 'get') {
      return ok([...mockUsers], config)
    }
    if (path === '/users/promote' && method === 'post') {
      const { email, role } = body(config)
      let user = mockUsers.find((u) => u.email === email)
      if (user) {
        user.role = (role as 'admin' | 'customer') ?? 'admin'
      } else {
        user = {
          id: `mock-user-${Date.now()}`,
          email: String(email ?? ''),
          full_name: String(email ?? '').split('@')[0],
          avatar_url: '',
          role: (role as 'admin' | 'customer') ?? 'admin',
          tos_accepted: false,
          created_at: new Date().toISOString(),
          admin_access_listed: false,
        } as AdminUser
        mockUsers.push(user)
      }
      return ok(user, config)
    }
    const roleMatch = path.match(/^\/users\/([^/]+)\/role$/)
    if (roleMatch && method === 'patch') {
      const user = mockUsers.find((u) => u.id === roleMatch[1])
      const { role } = body(config)
      if (user) user.role = (role as 'admin' | 'customer') ?? 'customer'
      return okVoid(config)
    }
    const userMatch = path.match(/^\/users\/([^/]+)$/)
    if (userMatch && method === 'delete') {
      const idx = mockUsers.findIndex((u) => u.id === userMatch[1])
      if (idx >= 0) mockUsers.splice(idx, 1)
      return okVoid(config)
    }

    // ── Products (admin CRUD) ───────────────────────────────────────────────
    if (path === '/products/admin/all' && method === 'get') {
      return ok([...mockProducts], config)
    }
    if (path === '/products' && method === 'post') {
      const b = body(config)
      const attributes = typeof b.variant_attributes === 'object' && b.variant_attributes !== null
        ? b.variant_attributes : {}
      const product: Product = {
        ...MOCK_PRODUCT_CONTENT,
        sku: typeof b.sku === 'string' ? b.sku : null,
        parent_product_name: String(b.parent_product_name ?? ''),
        variant_attributes: Object.fromEntries(VARIANT_FIELDS.flatMap(({ key }) => {
          if (!(key in attributes)) return []
          const value: unknown = Reflect.get(attributes, key)
          return typeof value === 'string' && value.trim() ? [[key, value.trim()]] : []
        })),
        ingredients_materials: String(b.ingredients_materials ?? ''),
        guaranteed_analysis: String(b.guaranteed_analysis ?? ''),
        usage_instructions: String(b.usage_instructions ?? ''),
        safety_warnings: String(b.safety_warnings ?? ''),
        id: `prod-${Date.now()}`,
        name: String(b.name ?? ''),
        description: String(b.description ?? ''),
        price: Number(b.price) || 0,
        stock: Number(b.stock) || 0,
        category: String(b.category ?? 'food'),
        pet_type: (b.pet_type as Product['pet_type']) ?? 'both',
        image_url: String(b.image_url ?? '') ||
          'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop',
        is_active: b.is_active !== false,
        created_at: new Date().toISOString(),
      }
      mockProducts.unshift(product)
      return ok(product, config)
    }
    const prodMatch = path.match(/^\/products\/([^/]+)$/)
    if (prodMatch) {
      const pid = prodMatch[1]
      if (method === 'patch') {
        const product = mockProducts.find((p) => p.id === pid)
        if (product) Object.assign(product, body(config))
        return okVoid(config)
      }
      if (method === 'delete') {
        const idx = mockProducts.findIndex((p) => p.id === pid)
        if (idx >= 0) mockProducts.splice(idx, 1)
        return okVoid(config)
      }
    }

    // ── Orders ──────────────────────────────────────────────────────────────
    // Admin orders list
    if (path === '/orders/admin/all' && method === 'get') {
      return ok(getMockOrderList(true), config)
    }
    // Admin single order
    const adminOrderMatch = path.match(/^\/orders\/admin\/([^/]+)$/)
    if (adminOrderMatch && method === 'get') {
      const order = mockOrders.find((o) => o.id === adminOrderMatch[1])
      return order
        ? ok(order, config)
        : Promise.reject({ response: { status: 404, data: { success: false, message: 'Order not found' } }, isAxiosError: true })
    }

    // Customer orders list
    if (path === '/orders' && method === 'get') {
      return ok(getMockOrderList(false), config)
    }
    // Place order
    if (path === '/orders' && method === 'post') {
      const b = body(config)
      const newOrder = {
        ...mockOrders[0],
        id: `aaaa-${Date.now()}-bbbb-cccc`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        fulfillment_status: 'placed' as const,
        status: 'pending' as const,
        shipping: (b.shipping ?? mockOrders[0].shipping) as typeof mockOrders[0]['shipping'],
        total_amount: Number(b.total_amount) || 999,
        subtotal_amount: Number(b.subtotal_amount) || 900,
        shipping_fee: Number(b.shipping_fee) || 99,
      }
      mockOrders.unshift(newOrder)
      return ok(newOrder, config)
    }
    // Customer single order
    const orderMatch = path.match(/^\/orders\/([^/]+)$/)
    if (orderMatch && method === 'get') {
      const order = mockOrders.find((o) => o.id === orderMatch[1])
      return order
        ? ok(order, config)
        : Promise.reject({ response: { status: 404, data: { success: false, message: 'Order not found' } }, isAxiosError: true })
    }
    // Order fulfillment update (admin)
    const fulfillMatch = path.match(/^\/orders\/([^/]+)\/fulfillment$/)
    if (fulfillMatch && method === 'patch') {
      const order = mockOrders.find((o) => o.id === fulfillMatch[1])
      if (order) {
        const b = body(config)
        order.fulfillment_status = (b.status as typeof order['fulfillment_status']) ?? order.fulfillment_status
        if (b.courier_name) order.courier_name = String(b.courier_name)
        if (b.tracking_number) order.tracking_number = String(b.tracking_number)
        order.tracking_version = (order.tracking_version ?? 0) + 1
      }
      return ok(order ?? null, config)
    }
    // Confirm receipt
    const confirmMatch = path.match(/^\/orders\/([^/]+)\/confirm-receipt$/)
    if (confirmMatch && method === 'post') {
      const order = mockOrders.find((o) => o.id === confirmMatch[1])
      if (order) order.delivery_confirmed_at = new Date().toISOString()
      return ok(order ?? null, config)
    }
    // Report delivery issue
    const reportMatch = path.match(/^\/orders\/([^/]+)\/delivery-issue$/)
    if (reportMatch && method === 'post') {
      const order = mockOrders.find((o) => o.id === reportMatch[1])
      const { message } = body(config)
      if (order) order.delivery_issue = { message: String(message ?? ''), reported_at: new Date().toISOString(), resolution: null, resolved_at: null }
      return ok(order ?? null, config)
    }
    // Resolve delivery issue
    const resolveMatch = path.match(/^\/orders\/([^/]+)\/resolve-delivery-issue$/)
    if (resolveMatch && method === 'post') {
      const order = mockOrders.find((o) => o.id === resolveMatch[1])
      if (order?.delivery_issue) {
        const { resolution } = body(config)
        order.delivery_issue.resolution = String(resolution ?? '')
        order.delivery_issue.resolved_at = new Date().toISOString()
      }
      return ok(order ?? null, config)
    }

    // ── Cart API (remote sync — silently succeed; local store is source of truth)
    if (path.startsWith('/cart')) return okVoid(config)

    // ── Fallback ────────────────────────────────────────────────────────────
    console.warn(`[mock] unhandled ${method.toUpperCase()} ${path}`)
    return Promise.reject({
      response: { status: 404, data: { success: false, message: `Mock: no handler for ${method.toUpperCase()} ${path}` } },
      config,
      isAxiosError: true,
    })
  }) as unknown as typeof api.defaults.adapter
}
