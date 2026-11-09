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

Checkout and order history currently contain UI previews. Checkout does not persist orders or process payments; backend integration is still required.

## Deploy to Vercel

The whole app deploys as one Vercel project from the repo root: the frontend is served as static files and the NestJS API runs as a single serverless function under `/api`. See "Deployment" in [`context/CLAUDE.md`](context/CLAUDE.md) for env vars and steps. Before the first production deploy, apply these in the Supabase SQL editor, in order (both are safe to re-run):

1. `petko-be/supabase/security-patch-001-lock-user-role.sql`
2. `petko-be/supabase/migration-002-admin-access-emails.sql`

## Admin access

Admins can switch between the storefront and the admin panel with the Storefront / Admin Panel toggle in the navbar. A user is an admin if their stored role is `admin` or their confirmed email is in the admin access list. Manage the list at `/admin/users` → "Admin access list". A listed email gets admin access on its first sign-in. Details are in [`context/CLAUDE.md`](context/CLAUDE.md#admin-access-effective-admin-role).
