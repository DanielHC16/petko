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

---

## Project Directory Layout

```
petko/
├── CLAUDE.md              ← This file (global context)
├── STANDARDS-fe.md        ← Frontend standards & patterns
├── STANDARDS-be.md        ← Backend standards & patterns
├── petko-fe/              ← React + Vite frontend
└── petko-be/              ← NestJS backend
```

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
