# STANDARDS-be.md — Petko Backend Standards (NestJS + Supabase)

> **Always read `CLAUDE.md` before reading this file.**
> This document governs all backend code in `petko-be/`.

---

## Stack

| Tool | Purpose |
|---|---|
| NestJS + TypeScript (strict) | REST API framework |
| Supabase JS SDK (`@supabase/supabase-js`) | Database queries (via service role) |
| Supabase Auth | JWT verification — `anon` key for user JWTs |
| `class-validator` + `class-transformer` | DTO validation |
| `@nestjs/config` | Environment variable management. Pinned to CJS `4.0.4` because Vercel's runtime rejects `require(esm)`; do not upgrade to ESM-only versions while the backend compiles to CJS |
| Joi | Env schema validation at startup |
| Jest | Unit testing |

> **No TypeORM.** Database access goes through the Supabase JS client using the service role key. Schema lives in `supabase/schema.sql`. Changes to live projects ship as idempotent SQL files (`security-patch-NNN-*.sql` for access-control fixes, `migration-NNN-*.sql` for schema additions), applied in the Supabase SQL editor or with `npx --yes supabase@2.120.0 db query --linked --file supabase/<file>.sql`. Each file has a WHAT / WHY / HOW TO APPLY header and must be safe to re-run.

---

## Project Structure

```
petko-be/
├── .env                          # Environment variables (never commit)
├── .env.example                  # Placeholder committed to repo
├── supabase/
│   ├── schema.sql                # Full schema + RLS (run manually in Supabase)
│   ├── security-patch-*.sql      # Numbered access-control patches for live projects
│   └── migration-*.sql           # Numbered, idempotent schema migrations (e.g. 002 admin access emails)
├── src/
│   ├── bootstrap.ts              # configureApp() + createApp() — prefix, pipes, filters, interceptors, CORS
│   ├── main.ts                   # Local server: createApp() + listen(PORT)
│   ├── serverless.ts             # Vercel handler: cached createApp() + init()
│   ├── app.module.ts             # Root module — imports all feature + core modules
│   ├── app.controller.ts         # GET /api/health (no DB access)
│   ├── config/
│   │   └── env.validation.ts     # Joi schema — validates all env vars at startup
│   ├── common/
│   │   ├── constants/
│   │   │   └── admin-access.constants.ts  # ADMIN_ACCESS_EMAILS_TABLE
│   │   ├── utils/
│   │   │   └── email.util.ts     # normalizeEmail(), escapeLikePattern()
│   │   ├── testing/
│   │   │   └── supabase-query.mock.ts  # Chainable Supabase query mock for specs
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts
│   │   │   └── current-user.decorator.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── guards/
│   │   │   ├── auth.guard.ts     # Verifies Supabase JWT, attaches profile with the effective role
│   │   │   └── roles.guard.ts    # Checks request.user.role against @Roles()
│   │   ├── interceptors/
│   │   │   └── response.interceptor.ts
│   │   └── types/
│   │       ├── authenticated-request.type.ts
│   │       └── api-response.type.ts
│   ├── supabase/
│   │   └── supabase.module.ts    # Provides SupabaseService globally
│   │   └── supabase.service.ts   # Supabase admin client (service role)
│   └── modules/
│       ├── admin-access-emails/  # Admin-only CRUD for public.admin_access_emails (service exported)
│       │   ├── admin-access-emails.module.ts
│       │   ├── admin-access-emails.controller.ts
│       │   ├── admin-access-emails.service.ts
│       │   └── dto/
│       │       └── create-admin-access-email.dto.ts
│       ├── admin-stats/          # GET /api/admin/stats (imports Users, Products, AdminAccessEmails)
│       │   ├── admin-stats.module.ts
│       │   ├── admin-stats.controller.ts
│       │   └── admin-stats.service.ts
│       ├── users/
│       │   ├── users.module.ts
│       │   ├── users.controller.ts
│       │   ├── users.service.ts
│       │   └── dto/
│       │       └── update-user.dto.ts
│       ├── products/
│       │   ├── products.module.ts
│       │   ├── products.controller.ts
│       │   ├── products.service.ts
│       │   └── dto/
│       │       ├── create-product.dto.ts
│       │       └── update-product.dto.ts
│       ├── cart/
│       │   ├── cart.module.ts
│       │   ├── cart.controller.ts
│       │   ├── cart.service.ts
│       │   └── dto/
│       │       └── upsert-cart-item.dto.ts
│       ├── orders/
│       │   ├── orders.module.ts
│       │   ├── orders.controller.ts
│       │   ├── orders.service.ts
│       │   └── dto/
│       │       └── create-order.dto.ts
│       └── checkout/
│           ├── checkout.module.ts
│           ├── checkout.controller.ts
│           └── checkout.service.ts   # Scaffolded — gateway TBA
└── test/
    ├── setup-env.ts              # Jest setupFiles — dummy env, VERCEL=1 (no .env read)
    └── app.e2e-spec.ts
```

---

## Environment Variables

Create `petko-be/.env` (never commit):

```env
# .env — Petko Backend
# Copy from .env.example and fill in your values

NODE_ENV=development
PORT=3000

# Supabase — get these from your Supabase project settings
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here

# OPTIONAL — CORS for a cross-origin frontend only.
# Not needed with the Vite dev proxy or on Vercel (same origin).
# FRONTEND_URL=http://localhost:5173
```

`petko-be/.env.example` (committed) has the same keys with placeholder values.

Rules:
- Validation lives in `src/config/env.validation.ts` (Joi). Required: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`. Optional: `FRONTEND_URL`. Defaulted: `NODE_ENV`, `PORT`.
- `ConfigModule.forRoot({ ignoreEnvFile: Boolean(process.env.VERCEL) })`: on Vercel only project env vars are used. A `.env` file is never read in production.
- On Vercel, set only the three `SUPABASE_*` vars. Do not set `NODE_ENV`, `PORT` or `FRONTEND_URL`.

---

## Supabase Key Usage

| Key | Use case | Risk if leaked |
|---|---|---|
| **Anon key** | Verify user JWTs sent from the frontend | Low — public by design |
| **Service role key** | All DB read/write from the backend | **CRITICAL** — bypasses RLS |

**Rules:**
- The **service role key** lives only in `petko-be/.env` locally and as a Sensitive Vercel env var in production — never sent to the frontend, never logged
- The **anon key** is used only for JWT verification with `supabase.auth.getUser(token)`
- All Supabase DB operations go through the **service role client** (`SupabaseService`) inside NestJS services only

---

## Supabase Module & Service

### `src/supabase/supabase.service.ts`

```ts
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SupabaseService {
  private readonly adminClient: SupabaseClient
  private readonly anonClient: SupabaseClient

  constructor(private readonly config: ConfigService) {
    this.adminClient = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY')
    )
    this.anonClient = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_ANON_KEY')
    )
  }

  /** Use for all DB operations. Bypasses RLS — handle access control via guards. */
  get admin(): SupabaseClient {
    return this.adminClient
  }

  /** Use only for verifying user JWTs. */
  get anon(): SupabaseClient {
    return this.anonClient
  }
}
```

### `src/supabase/supabase.module.ts`

```ts
import { Global, Module } from '@nestjs/common'
import { SupabaseService } from './supabase.service'

@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
```

Import `SupabaseModule` once in `app.module.ts`. Because it is `@Global()`, all feature modules get `SupabaseService` without re-importing.

---

## Authentication Guard

The `AuthGuard` (`src/common/guards/auth.guard.ts`) validates the Bearer JWT sent from the frontend (issued by Supabase after Google SSO) and attaches the profile to `request.user` with the **effective role**:

1. Missing/malformed `Authorization` header or an invalid token (`anon.auth.getUser(token)`) → `401`.
2. In parallel: load the `public.users` profile (`id, email, full_name, avatar_url, role`; missing → `401`), and look up the verified auth email (`normalizeEmail(user.email)`) in `ADMIN_ACCESS_EMAILS_TABLE`. The lookup only runs when `user.email_confirmed_at` is set.
3. If the email is listed, `request.user = { ...profile, role: 'admin' }`. The effective role is never written back to `users.role`.
4. **Fail closed**: if the list lookup errors, log a warning and keep the stored role. Never grant, never 500.

`RolesGuard` only reads `request.user.role`, so every `@Roles('admin')` route honors the list. `UsersService` uses the same rule (`findAll` returns the effective role plus `admin_access_listed`; last-admin checks count effective admins). Unit tests mock `SupabaseService` (see `auth.guard.spec.ts`).

### `src/common/types/authenticated-request.type.ts`

```ts
import { Request } from 'express'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url: string
  role: 'admin' | 'customer'
}

export interface AuthenticatedRequest extends Request {
  user: UserProfile
}
```

---

## RBAC — Roles Guard

### `src/common/decorators/roles.decorator.ts`

```ts
import { SetMetadata } from '@nestjs/common'

export type Role = 'admin' | 'customer'
export const ROLES_KEY = 'roles'
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)
```

### `src/common/guards/roles.guard.ts`

```ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY, Role } from '@/common/decorators/roles.decorator'
import { AuthenticatedRequest } from '@/common/types/authenticated-request.type'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const userRole = request.user?.role

    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException('You do not have permission to access this resource')
    }

    return true
  }
}
```

### Usage on a Controller

```ts
@Controller('admin/products')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminProductsController {
  // All routes here require admin role
}
```

---

## Current User Decorator

### `src/common/decorators/current-user.decorator.ts`

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { AuthenticatedRequest, UserProfile } from '@/common/types/authenticated-request.type'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserProfile => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
    return request.user
  }
)
```

Usage:

```ts
@Get('me')
@UseGuards(AuthGuard)
getMe(@CurrentUser() user: UserProfile) {
  return user
}
```

---

## API Response Format

All endpoints return a consistent envelope. The response interceptor wraps success responses automatically.

**Success:**
```json
{ "success": true, "data": {}, "message": "optional" }
```

**Paginated:**
```json
{
  "success": true,
  "data": [],
  "meta": {
    "total": 50, "page": 1, "limit": 10,
    "totalPages": 5, "hasPreviousPage": false, "hasNextPage": true
  },
  "message": "optional"
}
```

**Error:**
```json
{ "success": false, "statusCode": 400, "message": "...", "errors": [] }
```

### `src/common/interceptors/response.interceptor.ts`

```ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable, map } from 'rxjs'

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data: data ?? null,
        message: '',
      }))
    )
  }
}
```

### `src/common/filters/http-exception.filter.ts`

```ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error'

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null

    const errors =
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse &&
      Array.isArray((exceptionResponse as Record<string, unknown>).message)
        ? (exceptionResponse as Record<string, unknown[]>).message
        : []

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
    })
  }
}
```

---

## Bootstrap (`bootstrap.ts`, `main.ts`, `serverless.ts`)

The app runs in two hosts, and both share one setup function:

- **`src/bootstrap.ts`**
  - `configureApp(app)`: global prefix `api` (`API_PREFIX`), `x-powered-by` disabled, CORS only when `FRONTEND_URL` is set (`credentials: false`, since auth is a Bearer header), `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`, `HttpExceptionFilter`, `ResponseInterceptor`.
  - `createApp()`: `NestFactory.create(AppModule, new ExpressAdapter(), { abortOnError: false })` + `configureApp`. `abortOnError: false` makes init errors reject instead of exiting the process.
- **`src/main.ts`** (local / `npm run start:dev`): `createApp()` + `listen(PORT)`, serving `http://localhost:3000/api`.
- **`src/serverless.ts`** (Vercel): default-exported `(req, res)` handler. It requires `./bootstrap` **lazily** on the first request (importing `AppModule` starts env validation, which would otherwise crash the function at load time), caches the `createApp()` + `init()` promise in module scope (once per warm instance), clears the cache if bootstrap fails, and forwards to the Express instance. On a bootstrap failure it logs the stack and answers with the standard JSON envelope `{ success: false, statusCode: 500, message: 'Internal server error', errors: [] }` (no details leaked). The repo-root `api/index.js` re-exports `petko-be/dist/serverless.js`, so it must be built by `nest build` first.

```ts
// src/main.ts
import { ConfigService } from '@nestjs/config'
import { API_PREFIX, createApp } from './bootstrap'

async function bootstrap(): Promise<void> {
  const app = await createApp()
  const config = app.get(ConfigService)

  const port = config.get<number>('PORT') ?? 3000
  await app.listen(port)
  console.log(`🐾 Petko API running on http://localhost:${port}/${API_PREFIX}`)
}

void bootstrap()
```

Rules:
- Add new global middleware, pipes, filters, interceptors and CORS changes in `configureApp` only, so local and serverless never diverge.
- Every route is under `/api`. Controllers declare paths without the prefix (`@Controller('products')` → `/api/products`).
- `GET /api/health` returns `{ status: 'ok' }` with no DB access. Use it for smoke checks.
- Static admin routes on a controller with `:id` params must be declared before `@Get(':id')` (e.g. `GET /products/admin/all`). UUID route params use `ParseUUIDPipe`.
- Never interpolate raw user input into PostgREST filter strings (`.or(...)`). Whitelist enum values and strip reserved characters (see `ProductsService`).

---

## Module Structure Rules

Every feature module follows this structure:

```
src/modules/<name>/
├── <name>.module.ts
├── <name>.controller.ts
├── <name>.service.ts
└── dto/
    ├── create-<name>.dto.ts
    └── update-<name>.dto.ts
```

- Register every module in `app.module.ts`
- Use constructor-based DI with `readonly` dependencies
- DTOs must use `class-validator` decorators on every field
- **Controllers** handle HTTP routing only — no business logic
- **Services** hold business logic and call `SupabaseService` for DB access
- Never query Supabase from a controller directly

---

## DTO Validation Example

```ts
import { IsString, IsNumber, IsEnum, IsBoolean, Min, IsOptional } from 'class-validator'

export enum PetType {
  CAT = 'cat',
  DOG = 'dog',
  BOTH = 'both',
}

export class CreateProductDto {
  @IsString()
  name: string

  @IsString()
  description: string

  @IsNumber()
  @Min(0)
  price: number

  @IsNumber()
  @Min(0)
  stock: number

  @IsString()
  category: string

  @IsEnum(PetType)
  pet_type: PetType

  @IsString()
  @IsOptional()
  image_url?: string

  @IsBoolean()
  @IsOptional()
  is_active?: boolean
}
```

---

## Error Handling Rules

- Throw NestJS built-in exceptions only — never raw `Error`
- Common exceptions: `NotFoundException`, `BadRequestException`, `ForbiddenException`, `UnauthorizedException`, `ConflictException`
- The global `HttpExceptionFilter` formats all errors into the standard envelope
- **Never return a Supabase/Postgres `error.message` to the client.** Log `error.code` + `error.message` with the service's Nest `Logger`, then throw a user-safe message that says what failed. Validation (class-validator) messages are returned as-is.
- supabase-js **returns** `{ error }` and does not throw (including `auth.admin.*`). Always check `error`; a try/catch alone never fires.
- Map known Postgres codes where useful (e.g. `23505` unique violation → `ConflictException`, `PGRST116` no row → `NotFoundException`).
- Match emails literally: `normalizeEmail()` before storing or comparing, and `escapeLikePattern()` before any `ilike`.

```ts
// Example in a service
private readonly logger = new Logger(ProductsService.name)

const { data, error } = await this.supabase.admin
  .from('products')
  .insert(dto)
  .select()
  .single()

if (error || !data) {
  this.logger.error(`Product create failed: ${error?.code} ${error?.message}`)
  throw new BadRequestException(
    'Could not create the product. Check the fields and try again.',
  )
}
```

---

## Layering Rules

- **Controllers** → receive HTTP, validate with DTO, call service, return data
- **Services** → orchestrate business logic, call `SupabaseService` for DB, throw typed exceptions
- **SupabaseService** → single shared Supabase admin client; injected via DI
- Never call Supabase from a controller
- Never put routing logic in a service

---

## File Naming Conventions

- **kebab-case** for all files and folders
- NestJS suffixes: `.module.ts`, `.controller.ts`, `.service.ts`, `.guard.ts`, `.interceptor.ts`, `.filter.ts`, `.decorator.ts`, `.dto.ts`
- Classes: **PascalCase** | Methods/vars: **camelCase** | DB columns: **snake_case** | Constants: **UPPER_SNAKE_CASE**

---

## Code Style

- TypeScript strict mode — never `any`
- `async/await` only — never `.then()`
- Explicit return types on all service and controller methods
- `readonly` on all injected constructor dependencies

---

## Testing

- Unit tests are **co-located** as `<name>.spec.ts` next to the source file
- Every service and controller must have a `.spec.ts`
- Mock `SupabaseService` in all unit tests — no real network calls
- Use `@nestjs/testing` + `Test.createTestingModule()`
- E2E tests go in `test/` at project root (only exception to co-location)
- Both Jest configs load `test/setup-env.ts` (dummy Supabase vars, `VERCEL=1`), so tests never read the real `.env`.
- `src/bootstrap.spec.ts` boots the real app via `createApp()` and checks the `/api` prefix, 401s on guarded routes, and the error envelope. Extend it when adding global setup.
- Lint: `npx eslint "{src,test}/**/*.ts"` must exit 0. Prettier is configured with `"semi": false`.
- Use `common/testing/supabase-query.mock.ts` for chainable Supabase query mocks instead of hand-rolling one per spec.
- Typecheck: `npx tsc --noEmit -p tsconfig.json` must exit 0 under the repo TypeScript (5.9) and TS 6 (`node ../petko-fe/node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`).

## TypeScript Config

`tsconfig.json` has **no `baseUrl`** (deprecated in TS 6 as TS5101, removed in TS 7). `paths` entries are relative to the tsconfig (`"@/*": ["./src/*"]`), and `types` is explicit (`["node", "jest"]`) because TS 6 defaults it to `[]`. `nest build` rewrites `@/` imports to relative requires in `dist/`, and Jest maps `@/` with `moduleNameMapper`. Don't reintroduce `baseUrl` or `ignoreDeprecations`.

---

## Shared FE ↔ BE Conventions

- **Identical response envelope** — FE `lib/api-types.ts` mirrors BE interceptor output
- **Pagination contract**: `page`, `limit`, `sortBy`, `sortOrder` query params in; `meta` object out
- **Feature-first**: BE `modules/<feature>/`, FE `features/<feature>/`
- **kebab-case** filenames everywhere, **PascalCase** classes/components, **camelCase** vars
