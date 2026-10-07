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

### 1. Backend (`petko-be`)

1. Navigate to the backend directory:
   ```bash
   cd petko-be
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Fill in the required Supabase values in `.env`.

4. Start the development server:
   ```bash
   npm run start:dev
   ```
   Runs on `http://localhost:3000/api` (health check: `GET /api/health`).

---

### 2. Frontend (`petko-fe`)

1. Navigate to the frontend directory:
   ```bash
   cd petko-fe
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in the required values in `.env.local`.

4. Start the development server:
   ```bash
   npm run dev
   ```
   Runs on `http://localhost:5173`. API calls go to same-origin `/api`, which the Vite dev server proxies to the backend on port 3000.

---

### Root scripts

From the repo root (the same commands Vercel runs):

```bash
npm run install:all   # npm ci in petko-be and petko-fe
npm run build         # nest build + vite build
npm run lint          # backend eslint + frontend oxlint
npm test              # backend unit tests
```

## Deploy to Vercel

The whole app deploys as one Vercel project from the repo root: the frontend is served as static files and the NestJS API runs as a single serverless function under `/api`. See "Deployment" in [`context/CLAUDE.md`](context/CLAUDE.md) for env vars and steps. Before the first production deploy, apply `petko-be/supabase/security-patch-001-lock-user-role.sql` in the Supabase SQL editor.
