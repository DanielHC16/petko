/**
 * Mock infrastructure for local development without a backend.
 *
 * When VITE_MOCK=true this module:
 *   1. Seeds the Zustand auth store with a mock admin session + profile
 *      (so ProtectedRoute passes and the Navbar shows user info).
 *   2. Patches the Supabase client's `auth.*` and `from()` methods so
 *      auth flows and shop product queries work entirely in-memory.
 *   3. Replaces the axios adapter so every NestJS API endpoint returns
 *      realistic mock data, including create/update/delete mutations.
 *
 * Import this module once, early, before the app boots — see main.tsx.
 * When VITE_MOCK is not 'true' this module is a no-op.
 */
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { api } from '@/lib/axios'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import type { Product } from '@/features/products/products-api'
import type { AdminUser, AdminAccessEmail } from '@/features/admin/admin-api'
import {
  mockProducts,
  mockUsers,
  mockAccessEmails,
  mockProfile,
  getMockStats,
} from '@/lib/mock-data'

const isMock = import.meta.env.VITE_MOCK === 'true'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Extract the API path from an axios config, stripping any /api prefix. */
function endpoint(config: InternalAxiosRequestConfig): string {
  const url = config.url || ''
  try {
    return new URL(url, 'http://localhost').pathname.replace(/^\/api/, '')
  } catch {
    return url.replace(/^\/api/, '')
  }
}

/** Parse the request body (axios may send it as a JSON string or object). */
function parseBody(config: InternalAxiosRequestConfig): Record<string, unknown> {
  if (typeof config.data === 'string') {
    try {
      return JSON.parse(config.data)
    } catch {
      return {}
    }
  }
  return (config.data as Record<string, unknown>) || {}
}

function ok(data: unknown, config: InternalAxiosRequestConfig): AxiosResponse {
  return {
    data: { success: true, data, message: 'OK' },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    request: {},
  }
}

function okVoid(config: InternalAxiosRequestConfig): AxiosResponse {
  return {
    data: { success: true, data: null, message: 'OK' },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    request: {},
  }
}

/* ------------------------------------------------------------------ */
/*  1 — Mock session & profile                                        */
/* ------------------------------------------------------------------ */

const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: { id: mockProfile.id, email: mockProfile.email },
}

/* ------------------------------------------------------------------ */
/*  2 — Mock Supabase query builder                                    */
/* ------------------------------------------------------------------ */

/** Chainable mock query builder that mimics the Supabase select API. */
class MockQuery {
  private table: string
  private filters: Array<(row: Record<string, unknown>) => boolean> = []
  private orderField: string | undefined
  private orderAsc = true
  private isSingle = false

  constructor(table: string) {
    this.table = table
  }

  select() {
    return this
  }

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

  single() {
    this.isSingle = true
    return this
  }

  /** Makes the object thenable so `await query` works. */
  then<TResult>(
    onFulfilled: (value: { data: unknown; error: unknown }) => TResult,
  ): Promise<TResult> {
    let data: Record<string, unknown>[] = []
    if (this.table === 'products') {
      data = [...mockProducts] as unknown as Record<string, unknown>[]
    }

    for (const f of this.filters) data = data.filter(f)

    if (this.orderField) {
      const field = this.orderField
      const asc = this.orderAsc
      data = [...data].sort((a, b) => {
        const aVal = a[field] as string | number
        const bVal = b[field] as string | number
        if (aVal < bVal) return asc ? -1 : 1
        if (aVal > bVal) return asc ? 1 : -1
        return 0
      })
    }

    const result = this.isSingle
      ? { data: data[0] ?? null, error: data.length ? null : { message: 'Not found' } }
      : { data, error: null }

    return Promise.resolve(onFulfilled(result))
  }
}

/* ------------------------------------------------------------------ */
/*  Bootstrap                                                          */
/* ------------------------------------------------------------------ */

if (isMock) {
  // eslint-disable-next-line no-console
  console.log('[mock] VITE_MOCK=true — using in-memory mock data (no backend required)')

  // 1. Seed auth store immediately (no flash of loading state)
  useAuthStore.setState({
    session: mockSession as never,
    profile: mockProfile,
    isLoading: false,
  })

  // 2. Patch Supabase auth methods
  supabase.auth.getSession = (() =>
    Promise.resolve({
      data: { session: mockSession as never },
      error: null,
    })) as unknown as typeof supabase.auth.getSession

  supabase.auth.onAuthStateChange = ((callback: (event: string, session: unknown) => void) => {
    setTimeout(() => callback('INITIAL_SESSION', mockSession), 0)
    return { data: { subscription: { unsubscribe: () => {} } } }
  }) as unknown as typeof supabase.auth.onAuthStateChange

  supabase.auth.signOut = (() => {
    useAuthStore.getState().clearSession()
    return Promise.resolve({ error: null })
  }) as unknown as typeof supabase.auth.signOut

  supabase.auth.signInWithOAuth = (() => {
    window.location.href = '/admin'
    return Promise.resolve({ data: null, error: null })
  }) as unknown as typeof supabase.auth.signInWithOAuth

  // 3. Patch Supabase from() for product queries
  ;(supabase as unknown as { from: unknown }).from = (table: string) =>
    new MockQuery(table)

  // 4. Patch the axios adapter
  api.defaults.adapter = (async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const path = endpoint(config)
    const method = String(config.method || 'get').toLowerCase()

    /* ── Auth ────────────────────────────────────────────────────── */
    if (path === '/users/me' && method === 'get') {
      return ok(mockProfile, config)
    }

    /* ── Admin stats ─────────────────────────────────────────────── */
    if (path === '/admin/stats' && method === 'get') {
      return ok(getMockStats(), config)
    }

    /* ── Admin access emails ─────────────────────────────────────── */
    if (path === '/admin-access-emails' && method === 'get') {
      return ok([...mockAccessEmails], config)
    }
    if (path === '/admin-access-emails' && method === 'post') {
      const { email } = parseBody(config)
      const newEmail: AdminAccessEmail = {
        id: `acc-${Date.now()}`,
        email: String(email || ''),
        added_by: mockProfile.email,
        created_at: new Date().toISOString(),
      }
      mockAccessEmails.push(newEmail)
      return ok(newEmail, config)
    }
    if (path.startsWith('/admin-access-emails/') && method === 'delete') {
      const id = path.split('/')[2]
      const idx = mockAccessEmails.findIndex((e) => e.id === id)
      if (idx >= 0) mockAccessEmails.splice(idx, 1)
      return okVoid(config)
    }

    /* ── Users ───────────────────────────────────────────────────── */
    if (path === '/users' && method === 'get') {
      return ok([...mockUsers], config)
    }
    if (path === '/users/promote' && method === 'post') {
      const { email, role } = parseBody(config)
      let user = mockUsers.find((u) => u.email === email)
      if (user) {
        user.role = (role as 'admin' | 'customer') || 'admin'
      } else {
        user = {
          id: `mock-user-${Date.now()}`,
          email: String(email || ''),
          full_name: String(email || '').split('@')[0],
          avatar_url: '',
          role: (role as 'admin' | 'customer') || 'admin',
          created_at: new Date().toISOString(),
          admin_access_listed: false,
        } as AdminUser
        mockUsers.push(user)
      }
      return ok(user, config)
    }
    // /users/:id/role  (PATCH)
    const roleMatch = path.match(/^\/users\/([^/]+)\/role$/)
    if (roleMatch && method === 'patch') {
      const id = roleMatch[1]
      const { role } = parseBody(config)
      const user = mockUsers.find((u) => u.id === id)
      if (user) user.role = (role as 'admin' | 'customer') || 'customer'
      return okVoid(config)
    }
    // /users/:id  (DELETE only — must not match /users/me or /users/promote)
    const userMatch = path.match(/^\/users\/([^/]+)$/)
    if (userMatch && method === 'delete' && userMatch[1] !== 'me' && userMatch[1] !== 'promote') {
      const id = userMatch[1]
      const idx = mockUsers.findIndex((u) => u.id === id)
      if (idx >= 0) mockUsers.splice(idx, 1)
      return okVoid(config)
    }

    /* ── Products (admin) ────────────────────────────────────────── */
    if (path === '/products/admin/all' && method === 'get') {
      return ok([...mockProducts], config)
    }
    if (path === '/products' && method === 'post') {
      const body = parseBody(config)
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        name: String(body.name || ''),
        description: String(body.description || ''),
        price: Number(body.price) || 0,
        stock: Number(body.stock) || 0,
        category: String(body.category || 'food'),
        pet_type: (body.pet_type as Product['pet_type']) || 'both',
        image_url:
          String(body.image_url || '') ||
          'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop',
        is_active: body.is_active !== false,
        created_at: new Date().toISOString(),
      }
      mockProducts.unshift(newProduct)
      return ok(newProduct, config)
    }
    // /products/:id  (PATCH or DELETE, but NOT /products/admin/all)
    const prodMatch = path.match(/^\/products\/([^/]+)$/)
    if (prodMatch && !path.includes('/admin/')) {
      const id = prodMatch[1]
      if (method === 'patch') {
        const body = parseBody(config)
        const product = mockProducts.find((p) => p.id === id)
        if (product) Object.assign(product, body)
        return okVoid(config)
      }
      if (method === 'delete') {
        const idx = mockProducts.findIndex((p) => p.id === id)
        if (idx >= 0) mockProducts.splice(idx, 1)
        return okVoid(config)
      }
    }

    // Fallback: any unmatched route
    // eslint-disable-next-line no-console
    console.warn(`[mock] No handler for ${method.toUpperCase()} ${path}`)
    return Promise.reject({
      response: { status: 404, data: { success: false, message: `Mock handler not found for ${method.toUpperCase()} ${path}` } },
      config,
      isAxiosError: true,
    })
  }) as unknown as typeof api.defaults.adapter
}
