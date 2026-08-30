# STANDARDS-fe.md — Petko Frontend Standards (React + Vite + Tailwind CSS)

> **Always read `CLAUDE.md` before reading this file.**
> This document governs all frontend code in `petko-fe/`.

---

## Stack

| Tool | Purpose |
|---|---|
| React 18 + TypeScript (strict) | UI framework |
| Vite | Build tool & dev server |
| Tailwind CSS v3 | Utility-first styling |
| React Router v6 | Client-side routing |
| TanStack Query v5 | Server state management |
| Zustand | Client state (cart, auth session) |
| Axios | HTTP client |
| Zod | Schema validation |
| `@supabase/supabase-js` | Auth (Google SSO) client |
| `lucide-react` | Icons |
| `react-hot-toast` | Notifications |

---

## Project Structure

```
petko-fe/
├── .env.local                    # Environment variables (never commit)
├── .env.example                  # Placeholder file committed to repo
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx                  # App entry — providers wrap here
    ├── App.tsx                   # Router definition
    ├── lib/
    │   ├── supabase.ts           # Supabase client singleton
    │   ├── axios.ts              # Axios instance (for NestJS API calls)
    │   └── api-types.ts          # Shared response envelope types
    ├── store/
    │   ├── auth.store.ts         # Zustand — auth session + user role
    │   └── cart.store.ts         # Zustand — persistent cart state
    ├── hooks/
    │   ├── use-auth.ts           # Auth session hook (reads from store)
    │   ├── use-role.ts           # Role check helper hook
    │   └── use-cart.ts           # Cart operations hook
    ├── components/
    │   ├── ui/                   # Reusable presentational primitives
    │   │   ├── Button.tsx
    │   │   ├── Input.tsx
    │   │   ├── Modal.tsx
    │   │   ├── Spinner.tsx
    │   │   └── Badge.tsx
    │   └── layout/
    │       ├── Navbar.tsx
    │       ├── Footer.tsx
    │       └── ProtectedRoute.tsx
    ├── features/
    │   ├── auth/
    │   │   ├── auth-page.tsx
    │   │   └── auth-callback.tsx
    │   ├── products/
    │   │   ├── products-page.tsx
    │   │   ├── products-api.ts
    │   │   ├── products-queries.ts
    │   │   ├── product-detail-page.tsx
    │   │   └── products-filter.tsx
    │   ├── cart/
    │   │   ├── cart-page.tsx
    │   │   ├── cart-api.ts
    │   │   └── cart-queries.ts
    │   ├── checkout/
    │   │   ├── checkout-page.tsx
    │   │   └── checkout-api.ts       # Scaffolded — gateway TBA
    │   ├── orders/
    │   │   ├── orders-page.tsx
    │   │   ├── orders-api.ts
    │   │   └── orders-queries.ts
    │   └── admin/
    │       ├── admin-dashboard-page.tsx
    │       ├── admin-products-page.tsx
    │       └── admin-orders-page.tsx
    └── assets/
```

---

## Environment Variables

Create `petko-fe/.env.local` (never commit this file):

```env
# .env.local — Petko Frontend
# Copy this from .env.example and fill in your Supabase credentials

VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

VITE_API_URL=http://localhost:3000
```

Create `petko-fe/.env.example` (commit this):

```env
# .env.example — copy to .env.local and fill in values
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:3000
```

---

## Supabase Client

**`src/lib/supabase.ts`** — singleton, import this everywhere auth or DB is needed on the client:

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## Google SSO Auth Flow

### Step 1 — Trigger Sign-In (`auth-page.tsx`)

```ts
import { supabase } from '@/lib/supabase'

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw new Error(error.message)
}
```

### Step 2 — Handle Callback (`auth-callback.tsx`)

Supabase redirects back to `/auth/callback` with the session in the URL hash.
This component reads the session and redirects the user appropriately:

```tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session)
        navigate('/', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    })
  }, [navigate, setSession])

  return <div>Signing you in...</div>
}
```

### Step 3 — Listen for Auth State Changes (`main.tsx`)

Register a global listener once at app startup. It keeps the Zustand store in sync when the session refreshes or expires:

```ts
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session)
})
```

### Step 4 — Sign Out

```ts
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
  useAuthStore.getState().clearSession()
}
```

---

## State Management

### Auth Store (`store/auth.store.ts`)

```ts
import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url: string
  role: 'admin' | 'customer'
}

interface AuthState {
  session: Session | null
  profile: UserProfile | null
  setSession: (session: Session | null) => void
  setProfile: (profile: UserProfile | null) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  clearSession: () => set({ session: null, profile: null }),
}))
```

### Cart Store (`store/cart.store.ts`)

The cart is persisted to Supabase on login. Locally it is held in Zustand for instant UI updates.

```ts
import { create } from 'zustand'

export interface CartItem {
  product_id: string
  name: string
  price: number
  quantity: number
  image_url: string
}

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (product_id: string) => void
  updateQuantity: (product_id: string, quantity: number) => void
  clearCart: () => void
  totalItems: () => number
  totalPrice: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.product_id === item.product_id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product_id === item.product_id
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          ),
        }
      }
      return { items: [...state.items, item] }
    }),
  removeItem: (product_id) =>
    set((state) => ({
      items: state.items.filter((i) => i.product_id !== product_id),
    })),
  updateQuantity: (product_id, quantity) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.product_id === product_id ? { ...i, quantity } : i
      ),
    })),
  clearCart: () => set({ items: [] }),
  totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
  totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}))
```

---

## Routing & Protected Routes

### Route Structure (`App.tsx`)

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/components/layout/ProtectedRoute'

// Pages
import AuthPage from '@/features/auth/auth-page'
import AuthCallbackPage from '@/features/auth/auth-callback'
import ProductsPage from '@/features/products/products-page'
import ProductDetailPage from '@/features/products/product-detail-page'
import CartPage from '@/features/cart/cart-page'
import CheckoutPage from '@/features/checkout/checkout-page'
import OrdersPage from '@/features/orders/orders-page'
import AdminDashboardPage from '@/features/admin/admin-dashboard-page'
import AdminProductsPage from '@/features/admin/admin-products-page'
import AdminOrdersPage from '@/features/admin/admin-orders-page'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Customer routes — requires any authenticated user */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrdersPage />} />
        </Route>

        {/* Admin routes — requires role === 'admin' */}
        <Route element={<ProtectedRoute requiredRole="admin" />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/products" element={<AdminProductsPage />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

### Protected Route Component (`components/layout/ProtectedRoute.tsx`)

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'

interface ProtectedRouteProps {
  requiredRole?: 'admin' | 'customer'
}

export default function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const session = useAuthStore((s) => s.session)
  const profile = useAuthStore((s) => s.profile)

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
```

---

## Axios Client (`lib/axios.ts`)

Used for calls to the NestJS API. **Not** used for Supabase calls (use the Supabase client for those).

```ts
import axios from 'axios'
import { supabase } from '@/lib/supabase'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false,
})

// Attach Supabase JWT to every NestJS API request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

---

## Response Envelope Types (`lib/api-types.ts`)

```ts
export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: PaginationMeta
  message: string
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}
```

---

## Layering Rules

```
Component → Query Hook → API Function → Axios client
```

1. **Components** render UI and call `use*` hooks from `<feature>-queries.ts` — never call `api` directly
2. **API layer** (`<feature>-api.ts`) owns endpoint URLs, request/response types, and unwraps the envelope
3. **Query layer** (`<feature>-queries.ts`) wraps API functions in `useQuery`/`useMutation`; defines query-key factories
4. **Schema layer** (`<feature>-schema.ts`) defines Zod schemas; export `z.infer<typeof schema>` as form types
5. **UI primitives** in `components/ui/` are presentational only — no data fetching ever

---

## File Naming Conventions

- **kebab-case** for all files and folders
- Feature file suffixes:
  - Page component → `<feature>-page.tsx`
  - API functions → `<feature>-api.ts`
  - Query hooks → `<feature>-queries.ts`
  - Zod schema → `<feature>-schema.ts`
  - Sub-form → `<feature>-form.tsx`
- Components are **PascalCase**, hooks are `useCamelCase`, variables/functions are `camelCase`
- Import alias: `@/` maps to `src/`

---

## Tailwind CSS Rules

- Use Tailwind utility classes exclusively — no custom CSS files except `index.css` for `@tailwind` directives and CSS variables
- Define color tokens as CSS variables in `index.css` and reference via Tailwind config
- Responsive breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)
- Prefer flex and grid layouts; avoid hardcoded pixel values
- Use `clsx` or `cn()` utility for conditional class merging

```ts
// src/lib/cn.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## Accessibility (WCAG 2.1 AA)

- All interactive elements must have descriptive `aria-label` or visible label text
- Images must have `alt` text; decorative images use `alt=""`
- Forms must use `<label htmlFor>` linked to input `id`
- Focus states must be visible — never `outline: none` without a replacement
- Color contrast ratio: minimum 4.5:1 for normal text, 3:1 for large text
- Keyboard navigation must work on all interactive elements

---

## Code Style

- TypeScript strict mode — never `any`
- `async/await` only — never `.then()`
- Explicit return types on custom hooks and utility functions
- Co-locate everything a feature needs inside `features/<feature>/`
- List queries use `placeholderData: keepPreviousData` for smooth pagination

---

## Scripts

```bash
npm run dev       # Vite dev server (http://localhost:5173)
npm run build     # tsc -b && vite build
npm run lint      # eslint .
npm run preview   # preview production build
```
