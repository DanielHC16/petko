# Petko

A full-stack e-commerce platform for pet supplies.

## Tech Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Backend**: NestJS, TypeScript
- **Database & Auth**: Supabase (PostgreSQL, Google SSO)

## Project Structure

```
petko/
├── api/index.js   # Vercel function entry → petko-be/dist/serverless.js
├── vercel.json    # Single Vercel project config (static FE + /api function)
├── package.json   # Root orchestration scripts only (no dependencies)
├── petko-be/      # NestJS Backend API (served under /api)
└── petko-fe/      # React + Vite Frontend
```

## Getting Started

Use Node.js 22 and install the [Vercel CLI](https://vercel.com/docs/cli). Your Vercel account needs access to the team's existing **Petko** project. From the repository root:

```bash
npm run install:all
vercel login
vercel link
vercel pull --environment=development
```

When linking, select the existing Petko project in the team's Vercel scope; do not create a new project. After the first setup, rerun only `vercel pull --environment=development` to refresh keys.

Start the apps in separate terminals, both from the repository root:

```bash
npm run start:dev --prefix petko-be
npm run dev --prefix petko-fe
```

The backend runs at `http://localhost:3000/api` (health check: `/api/health`); the frontend runs at `http://localhost:5173` and proxies `/api` to the backend. Both apps load the shared `.vercel/.env.development.local` created by `vercel pull`. The frontend imports only public `VITE_*` variables; `SUPABASE_SERVICE_ROLE_KEY` stays backend-only.

Alternatively, `vercel env pull .env.local --environment=development` at the repository root is also supported. Existing shell variables take precedence. Backend `petko-be/.env` and frontend `petko-fe/.env*` values override shared defaults, so remove stale or placeholder values from those files if a refreshed pull appears to have no effect. Restart both dev servers after pulling changes.

Without Vercel access, copy `petko-be/.env.example` to `petko-be/.env` and `petko-fe/.env.example` to `petko-fe/.env.local`, then obtain the real development values from a project administrator. Placeholder examples cannot connect to Supabase. Never commit downloaded env files.

### Shared Development environment (project administrators)

In Vercel → Petko → Settings → Environment Variables, configure these five names for **Development**:

| Variable | Used by |
|---|---|
| `SUPABASE_URL` | Backend |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend only; grants privileged database access |
| `SUPABASE_ANON_KEY` | Backend authentication |
| `VITE_SUPABASE_URL` | Frontend (public) |
| `VITE_SUPABASE_ANON_KEY` | Frontend (public) |

Use a development Supabase project when available. The frontend URL/anon key must match the backend's project. Production and Preview settings are separate from Development; setting a variable only for Production does not make it available to a development pull. Teammates need project access to download these values. Leave `NODE_ENV`, `PORT`, `FRONTEND_URL`, and `VITE_API_URL` unset for the default local proxy setup.

If Nest reports `"SUPABASE_URL" is required` (or either key is required), it has not received usable backend variables. Confirm the pull succeeded for Development, all five names exist in that environment, and no stale app-local overrides remain. See [Vercel pull](https://vercel.com/docs/cli/pull) and [environment variables](https://vercel.com/docs/environment-variables).

### Root scripts

From the repo root (the same commands Vercel runs):

```bash
npm run install:all   # npm ci in petko-be and petko-fe
npm run build         # nest build + vite build
npm run lint          # backend eslint + frontend oxlint
npm test              # backend unit tests
```

## Repository agents and skills

The portable Codex kit from `C:/Users/Hardy/ObsidianVaults/Atom/codex-agent-kit` is included in this repository. Open a new Codex session from the repository root in a trusted folder to discover the seven agents in `.codex/agents/` and seven skills in `.agents/skills/`.

Use `debugger` for failures, `reviewer` for a read-only review, and `devops-engineer` for deployment work. Project instructions live in `AGENTS.md` and `context/`; they take precedence over generic examples in the kit. Local agent reports in `.agents/tasks/` stay ignored.

To refresh from the original Atom kit without overwriting repository-owned files:

```powershell
node C:/Users/Hardy/ObsidianVaults/Atom/codex-agent-kit/install.mjs .
```

## Orders and tracking

Checkout creates real Cash on Delivery orders, reserves stock, and saves item prices and the delivery address. Online payments remain unavailable until a payment gateway is integrated. Standard delivery costs PHP 99 (free for an item subtotal of PHP 999 or more); express delivery costs PHP 199.

Customers track their orders at `/orders`. Admins manage progress at `/admin/orders`: Placed → Processing → Shipped → Out for delivery → Delivered. An admin delivery report stays awaiting confirmation until the customer who placed the order confirms receipt. There is no automatic completion. Customers can report a delivery as not received with a message; admins can respond, but only the customer can confirm receipt. Admins can cancel before shipment, restoring reserved stock once.

Apply [migration-003-order-tracking.sql](petko-be/supabase/migration-003-order-tracking.sql) before deploying this feature. It adds fulfillment fields, immutable history, and backend-only transactional functions while preserving legacy order status and ownership read policies. Existing orders have an imported baseline; earlier milestone dates and missing addresses are not fabricated. Keep the additive database changes when rolling back application code.

Run [verify-order-tracking.sql](petko-be/supabase/verify-order-tracking.sql) in an isolated test database after applying the migration twice. The fixture rolls back its data and checks stock, retries, ownership, transitions, confirmation, and transaction rollback. Unit and HTTP tests use dummy Supabase values and do not connect to a live project:

```bash
npm run lint
npm test -- --runInBand
npm run test:e2e --prefix petko-be -- --runInBand
npm run build
```

The architecture and agreed behavior are recorded in [the implementation plan](docs/plans/2026-11-10-order-tracking.md).

## Terms acceptance

TOS agreement is stored on the signed-in user's database profile as `tos_accepted`. Explicitly agreeing saves it through `POST /api/users/me/tos-acceptance`; subsequent logins and other devices read the saved value from `/api/users/me`. Closing the footer's terms viewer does not record acceptance. Failed saves leave the agreement open for retry.

Apply [migration-005-tos-acceptance.sql](petko-be/supabase/migration-005-tos-acceptance.sql) before deploying. Existing accounts default to false and may receive one final prompt: old browser flags cannot establish agreement because the previous footer-close behavior also set them. Run `verify-tos-acceptance.sql` only in an isolated database. On application rollback, retain the additive column and saved agreements.

## Admin analytics

Admins can open `/admin/analytics` from the dashboard to view placed order value, completed sales, buyers, visits, daily trends, and top products. Reports default to the last 30 calendar days in Philippine time, with 7/30/90-day presets and custom dates up to 366 days.

Placed value uses order creation dates; completed sales use customer receipt-confirmation dates. Both exclude cancelled orders and use merchandise subtotals, excluding shipping for new checkout orders. Imported legacy subtotals retain their historical fallback and may include shipping. Receipt confirmation does not establish that COD cash was collected. New and returning buyers are classified by their first noncancelled order.

Visits count browser sessions, not unique people. Guests contribute login-page views; authenticated customers contribute storefront views. Admin sessions are excluded once identified, including an earlier guest login view in the same session. Unidentified guests cannot be recognized as admins. No raw URLs, email addresses, or IP addresses are collected by analytics, and no individual browsing history is exposed in reports. Traffic is approximate and begins at collection launch; historical traffic is unavailable.

Apply [migration-004-admin-analytics.sql](petko-be/supabase/migration-004-admin-analytics.sql) before deploying analytics. Its tables and functions are backend-only with RLS and revoked client privileges. Run [verify-admin-analytics.sql](petko-be/supabase/verify-admin-analytics.sql) only in an isolated test database after applying the migration twice. Retain the additive schema/data when rolling back the application. See [the analytics plan](docs/plans/2026-11-11-admin-analytics.md) for contracts and verification.

## Deploy to Vercel

The whole app deploys as one Vercel project from the repo root: the frontend is served as static files and the NestJS API runs as a single serverless function under `/api`. See "Deployment" in [`context/CLAUDE.md`](context/CLAUDE.md) for env vars and steps. Before deploying, apply these in the Supabase SQL editor, in order (all are safe to re-run):

1. `petko-be/supabase/security-patch-001-lock-user-role.sql`
2. `petko-be/supabase/migration-002-admin-access-emails.sql`
3. `petko-be/supabase/migration-003-order-tracking.sql`
4. `petko-be/supabase/migration-004-admin-analytics.sql`
5. `petko-be/supabase/migration-005-tos-acceptance.sql`

## Admin access

Admins can switch between the storefront and the admin panel with the Storefront / Admin Panel toggle in the navbar. A user is an admin if their stored role is `admin` or their confirmed email is in the admin access list. Manage the list at `/admin/users` → "Admin access list". A listed email gets admin access on its first sign-in. Details are in [`context/CLAUDE.md`](context/CLAUDE.md#admin-access-effective-admin-role).
