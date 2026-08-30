# Petko

A full-stack e-commerce platform for pet supplies.

## Tech Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Backend**: NestJS, TypeScript
- **Database & Auth**: Supabase (PostgreSQL, Google SSO)

## Project Structure

```
petko/
├── petko-be/   # NestJS Backend API
└── petko-fe/   # React + Vite Frontend
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
   Runs on `http://localhost:3000`.

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
   Runs on `http://localhost:5173`.
