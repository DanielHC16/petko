# CLAUDE.md — Petko Project Global Context & Agent Rules

## Project Overview

**Petko** is a Filipino-inspired e-commerce platform for cat and dog supplies.
It is a full-stack web application with a React/Vite frontend and a NestJS REST API backend, unified by Supabase for database storage and authentication.

### Core Features
- **User Management**: Registration, login, and profile management via Google SSO (Supabase Auth)
- **Terms Acceptance**: Account-level `tos_accepted` boolean, saved only by explicit agreement and reused across logins/devices; the footer remains a read-only terms viewer
- **RBAC**: Two roles — `admin` and `customer` — enforced on both frontend (route guards) and backend (NestJS guards). See "Admin access" below for how a user becomes an admin.
- **Product Catalog**: Dynamic product galleries with category filtering, search, price range, and pet-type filters
- **Cart**: Persistent shopping cart stored in Supabase, synced on login
- **Checkout**: Real Cash on Delivery checkout with server-priced totals, atomic stock reservation, and retry-safe order placement. GCash, Maya, and card checkout use a confirmation flow without moving money; the server marks these payments as simulated.
- **Order Tracking**: Admin-controlled fulfillment with timestamped history, customer-only receipt confirmation, and nonreceipt reports for admin review.
- **Admin Panel**: Product, order, and user management for admins, plus the editable admin access list
- **Admin Analytics**: Placed order value and customer-confirmed sales, buyers, browser sessions/page views, daily trends, and top products at `/admin/analytics`

### Admin access (effective admin role)

A signed-in user is an admin when **either** is true:
1. `public.users.role = 'admin'` (stored role, set from the Users page), **or**
2. their **confirmed** auth email is in `public.admin_access_emails` (case-insensitive; stored lowercase).

- Computed server-side in `AuthGuard` on every authenticated request and attached to `request.user.role`. It is never written back to `users.role`. `RolesGuard`, `GET /api/users/me` and therefore the FE all see the effective role.
- The FE needs no extra role logic: the Navbar **Storefront / Admin Panel** toggle (the only view switch) and the `/admin*` routes key on `profile.role === 'admin'`. Customers see no toggle, are redirected away from `/admin*`, and get 403 from admin APIs (401 without a token).
- **When it resolves**: at sign-in (the FE loads `/users/me`) or on any authenticated API call. A listed email that has never signed in has no `public.users` row until its first Google login; it becomes an admin right after that login. Removing an email revokes list-granted access on the user's next request (the FE picks it up on the next profile load).
- The lookup fails closed: if the list query errors, the stored role is used. Unconfirmed emails never match.
- **Adding emails**: `/admin/users` → "Admin access list" → "Add email" (no redeploy). Or SQL: `insert into public.admin_access_emails (email) values ('someone@example.com') on conflict (email) do nothing;` (lowercase).
- **Lockout rules** (server-enforced): you can't remove your own email (400) or the last remaining email (409); admin user-management routes cannot delete or demote the acting admin (400); self-service deletion is available at `/users/me` with active-order and last-admin protection, demote a user whose access comes from the list (409, remove their email first), or delete/demote the last effective admin (409).
- Live list (2026-10-08): `danielcamacho0416@gmail.com`, `ilaurenaubrey@gmail.com`, `sancheztriciap@gmail.com`. Stored-role admins: those three plus `marcgerona19@gmail.com`.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React (via Vite) + TypeScript + Tailwind CSS v3 |
| Backend | NestJS + TypeScript (strict) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth — Google SSO |
| Payments | Cash on Delivery; simulated GCash, Maya, and card confirmation (no gateway or funds transfer) |
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
- `public.admin_access_emails` is **service-role only**: RLS enabled, no policies, all privileges revoked from `anon` and `authenticated`. Only the backend can read or change it (anon REST returns 401 / `42501`).
- New tables need RLS enabled plus explicit policies (or, for backend-only tables, no policies and revoked grants). Schema changes go in `schema.sql` and, for live projects, an idempotent numbered `security-patch-*.sql` / `migration-*.sql` file.

### 9. Rate Limiting and Accepted Risks
- No rate limiting in code: in-memory throttling doesn't work across serverless instances. Use a Vercel Firewall rate-limit rule on `/api/*` (e.g. 100 req/min per IP, stricter on `POST/PATCH/DELETE`).
- `npm audit` (full) in `petko-fe` reports 7 findings (5 high, 2 moderate) in the Tailwind 3 build chain (`tailwindcss`, `chokidar`, `braces`, `micromatch`, `fast-glob`, `postcss-*`). They run only inside `vite build` and never ship; they're devDependencies and `npm audit --omit=dev` is 0 in both apps. Fixing them needs a Tailwind 4 migration (deferred).
- The legacy product CSV is obsolete. The current catalog source snapshots live in `petko-be/data/`; `scripts/seed.js` audits them and `scripts/prepare-catalog.mjs` generates the reviewed SQL seed/rollback. Scripts/data are excluded from Vercel uploads. See `docs/plans/2026-11-12-catalog-variations.md` before reseeding.

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
    └── supabase/          ← schema.sql + security-patch-*.sql / migration-*.sql (apply manually or via Supabase CLI)
```

---

## Deployment (single Vercel project)

One Vercel project at the repo root serves everything from one domain:

- **Frontend**: `petko-fe` is built by Vite into static files at `petko-fe/dist` (the Vercel `outputDirectory`).
- **Backend**: NestJS runs as one Node serverless function, `api/index.js`. It re-exports `petko-be/dist/serverless.js`, which bootstraps the Nest app once per warm instance (Express adapter) and caches it.
- **Routing** (`vercel.json` rewrites, applied after static files): `/api/*` → the function. The Nest global prefix is `api`, so routes are `/api/products`, `/api/users/me`, `/api/health`. Every other path → `/index.html` (SPA routing).
- **Same origin**: the FE calls `/api` relatively, so CORS is off in production (`FRONTEND_URL` unset).
- **Installs**: per app (`npm ci --prefix petko-be`, `npm ci --prefix petko-fe`), with no npm workspaces. Each app keeps its own lockfile.
- **CommonJS runtime deps**: the backend compiles to CommonJS, and Vercel's Node runtime rejects `require(esm)`. `@nestjs/config` is pinned to the CJS 4.x line (`4.0.4`, exact). Do not upgrade it (or add any other runtime dep) to an ESM-only version while the backend compiles to CJS.

### Commands (repo root)

| Command | What it does |
|---|---|
| `npm run install:all` | `npm ci` in `petko-be` and `petko-fe` (Vercel `installCommand`) |
| `npm run build` | `nest build` then `tsc -b && vite build` (Vercel `buildCommand`) |
| `npm run lint` | BE eslint (check only) + FE oxlint |
| `npm test` | BE Jest unit tests (`npm run test:e2e --prefix petko-be` for e2e) |

Local dev: run `npm run start:dev` in `petko-be` (serves `http://localhost:3000/api`) and `npm run dev` in `petko-fe` (`http://localhost:5173`, which proxies `/api` → `:3000`).

Team env setup: link the existing Petko Vercel project from the repo root and run `vercel pull --environment=development`. Both apps load the resulting `.vercel/.env.development.local`; root `.env.local` from `vercel env pull` is also supported. Existing shell/app-local values override shared defaults. Only `VITE_*` values enter the frontend. Development must contain all five names below; Production/Preview values are separate. See README for teammate setup and troubleshooting.

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

1. Apply the SQL files in `petko-be/supabase/` in order (Supabase SQL editor, or `npx --yes supabase@2.120.0 db query --linked --file supabase/<file>.sql` from `petko-be` once the CLI is logged in and linked). All are safe to re-run:
   - `security-patch-001-lock-user-role.sql` (live project: applied 2026-10-07)
   - `migration-002-admin-access-emails.sql` (live project: applied and re-verified 2026-10-08; table, constraints, RLS, no policies, no anon/authenticated grants)
   - `migration-003-order-tracking.sql` (live project: applied and metadata-verified 2026-11-10; additive fields, history, backend-only transactional checkout and tracking functions). Apply before deploying order tracking in other environments. Validate with `verify-order-tracking.sql` in an isolated test database; never use production fixtures.
   - `migration-004-admin-analytics.sql` (additive backend-only traffic tables and aggregation functions). Apply before deploying analytics; validate with `verify-admin-analytics.sql` only in an isolated database. Retain the schema/data on application rollback.
   - `migration-005-tos-acceptance.sql` (adds `users.tos_accepted`, default false, preserving existing profile/role permissions). Apply before deploying terms persistence. Run `verify-tos-acceptance.sql` only in an isolated database; retain the column/agreements when rolling back app code.
   - `migration-006-auto-deactivate-out-of-stock.sql` (adds `trg_product_stock_status` trigger to automatically set `is_active = false` when stock <= 0, and updates existing out-of-stock rows). Apply before deploying out-of-stock auto-deactivation. Validate with `verify-auto-deactivate-out-of-stock.sql` in an isolated database only.
   - `migration-007-product-variations.sql` (SKU, product family, bounded variation attributes, and content fields; applied to production 2026-11-12). Keep each variation as a separate product ID, preserving existing checkout/cart/stock contracts. Run `verify-product-variations.sql` only in an isolated database. Retain additive columns on application rollback. The separate catalog seed is destructive and is not a routine deployment migration.
   - `migration-008-profile-cart-cashless.sql` (nullable anonymized order ownership, atomic self-deletion, protected last-admin mutations, cashless simulation flags and transactional cart consumption). Apply before deploying account/cart/cashless changes. Run `verify-profile-cart-cashless.sql` only in an isolated database. Retain privacy protections and simulated-payment fields on app rollback.
2. `vercel link` at the repo root (Framework Preset: Other, root directory `./`), or import the GitHub repo in the Vercel dashboard with the same settings.
3. Add the five env vars above for Production (and Preview if wanted). Mark `SUPABASE_SERVICE_ROLE_KEY` Sensitive.
4. `vercel deploy --prod`, or push to `main` with the Git integration.
5. In Supabase Auth → URL Configuration, set Site URL to `https://<domain>` and add the redirect URL `https://<domain>/auth/callback`. The Google OAuth redirect URI stays the Supabase callback.
6. Smoke check `https://<domain>/api/health` (200), and `/api/admin-access-emails` and `/api/admin/stats` (401 without a token).

### Live deployment and PR flow

- **Production**: https://petko-rho.vercel.app (Vercel project linked at the repo root; Git integration deploys `main`). Preview deploys are protected by Vercel Authentication; test them with `vercel curl <url>/api/health`.
- **Supabase project ref**: `ghnqtjzguvmzualrrayg`.
- **Flow**: feature branch → PR on GitHub (`DanielHC16/petko`) → Vercel preview check → merge to `main` (merge commit) → production deploy. Never push directly to `main`.
- PR #1/#2 shipped the unified Vercel deploy and the `@nestjs/config` CJS pin. `feat/admin-access-emails` carries the admin access list, the tsconfig fix and the audit fixes.

### Guest browsing and verified product reviews

The storefront `/` and `/products/:id` are public, including search, filters, variations, and visible reviews. Login offers **Browse without an account**. Guests must sign in before cart or purchase actions; no guest cart or automatic mutation is created on return from Google sign-in. Cart, checkout, orders, profile, and admin routes retain their existing guards.

Reviews require a purchased SKU in an owned, noncancelled order with `delivery_confirmed_at` set by the customer. Shipping or admin-reported delivery alone does not qualify. There is one editable review per customer/SKU, with a required integer 1-5 paw rating and optional plain-text comment up to 2,000 characters. Product pages combine sibling reviews using the catalog's exact product-family semantics and label each purchased variant; inactive siblings' historic feedback remains included.

Reviews publish immediately. Owners can edit or withdraw; admins can hide/unhide at `/admin/reviews` but cannot alter ratings/comments. Withdrawal retains a private slot so reposting cannot bypass an admin's hidden decision. Hidden/withdrawn reviews never contribute to public summaries. Account deletion removes authored reviews by cascade. Public review responses exclude private identity and purchase identifiers; owner eligibility and moderation use separate guarded endpoints.

Apply additive `migration-010-guest-browsing-product-reviews.sql` before releasing review consumers; retain review data on application rollback. Run `verify-product-reviews.sql` in an isolated database only. `PRODUCT_REVIEWS_ENABLED=false` temporarily disables review APIs without disabling shopping. See `docs/plans/2026-11-14-guest-browsing-product-reviews.md` for contracts, verification, and handoff.

Review API routes (all under `/api`):

| Route | Access |
|---|---|
| `GET /products/:productId/reviews` | public family list, pagination and rating summary |
| `GET /products/:productId/reviews/me?order_id=<optional UUID>` | authenticated owner eligibility and review |
| `POST /products/:productId/reviews` | authenticated owner; verified purchase, rating/comment and optional expected version |
| `DELETE /reviews/:id?expected_version=N` | authenticated owner; withdraw from public view |
| `GET /reviews/admin` | admin; paginated visibility filter |
| `PATCH /reviews/:id/visibility` | admin; version-checked hide/unhide |

Anonymous analytics accepts only `login`, `catalog`, and `product` pages. Admin exclusion, session identity rotation, and private-page restrictions remain in force.

### API overview (all under `/api`)

| Route | Auth |
|---|---|
| `GET /health` | public |
| `GET /products`, `GET /products/:id` | public |
| `GET /products/admin/all`, `POST /products`, `PATCH /products/:id`, `DELETE /products/:id` | admin |
| `GET /users/me` | any signed-in user (returns the effective role) |
| `PATCH /users/me` | authenticated owner; trimmed `full_name` (1?120), no role/id/email changes |
| `PATCH /users/me/shipping` | authenticated owner; validated `saved_shipping` object or null, saved in Auth metadata |
| `DELETE /users/me` | authenticated owner; blocks active/unconfirmed/unresolved orders and last effective admin; atomically anonymizes history and deletes identity/profile/cart |
| `POST /users/me/tos-acceptance` | any signed-in user; body `{ "tos_accepted": true }`, updates only the authenticated user's acceptance |
| `GET /users`, `PATCH /users/:id/role`, `POST /users/promote`, `DELETE /users/:id` | admin |
| `GET /admin-access-emails`, `POST /admin-access-emails`, `DELETE /admin-access-emails/:id` | admin |
| `GET /admin/stats` | admin (dashboard counts) |
| `GET /admin/analytics?start=YYYY-MM-DD&end=YYYY-MM-DD` | admin (aggregate sales and traffic; inclusive Manila dates, maximum 366 days) |
| `POST /analytics/events` | optional authentication; guests can record login/catalog/product views, identity/role derived by the server |
| `GET /orders`, `GET /orders/:id`, `POST /orders` | signed-in owner (COD or simulated cashless placement) |
| `POST /orders/:id/confirm-receipt`, `POST /orders/:id/delivery-issue` | signed-in owner |
| `GET /orders/admin/all`, `GET /orders/admin/:id` | admin |
| `PATCH /orders/:id/fulfillment`, `POST /orders/:id/resolve-delivery-issue` | admin |

### Order tracking and COD checkout

The `orders` Nest module follows controller → service → repository layering. The repository calls service-role-only PostgreSQL functions `petko_create_order` and `petko_mutate_order`; clients cannot execute them directly. Mutations lock the order and compare `expected_version`, returning 409 for stale screens. Status updates and immutable history events commit together.

`fulfillment_status` progresses `placed` → `processing` → `shipped` → `out_for_delivery` → `delivered`. Delivery stays awaiting confirmation until the order owner confirms receipt; completion is derived from `delivery_confirmed_at`, not another fulfillment status. Admins never confirm another customer's receipt. There is no automatic completion. Nonreceipt reports flag admin review; admin responses clear the flag but never confirm receipt. Admin cancellation is allowed only before shipment and restores reserved stock once. `orders.status` retains its legacy values, with cancellation setting it to `cancelled`.

`POST /orders` accepts a per-checkout UUID, product IDs/quantities, shipping snapshot, delivery method, and `payment_method: 'cod' | 'gcash' | 'maya' | 'card'`. New clients send `checkout_source: 'cart' | 'direct'` (legacy default: direct). Cashless confirmation creates normal fulfillable orders with a server-derived `payment_simulated` flag and no actual payment processing. The transaction validates products, locks stock in stable order, snapshots prices/names/images, calculates shipping, and deduplicates retries. Standard shipping costs PHP 99 (free at subtotal >= PHP 999); express costs PHP 199. Browser prices and totals are never trusted. Cart checkout consumes only purchased quantities inside the order transaction; direct checkout leaves the cart unchanged. Retries cannot consume quantities twice. The browser reloads the owner cart after success and never merges an unowned local cache into another account. Legacy orders receive an imported tracking baseline with no invented milestone dates or delivery address.

See `docs/plans/2026-11-10-order-tracking.md` for the API contract, interview decisions, and rollout/rollback details.

### Admin analytics

Reports default to the last 30 calendar days in `Asia/Manila`; dates are inclusive and use server-side database aggregates, avoiding PostgREST row-limit truncation. Placed merchandise value uses order creation dates; completed sales use customer receipt-confirmation dates, independently of order creation. Cancelled orders are excluded. Simulated payments remain in order counts and placed value, but are excluded from summary/daily completed sales. Shipping is excluded for new orders; imported legacy subtotals retain migration 003's historical fallback and may include shipping. Confirmation is not evidence of COD collection. Buyer cohorts use first-ever noncancelled order dates; top products use purchase-time quantity/price snapshots.

Traffic counts browser sessions and page views, not unique people. Guests can record login, catalog, and product views. Authenticated admins exclude their entire current session, including earlier anonymous views; anonymous admins cannot be identified until sign-in. Capture accepts finite page categories and UUIDs only, with server timestamps and no raw URLs, IP addresses, or email fields. Collection errors never block checkout or navigation. Reports expose aggregate data only and display collection coverage rather than inventing historical visits.

Analytics follows controller/service/repository separation and service-role-only database RPCs. See `docs/plans/2026-11-11-admin-analytics.md` for the contract and rollback. Fixtures must never run against production.

### Terms acceptance

`users.tos_accepted` is a nonnullable boolean defaulting to false. `/users/me` includes it; the authenticated acceptance endpoint only sets the current user's flag to true and is idempotent. Browser database clients cannot update this column or roles; existing display-field permissions remain unchanged. No TOS text/versioning changes are included.

The frontend uses the server profile as the source of truth, prompts when agreement is outstanding, and waits for a successful save before dismissing the first-agreement modal. Footer viewing/closing never saves consent. Old localStorage flags are not imported because the old footer-close callback also marked them accepted; existing users can receive one final prompt. Acceptance requests and UI updates must stay bound to the account that clicked, including during sign-out, account switching, or stale profile refreshes.

### TypeScript config note

`petko-be/tsconfig.json` has no `baseUrl` (deprecated in TS 6, error TS5101, removed in TS 7). `paths` is relative (`"@/*": ["./src/*"]`) and `types` is explicit (`["node", "jest"]`, since TS 6 defaults `types` to `[]`). It typechecks clean under the repo's TS 5.9 and under TS 6 (what VS Code uses). `nest build` still rewrites `@/` imports to relative requires in `dist/`.

### Resolved and remaining issues (2026-10-08)

Resolved: tsconfig `baseUrl` squiggle; editable admin access list with effective admin role; duplicate "Customer View Mode" / "Admin View Mode" banners removed (the Navbar toggle is the only switch); Supabase error messages no longer leak to clients; user delete/demote hardened (no self-lockout, last-admin protection, auth user deleted first); escaped `ilike` and paginated auth lookup for promote-by-email; dashboard counts come from the admin-only `/api/admin/stats` (not anon queries); serverless bootstrap failures (including missing env vars) return the JSON 500 envelope instead of crashing the function; no `any` in FE; oxlint 0 warnings; Tailwind build tools moved to devDependencies.

Remaining: Tailwind 3 build-time audit findings (see Accepted Risks); no rate limiting in code (use Vercel Firewall); FE bundle > 500 kB (Vite warning, code-splitting not done); `admin-products-page.tsx` still calls `api` directly (move its calls into an api module); FE has no unit-test framework (authorization is server-side and unit-tested; UI is checked with Playwright DOM assertions during verification); online payment gateway is not integrated.

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

### `admin_access_emails` table (service-role only)
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key, `gen_random_uuid()` |
| `email` | `text` | Unique, not null, must equal `lower(btrim(email))` and be non-empty |
| `added_by` | `uuid` | FK → `users.id`, `on delete set null`, nullable |
| `created_at` | `timestamptz` | Default `now()` |

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
| `fulfillment_status` | `text` | `placed`, `processing`, `shipped`, `out_for_delivery`, `delivered`, `cancelled` |
| `tracking_version` | `integer` | Incremented atomically for every tracking action |
| `delivery_confirmed_at` | `timestamptz` | Nullable; set only by the order owner |
| `subtotal_amount`, `shipping_fee` | `numeric` | Server-priced amounts |
| `shipping` | `jsonb` | Address/contact snapshot; absent on legacy orders |
| `payment_method`, `delivery_method` | `text` | cod/gcash/maya/card and standard/express; nullable for legacy records |
| `payment_simulated` | `boolean` | Server-derived; cashless orders are excluded from collected/completed sales |
| `courier_name`, `tracking_number` | `text` | Optional admin-provided tracking details |
| `delivery_issue` | `jsonb` | Current nonreceipt report and admin response; history remains in events |
| `checkout_request_id`, `checkout_payload` | `uuid`, `jsonb` | Backend-only retry deduplication |
| `stock_reserved`, `updated_at` | `boolean`, `timestamptz` | Stock restoration guard and latest tracking change |

`order_tracking_events` is backend-only, RLS-protected, and append-only. Each event records the order/version, action, status transition, actor, timestamp, and optional note. Its unique `(order_id, version)` prevents duplicate history.

### `order_items` table
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | |
| `order_id` | `uuid` | FK → `orders.id` |
| `product_id` | `uuid` | FK → `products.id` |
| `quantity` | `integer` | |
| `unit_price` | `numeric` | Snapshot at time of purchase |
| `product_name`, `image_url` | `text` | Item snapshots for new orders; current product fallback for legacy items |

---

## What NOT To Do
- Do not use `any` anywhere — ever
- Do not read secrets from hardcoded strings
- Do not put business logic in controllers (BE) or components (FE)
- Do not put DB queries in services (BE) or query hooks (FE)
- Do not duplicate code across features — extract shared logic
- Do not generate incomplete or stubbed code blocks unless explicitly scaffolding
