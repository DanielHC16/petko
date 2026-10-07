# CLAUDE.md — Petko Project Global Context & Agent Rules

## Project Overview

**Petko** is a Filipino-inspired e-commerce platform for cat and dog supplies.
It is a full-stack web application with a React/Vite frontend and a NestJS REST API backend, unified by Supabase for database storage and authentication.

### Core Features
- **User Management**: Registration, login, and profile management via Google SSO (Supabase Auth)
- **RBAC**: Two roles — `admin` and `customer` — enforced on both frontend (route guards) and backend (NestJS guards)
- **Product Catalog**: Dynamic product galleries with category filtering, search, price range, and pet-type filters
- **Cart**: Persistent shopping cart stored in Supabase, synced on login
- **Checkout**: Scaffolded checkout flow with a payment gateway integration slot (TBA)
- **Admin Panel**: Product, order, and user management for admins

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React (via Vite) + TypeScript + Tailwind CSS v3 |
| Backend | NestJS + TypeScript (strict) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth — Google SSO |
| Payments | TBA — scaffold only, gateway left blank |
| Hosting | Vercel — one project: static FE + NestJS serverless function under `/api` |

---

## Agent Behavior Rules

> These rules are **non-negotiable** and apply to every code generation task.

### 1. Always Read Standards First
Before generating any new feature, module, or component, **read the relevant standards file**:
- Frontend work → read `STANDARDS-fe.md`
- Backend work → read `STANDARDS-be.md`
- Full-stack work → read both

### 2. D.R.Y. (Don't Repeat Yourself)
- Never duplicate logic, types, constants, or utility functions
- If something is used by more than one module/component, extract it to a shared location (`lib/`, `utils/`, `common/`)
- Reuse existing helpers before creating new ones

### 3. Strict Separation of Concerns
- **Frontend**: Components render UI only; query hooks fetch data; API functions call the network; Zod schemas validate forms
- **Backend**: Controllers handle HTTP; services hold business logic; repositories handle DB queries; guards handle auth/RBAC
- Never cross these boundaries

### 4. Prioritize Modularity
- Every feature is self-contained in its own folder (`features/<name>/` on FE, `modules/<name>/` on BE)
- Shared utilities live in `lib/` (FE) or `common/` (BE) — never in a feature folder
- New features must not reach into other features' internals

### 5. Never Output Incomplete Code
- Every code block must be complete and runnable
- No `// TODO: implement this` stubs unless explicitly asked to scaffold
- No ellipsis (`...`) or `/* rest of file */` shortcuts — always output the full implementation

### 6. TypeScript Strict Mode
- `any` is **never** permitted — use `unknown`, generics, or explicit interfaces
- All service and controller methods must have explicit return types
- `async/await` only — never `.then()` chains

### 7. No Hardcoded Secrets
- All credentials and keys go in `.env` files with clear placeholder comments
- Frontend env vars are prefixed `VITE_`; backend env vars are defined in `.env` and validated via Joi
- Every `VITE_*` value is **public**: it is inlined into the browser bundle. Only the Supabase URL/anon key belong there. The service-role key is backend-only.
- No hardcoded hosts (e.g. `localhost`) in shipped code. Use env-driven values with a same-origin default.

### 8. Database Security
- The frontend talks to Supabase directly with the anon key, so RLS and column grants are the real access control for those tables.
- `petko-be/supabase/security-patch-001-lock-user-role.sql` must be applied in every Supabase project. Without it, users can self-promote to admin through the REST API.
- New tables need RLS enabled plus explicit policies. Schema changes go in `schema.sql` and, for live projects, a numbered `security-patch-*.sql` / migration file.

---

## Project Directory Layout

```
petko/
├── context/
│   ├── CLAUDE.md          ← This file (global context)
│   ├── STANDARDS-fe.md    ← Frontend standards & patterns
│   └── STANDARDS-be.md    ← Backend standards & patterns
├── api/
│   └── index.js           ← Vercel function entry → petko-be/dist/serverless.js
├── vercel.json            ← Single Vercel project config (build, rewrites, headers)
├── package.json           ← Root orchestration scripts only (no deps, no lockfile)
├── .vercelignore          ← Keeps secrets, CSV data, local env files out of uploads
├── petko-fe/              ← React + Vite frontend (own package-lock.json)
└── petko-be/              ← NestJS backend (own package-lock.json)
    └── supabase/          ← schema.sql + security patches (run manually in Supabase)
```

---

## Deployment (single Vercel project)

One Vercel project at the repo root serves everything from one domain:

- **Frontend**: `petko-fe` is built by Vite into static files at `petko-fe/dist` (the Vercel `outputDirectory`).
- **Backend**: NestJS runs as one Node serverless function, `api/index.js`. It re-exports `petko-be/dist/serverless.js`, which bootstraps the Nest app once per warm instance (Express adapter) and caches it.
- **Routing** (`vercel.json` rewrites, applied after static files): `/api/*` → the function. The Nest global prefix is `api`, so routes are `/api/products`, `/api/users/me`, `/api/health`. Every other path → `/index.html` (SPA routing).
- **Same origin**: the FE calls `/api` relatively, so CORS is off in production (`FRONTEND_URL` unset).
- **Installs**: per app (`npm ci --prefix petko-be`, `npm ci --prefix petko-fe`), with no npm workspaces. Each app keeps its own lockfile.

### Commands (repo root)

| Command | What it does |
|---|---|
| `npm run install:all` | `npm ci` in `petko-be` and `petko-fe` (Vercel `installCommand`) |
| `npm run build` | `nest build` then `tsc -b && vite build` (Vercel `buildCommand`) |
| `npm run lint` | BE eslint (check only) + FE oxlint |
| `npm test` | BE Jest unit tests (`npm run test:e2e --prefix petko-be` for e2e) |

Local dev: run `npm run start:dev` in `petko-be` (serves `http://localhost:3000/api`) and `npm run dev` in `petko-fe` (`http://localhost:5173`, which proxies `/api` → `:3000`).

### Environment variables (names only)

| Name | Side | Secret |
|---|---|---|
| `SUPABASE_URL` | BE function | no |
| `SUPABASE_SERVICE_ROLE_KEY` | BE function | **yes** (Vercel: Sensitive) |
| `SUPABASE_ANON_KEY` | BE function | no (public) |
| `VITE_SUPABASE_URL` | FE build | no (public) |
| `VITE_SUPABASE_ANON_KEY` | FE build | no (public) |

Optional, normally unset on Vercel: `VITE_API_URL` (FE, defaults to `/api`) and `FRONTEND_URL` (BE, enables CORS for a cross-origin FE). Local only: `NODE_ENV`, `PORT`. On Vercel (`VERCEL` is set) the backend never reads a `.env` file.

### Deploy steps

1. Apply `petko-be/supabase/security-patch-001-lock-user-role.sql` in the Supabase SQL editor (once).
2. `vercel link` at the repo root (Framework Preset: Other, root directory `./`), or import the GitHub repo in the Vercel dashboard with the same settings.
3. Add the five env vars above for Production (and Preview if wanted). Mark `SUPABASE_SERVICE_ROLE_KEY` Sensitive.
4. `vercel deploy --prod`, or push to `main` with the Git integration.
5. In Supabase Auth → URL Configuration, set Site URL to `https://<domain>` and add the redirect URL `https://<domain>/auth/callback`. The Google OAuth redirect URI stays the Supabase callback.
6. Smoke check `https://<domain>/api/health`.

---

## Domain Data Model (Reference)

### `users` table (Supabase)
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key — matches `auth.users.id` |
| `email` | `text` | Unique |
| `full_name` | `text` | |
| `avatar_url` | `text` | From Google profile |
| `role` | `text` | `'admin'` or `'customer'` (default: `'customer'`) |
| `created_at` | `timestamptz` | |

### `products` table
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | |
| `name` | `text` | |
| `description` | `text` | |
| `price` | `numeric` | |
| `stock` | `integer` | |
| `category` | `text` | e.g., `'food'`, `'toys'`, `'grooming'` |
| `pet_type` | `text` | `'cat'`, `'dog'`, `'both'` |
| `image_url` | `text` | |
| `is_active` | `boolean` | |
| `created_at` | `timestamptz` | |

### `cart_items` table
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | |
| `user_id` | `uuid` | FK → `users.id` |
| `product_id` | `uuid` | FK → `products.id` |
| `quantity` | `integer` | |
| `created_at` | `timestamptz` | |

### `orders` table
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | |
| `user_id` | `uuid` | FK → `users.id` |
| `status` | `text` | `'pending'`, `'paid'`, `'shipped'`, `'cancelled'` |
| `total_amount` | `numeric` | |
| `payment_reference` | `text` | Gateway reference — TBA |
| `created_at` | `timestamptz` | |

### `order_items` table
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | |
| `order_id` | `uuid` | FK → `orders.id` |
| `product_id` | `uuid` | FK → `products.id` |
| `quantity` | `integer` | |
| `unit_price` | `numeric` | Snapshot at time of purchase |

---

## What NOT To Do
- Do not use `any` anywhere — ever
- Do not read secrets from hardcoded strings
- Do not put business logic in controllers (BE) or components (FE)
- Do not put DB queries in services (BE) or query hooks (FE)
- Do not duplicate code across features — extract shared logic
- Do not generate incomplete or stubbed code blocks unless explicitly scaffolding
