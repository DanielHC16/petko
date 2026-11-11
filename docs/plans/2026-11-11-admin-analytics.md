# Admin analytics: design and implementation plan

Date: 2026-11-11. Status: interview complete; implementation authorized, including reviewed PR, merge commit to main, and production deployment.

## Goal and accepted behavior

Give admins a truthful view of customer buying and visits. The user confirmed everyone, including guests, counts toward traffic, and both placed order value and completed sales must be shown. Admin traffic is excluded. The existing login requirement stays unchanged: guest traffic means the login page, not a newly public catalog.

Safe v1 defaults: `/admin/analytics`, matching the existing UI, default last 30 calendar days including today in `Asia/Manila`; 7/30/90-day presets and inclusive custom dates up to 366 days. Show browser sessions, page views, buyers, new/returning buyers, daily trends, and top products. No customer browsing history UI or conversion rate. Historical buying data is usable; visits begin with collection and are never backfilled.

Financial definitions: exclude orders whose legacy status **or** fulfillment status is cancelled. Placed value is `subtotal_amount` by order creation date; completed sales are `subtotal_amount` by `delivery_confirmed_at`. Both exclude shipping and are labelled merchandise value. Receipt confirmation is not evidence of collected COD cash. Include all actual purchases, including an admin's legitimate purchase: the exclusion agreed in the interview concerns traffic. Imported legacy subtotals retain their existing migration meaning; don't invent payment or confirmation dates.

## Existing precedent

- Effective admin authentication is centralized in `petko-be/src/common/guards/auth.guard.ts:37`; verified/confirmed access-list email handling is at line 74. Reuse it; never trust a role from telemetry JSON.
- Admin route authorization pattern: `petko-be/src/modules/admin-stats/admin-stats.controller.ts:8`. Preserve `/admin/stats` and its counts.
- Feature registration: `petko-be/src/app.module.ts:14`. The orders repository already calls service-only RPCs at `petko-be/src/modules/orders/orders.repository.ts:78`.
- Migration 003 provides subtotal and confirmation fields (`petko-be/supabase/migration-003-order-tracking.sql:10`, line 18), item snapshots (line 50), and the revoke/grant precedent (lines 72 and 162).
- Protected storefront and lazy admin route pattern: `petko-fe/src/App.tsx:46` and line 60. Auth becomes ready after profile lookup in `petko-fe/src/main.tsx:19`.
- The shared API redirects on 401 (`petko-fe/src/lib/axios.ts:21`), which is unsuitable for best-effort telemetry. Reports can use it; capture must not trigger navigation.
- Existing dashboard management cards start at `petko-fe/src/features/admin/admin-dashboard-page.tsx:194`. Add a discovery card/link there; no navigation redesign is needed.

## Options and recommendation

1. Fetch orders/events into Nest and aggregate: least SQL, but risks PostgREST row caps and expensive transfers; reject.
2. Backend-only session/event tables and service-only PostgreSQL RPCs for atomic ingestion and one JSON report: small additive migration, complete aggregates, no dependencies. **Choose this.**
3. External analytics service: extra configuration, cost, deployment coupling and split purchase/traffic semantics. Unnecessary for v1.

## Contracts

### Capture

`POST /api/analytics/events`, optional Bearer authentication, 202 with `{ accepted: boolean }` in the existing envelope. Strict DTO: `session_id` UUID, `event_id` UUID, `page` enum `login | catalog | product | cart | checkout | orders | identify`. No client user ID, role, timestamp, amount, path, query string, referrer, IP, user agent, or email fields. Requests with unrecognized fields fail validation. Retain the existing bounded JSON parser; no arbitrary-size arrays/batches.

No Authorization header means anonymous; only `login` is accepted. An Authorization header, even malformed/expired, must delegate to the existing `AuthGuard` and fail 401 rather than silently become a guest. Implement an analytics-local optional guard that injects/delegates `AuthGuard`; register it and `AuthGuard` in the analytics module, without changing existing authentication behavior. Signed-in customers may submit the storefront pages or `identify`; `identify` never increments a page view. An authenticated admin call performs exclusion/identity handling and returns accepted false, with no page view. Do not suppress the identity call solely because the current route is admin/callback.

The service calls an atomic RPC `petko_record_analytics_event(p_session_id uuid, p_event_id uuid, p_page text, p_actor_id uuid, p_is_admin boolean)`; actor ID/admin flag are derived exclusively from server authentication. Backend-only execution is mandatory. Timestamp ingestion with database time. Lock/update the session atomically, enforce unique event IDs, and keep exclusion sticky. A duplicate event cannot be changed into a different session/page. An anonymous call cannot clear/change an authenticated identity or exclusion. A different signed-in user cannot take over an already identified session; return a safe conflict and let the browser rotate. Known admins exclude the entire current session, including the earlier anonymous login event, even when auth and page events arrive concurrently.

Frontend session state lives in sessionStorage with a random UUID and last activity time; rotate after 30 minutes of inactivity and on change between identified users/sign-out. Keep the anonymous session across the OAuth redirect so identity can remove an admin's earlier login view. Identification must finish before a session is discarded on sign-out. Storage failures fall back to in-memory session state. Sessions are browser sessions, not unique people or cross-device tracking. React StrictMode must not double-send a navigation event: maintain stable event IDs/dedupe outside the remounted effect. Reloads and genuine later navigations may add views. Send at most one bounded retry with the same event ID; no queue of unlimited failed events.

Mount a tiny observer inside BrowserRouter, outside protected routes. Wait for auth loading to resolve. Capture only exact allowed routes, mapping product UUID paths to `product`; never transmit the actual URL or ID. A guest only records `/login`; redirects from protected routes do not count an extra visit. `/auth/callback`, admin routes, previews, and unknown paths do not record views, but an existing session is identified after auth resolves on any route. Capture uses a dedicated fetch function with the existing API base setting and the current session token, bypassing the shared response redirect interceptor. Capture errors must not affect browsing, auth, cart, checkout, or produce toasts.

Admin exclusion is best effort before identity is known: an administrator browsing anonymously cannot be distinguished from any other guest. Explain this limitation in the plan/PR; do not build fingerprinting. Validate/dedupe payloads, but public telemetry can still be spoofed and is approximate traffic, not accounting. Follow repository policy: no in-memory rate limiter; Vercel Firewall is the existing operational control.

### Report

`GET /api/admin/analytics?start=YYYY-MM-DD&end=YYYY-MM-DD`, protected by AuthGuard + RolesGuard + admin role. Both omitted defaults to 30 days; reject one missing endpoint, impossible dates, reversed ranges, future end dates, or ranges above 366 inclusive days. Derive today's date in Manila, not host-local time. Validate dates in the service in addition to DTO format validation.

Service-only `petko_admin_analytics(p_start date, p_end date)` returns one JSON object, avoiding the row limit on set-returning RPCs. It uses local start midnight inclusive/end+1 midnight exclusive converted with `AT TIME ZONE 'Asia/Manila'`. Validate the range again in SQL. Aggregate orders before joining items so multi-item orders cannot multiply order totals. Aggregate completion independently of order creation, allowing orders placed before the range to complete inside it.

Return a typed object with camelCase keys:

- `range: { start, end, timezone: 'Asia/Manila' }`, `generatedAt`, `collectionStartedAt`.
- `summary: { placedOrders, placedValue, completedOrders, completedSales, buyers, newBuyers, returningBuyers, sessions, guestSessions, customerSessions, pageViews, guestPageViews, customerPageViews }`.
- `daily`: one entry per calendar day, zero-filled, with `date` plus placed/completed counts and values, sessions and pageViews. Sessions count distinct sessions with a view that day; a session spanning midnight can appear on both days, so daily sessions need not sum to range sessions.
- `topProducts`: at most 10 entries `{ productId, name, units, placedValue }`, ranked by placed units, then placed value, then product ID; only qualifying orders created in range. Use quantity and unit-price snapshots; a renamed product cannot change historical value. Choose a deterministic latest nonblank item snapshot name per product; current product name is only a legacy fallback.

Buyer count is distinct user IDs with a qualifying placed order in range. A buyer is new if their first-ever qualifying, noncancelled order is within range; otherwise returning. One buyer belongs to exactly one bucket even if they order multiple times in range. Top-product values can legitimately differ from legacy order subtotals; preserve the source rather than manufacture balancing items.

Sessions are distinct nonexcluded sessions with at least one view in range. Guest sessions have no identified customer; customer sessions have an identified customer, so these two are mutually exclusive and add to sessions. Guest/customer page views preserve the audience at ingestion: a customer session can contain an earlier guest login view. Reports exclude sticky admin sessions; also filter currently effective admins from linked traffic if their role changed after capture (stored role or confirmed auth email on the access list). Do not expose session IDs/user IDs/emails in the report. Identify-only sessions never count as visits.

## Schema and permissions

Create matching definitions in `petko-be/supabase/migration-004-admin-analytics.sql` and append them to `schema.sql`, transactionally and idempotently:

- `analytics_settings`: singleton row with server-generated `collection_started_at`; insert on conflict do nothing so rerunning migrations does not reset coverage.
- `analytics_sessions`: UUID primary key, nullable `user_id` FK, server start/last timestamps, `excluded` boolean default false. Preserve exclusion on user deletion; FK may set null. No names/emails or arbitrary metadata.
- `analytics_events`: UUID event primary key, session FK, allowed finite page enum (including identify for global event-ID deduplication), captured audience (`guest`/`customer`/`admin`), server `created_at`. All report queries exclude identify events and admin audiences. Add indexes supporting session and event-time reporting. Identity events link/exclude sessions but never increment views.
- RLS on all tables, no public policies; revoke all from PUBLIC/anon/authenticated, explicitly grant backend service role the needed access. Functions use a fixed search_path, fully qualify sensitive relations, revoke execute from PUBLIC/anon/authenticated, grant only service_role. Add a partial orders confirmation-date index if needed; the created-date index already exists.

No backfill and no fixtures in production. The report metadata must distinguish unavailable/pre-collection traffic from a measured zero, including when a selected range straddles collection start. UI copy: “Visits recorded since [date]. Earlier traffic is unavailable.” Keep visits zero where no events exist, with this coverage notice.

No additional environment values. Rollback is the prior application release, retaining the additive analytics schema and data.

## Implementation tasks and checks

1. **Database:** add migration/schema block and `petko-be/supabase/verify-admin-analytics.sql`. Verification fixtures are transactionally rolled back in an isolated database. Assert RLS/grants/RPC permissions; event replay idempotence; admin identification removes earlier login views; anonymous calls cannot downgrade sessions; cross-user identity cannot take over a session; setting coverage survives reruns. Financial fixtures cover cancellation in either status column, shipping exclusion, multiple items without multiplied totals, a completion inside range from an older order, first-vs-repeat buyers, Manila midnight boundaries, zero-filled empty range, and more than 1,000 orders proving complete sums. Done: migration reruns clean and every SQL assertion passes. Never run fixtures against the live project.
2. **Backend:** create `src/modules/analytics/{analytics.module.ts,analytics.controller.ts,analytics.service.ts,analytics.repository.ts,analytics.types.ts,optional-auth.guard.ts,dto/record-analytics-event.dto.ts,dto/analytics-query.dto.ts}` and co-located service/controller/repository/guard tests. Register the module in `src/app.module.ts`; preserve existing environment configuration. Thin controllers, service business rules, repository DB calls and safe error mapping. Tests prove anonymous login only; invalid token cannot become guest; admin identity suppresses capture; DTO rejects unknown/private fields; safe missing-migration/DB errors; valid leap dates/invalid dates/reversed ranges/future dates/range cap/Manila default; exact RPC arguments; no raw DB messages. Extend `src/bootstrap.spec.ts` and/or add `test/analytics.e2e-spec.ts` to assert anonymous report 401, customer 403, admin success and standard envelopes using mocked auth/Supabase, no network credentials.
3. **Frontend capture:** create `src/features/analytics/analytics-api.ts`, `analytics-types.ts`, `analytics-session.ts`, `analytics-tracker.tsx`; add the observer in `src/App.tsx`. Keep state/side effects in the session module and observer, networking in the API module. Prove with browser request assertions: guest login recorded once under StrictMode; customer route maps to finite enum; admin identity removes earlier guest view and no admin views are captured; callback token/hash/query is never transmitted; auth/sign-out transitions rotate safely; failure and unavailable storage leave checkout/navigation working.
4. **Frontend admin report:** create `src/features/analytics/admin-analytics-page.tsx`, `use-admin-analytics.ts`, and small presentational chart/table components as needed. Lazy route under the existing admin guard; dashboard card links to it. Use current installed React/router/formatting patterns, CSS/SVG charts plus a daily table for accessible values; no chart package. Include clear labels for placed/completed amounts, PHP formatting, coverage notice, filter validation, loading, error with Retry, empty data, responsive top-products table, and a manual Refresh. Abort/ignore stale requests when filters change; don't show a previous filter's data as current. Use the existing app palette and components. Browser validation at desktop/mobile with nonempty, empty, error, date changes and authorization states. Check keyboard labels, horizontal overflow and chart/table readable numbers.
5. **Verify and document:** `npm run lint`, `npm test -- --runInBand`, `npm run test:e2e --prefix petko-be -- --runInBand`, `npm run build`; backend typecheck under installed TS and frontend TS as project standards require. Use placeholder variables and `VERCEL=1` for automated builds/checks, never read actual .env files. Save SQL verification and Playwright outputs; state any unavailable checks. Update context/README deployment/API notes with migration 004, traffic definitions and rollback. Do not add a frontend test framework for this feature.
6. **Release:** feature branch -> reviewed PR; resolve severity findings and green CI/Vercel preview. Apply additive migration 004 with authenticated approved CLI access before production app deploy; verify metadata/privileges only against production. User already authorized PR/merge/deploy, so do not ask again for routine release steps. Merge commit through PR, never direct push to main. Confirm Vercel deployed the merge SHA and production `/api/health` is 200, `/api/admin/analytics` is 401 unauthenticated, admin UI loads in a real authenticated session when available. If authenticated production UI access is unavailable, explicitly report that limit rather than invent verification. Avoid generating synthetic production traffic just to test metrics.

## Risks and rollback

No remaining product blocker. Data is aggregate telemetry and can be blocked/spoofed; buyer/order records remain the financial source of truth. Anonymous admins cannot be excluded until they identify. Excluding a session or a later-cancelled order can revise prior reports; labels describe current qualifying data, not an immutable accounting ledger. Legacy subtotals reflect migration 003's historical fallback. Browser session IDs are random capabilities, never privileged authorization; client calls must not alter server identity/exclusion after linkage.

Roll back by reverting the feature merge/deploying the prior reviewed release. Retain the additive tables, functions and collected data; no destructive rollback is required. If migration fails, do not merge/deploy dependent code until it succeeds. The feature must never make purchase placement depend on successful telemetry.

## Implementation verification

- Full lint, 150 unit tests, 54 HTTP end-to-end tests, and the production build passed. Automated checks used placeholder configuration; no real environment files were read. Backend typechecks passed under the repository TypeScript 5.9 and frontend TypeScript 6.
- Migration 004 applied twice in isolated PostgreSQL 17; the analytics SQL assertions passed and rolled back all fixtures, including the 1,004-order accounting case.
- Playwright verified populated desktop/mobile layouts, filters and validation, empty/error/retry states, keyboard use, customer route protection, StrictMode deduplication, capture failures, storage fallback, and same-ID bounded retries with mocked auth/APIs. Controlled deferred-request checks verified admin identification survives slow guest capture, rapid sign-out, and an in-flight role promotion. No authenticated production browser session was used.
- Independent review cleared the backend, migration, financial definitions, and frontend after fixes for the admin identity race and both single-day chart markers. Existing Vite bundle-size warning remains; the analytics report is lazy-loaded.

Release requires the documented migration and green PR/deployment checks; retain the additive database changes on application rollback.
