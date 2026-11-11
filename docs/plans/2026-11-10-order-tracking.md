# Order tracking: design

Status: implemented; local checks and the live migration verified. Application release is tracked in PR #19. Updated 2026-11-10.

## Goal and success criteria

Customers can see their actual orders and timestamped fulfillment progress. Admins control fulfillment updates. An admin's delivery report remains visibly unconfirmed until the order owner confirms receipt. Both views retain Petko's existing cream, blue, orange, rounded-card design and work on mobile and keyboard.

Success means customer A cannot read or confirm customer B's order, customers cannot change fulfillment, admins cannot confirm another customer's receipt, stale concurrent updates cannot overwrite progress, and every successful change has one durable history event.

## What exists

- The customer page is a static delivered-order mock, including a fabricated order number, date, address, totals, and timeline: `petko-fe/src/features/orders/orders-page.tsx:13`, `:46`, `:65`. Replace the mock data while retaining its visual language. Its timeline currently puts “Out for Delivery” before “Shipped”; correct that ordering.
- Admin orders is only a placeholder: `petko-fe/src/features/admin/admin-orders-page.tsx:1`.
- Checkout validates local fields then navigates to orders without persistence: `petko-fe/src/features/checkout/checkout-page.tsx:132`, `:148`. The cart is local Zustand state: `petko-fe/src/store/cart.store.ts:23`.
- Backend registration has users, products, admin-access-emails, and admin-stats, but no orders/checkout module: `petko-be/src/app.module.ts:20`.
- SQL already has orders with `pending | paid | shipped | cancelled`, total, gateway reference, and creation date; order items snapshot unit price: `petko-be/supabase/schema.sql:112`, `:133`. There is no shipping snapshot, fulfillment history, or receipt confirmation.
- Ownership read policies already cover orders/items: `petko-be/supabase/schema.sql:126`, `:143`. New writes must go through authenticated Nest endpoints; direct authenticated SQL/REST writes must stay prohibited.
- Reuse effective-role authentication and admin guards, rather than trusting the browser role: `petko-be/src/common/guards/auth.guard.ts:37`, `petko-be/src/modules/admin-access-emails/admin-access-emails.controller.ts:23`.
- Reuse feature API functions and error helpers: `petko-fe/src/features/admin/admin-api.ts:28`, `petko-fe/src/features/admin/admin-users-page.tsx:48`. Shared response interceptor always wraps returned data: `petko-be/src/common/interceptors/response.interceptor.ts:30`.
- Existing authenticated routes already expose `/orders` and `/admin/orders`: `petko-fe/src/App.tsx:37`, `:46`. Existing Tailwind Petko tokens and fonts are in `petko-fe/tailwind.config.js:29`.
- Actual frontend dependencies are React 19 / Router 7 and contain neither Zod nor TanStack Query: `petko-fe/package.json:12`. Follow installed code rather than historical standards examples. No new package is needed for tracking.

## Options and recommendation

| Option | Benefit | Cost and risk |
| --- | --- | --- |
| Expand `orders.status` into a single mixed payment/fulfillment lifecycle | Fewest fields | Couples payment to shipping; existing `paid` semantics and future COD become unclear; migration is harder to reverse |
| Add fulfillment status, receipt confirmation, and append-only events | Separates admin reports from customer acknowledgment; preserves existing payment-era status values; supports reliable history | Adds columns, an event table, and transactional SQL functions |
| Integrate courier events and live subscriptions | Automatic external tracking | New services, credentials, operational complexity, and courier selection outside the request |

Recommend the second option inside the existing Nest/Supabase application. No courier integration, realtime subscription, gateway, or notification service by default. Reload and focus refresh are enough initially; refresh controls must be visible.

## Interview decisions and defaults

The user answered all three consequential questions:

1. Admin reports delivery, then the customer confirms receipt. No automatic completion.
2. Connect real checkout using COD only. Online payment methods remain visibly unavailable until integrated.
3. Customers can report nonreceipt with a message. Admins see a flag; the order remains incomplete.

Defaults communicated for implementation: order-level fulfillment (one shipment per order); forward-only progress with no step skipping; admin-only cancellation before shipment; optional courier name/tracking number with plain text display; immutable server timestamps; admins who are themselves buyers confirm only their own orders through the owner endpoint; no new dashboard metrics, reorder, support chat, partial shipments, returns, or payment gateway in this slice. Existing inert actions should not imply implemented capabilities.

## Implementation contract

### State and ownership

Add `orders.fulfillment_status` with `placed | processing | shipped | out_for_delivery | delivered | cancelled`, `tracking_version` (integer default zero), `updated_at`, `delivery_confirmed_at` (nullable), and optional bounded `courier_name` / `tracking_number`. The immutable receipt event records the confirming customer ID.

- Admin transition sequence: placed -> processing -> shipped -> out_for_delivery -> delivered.
- Customer receipt: delivered with no confirmation -> same fulfillment status plus confirmation fields.
- Only pre-shipment orders can be cancelled under the agreed cancellation policy. Cancelled and customer-confirmed orders are terminal.
- “Delivered” in admin terminology is a report; customer UI uses “Delivered — confirm receipt” until acknowledgment. Only then show “Delivery confirmed.” Never render an unconfirmed report as customer acknowledgment.
- Owner can report a delivery issue only after the admin delivery report and before confirmation. Keep one current issue with message, server reported timestamp, optional admin resolution, server resolved timestamp and resolver. Admin resolution records its response and clears the unresolved flag, but never confirms receipt or rewinds progress. The owner can later confirm receipt, atomically resolving an open issue as received. A new nonreceipt report after an admin response can reopen the issue with a new event; never silently erase the previous history.
- Avoid a second independent completion enum: derive completion from delivery status and confirmation timestamp. A check constraint permits confirmation only for delivered orders; the transaction saves the timestamp and confirming actor's event together.
- History events contain `id`, `order_id`, monotonic `version`, `event_type` (`order_placed | imported | status_changed | receipt_confirmed | delivery_issue_reported | delivery_issue_resolved`), `from_status`, `to_status`, nullable `actor_id`, `actor_role`, optional bounded `note`, and server `created_at`. Actor IDs are historical values without a user FK, so deleting an account never rewrites history. Unique `(order_id, version)` prevents duplicate transitions. No customer-visible actor emails.

Preserve the old `orders.status` contract during expansion. Backfill legacy pending/paid -> placed, shipped -> shipped, cancelled -> cancelled. Preserve legacy status unchanged on fulfillment updates except that cancellation sets it to cancelled; new callers use `fulfillment_status`. Do not invent historic processing/shipping dates. Add one clearly labeled imported-baseline event where historical state is known, and expose unknown milestone times as unknown.

### Endpoints

All routes are under `/api`; controllers return unwrapped objects and keep HTTP/auth only.

| Route | Actor | Result |
| --- | --- | --- |
| `GET /orders?page=1&limit=20` | signed-in owner | only their orders; bounded page |
| `GET /orders/:id` | signed-in owner | own detail, safe item data, tracking events; otherwise 404 |
| `GET /orders/admin/all?page=1&limit=20&fulfillment_status=...` | effective admin | paginated orders, minimum customer details needed for fulfillment |
| `GET /orders/admin/:id` | effective admin | order detail and history |
| `PATCH /orders/:id/fulfillment` | effective admin | `{ status, expected_version, courier_name?, tracking_number? }` -> updated detail |
| `POST /orders/:id/confirm-receipt` | signed-in owner | `{ expected_version }` -> updated detail |
| `POST /orders/:id/delivery-issue` | signed-in owner | `{ expected_version, message }` -> updated detail |
| `POST /orders/:id/resolve-delivery-issue` | effective admin | `{ expected_version, resolution }` -> updated detail |
| `POST /orders` | signed-in owner | idempotent real COD placement, payload below -> updated detail |

Declare static admin routes before dynamic `:id`, use `ParseUUIDPipe`, DTO class-validator bounds, and whitelist enums. Use owner scope even for admins on owner endpoints. Client input never controls `user_id`, actor identity, role, timestamps, confirmation actor, totals, or next version.

List data shape inside the existing success envelope: `{ orders: OrderSummary[], total, page, limit }`. This avoids changing the global interceptor or incorrectly double-wrapping the response. Use newest-first stable ordering `(created_at desc, id desc)`, a default limit of 20, maximum 100, and explicit DTO validation. Detail adds items and events. Return only listed contract columns; no raw `select('*')` on joined user/auth data.

Freeze the mirrored FE/BE contract before parallel implementation: `OrderSummary` includes `id`, `user_id`, legacy `status`, `fulfillment_status`, `tracking_version`, `subtotal_amount`, `shipping_fee`, `total_amount`, `payment_method: 'cod'`, `delivery_method: 'standard' | 'express'`, `created_at`, `updated_at`, nullable `delivery_confirmed_at`, nullable `courier_name`/`tracking_number`, nullable `shipping`, nullable `delivery_issue`, and `items`. Item shape is `{ id, product_id, product_name, image_url, quantity, unit_price }`. Shipping shape is `{ full_name, email, phone, address_line1, address_line2, city, province, postal_code }`; legacy orders may have none. Issue public shape is `{ message, reported_at, resolution: string | null, resolved_at: string | null }`. `OrderDetail` adds `events`, with each event `{ id, version, event_type, from_status, to_status, actor_role, created_at, note }`.

`OrdersService` owns transition policy, read authorization, and safe error mapping. `OrdersRepository` owns Supabase reads/RPC calls. Typed entities/constants stay inside the orders module; UI shared order domain types/status presentation live under `petko-fe/src/lib/` so the admin feature does not reach into orders internals.

### Atomic persistence

A backend-only SQL function takes order ID, authenticated actor ID/role supplied by Nest, action, expected version, and validated metadata. It locks the order, rechecks ownership/allowed transition, compares the version, updates the row, and inserts its event in one transaction. Grant execution only to service_role; revoke from PUBLIC, anon, and authenticated. Set an explicit safe search_path and schema-qualify tables. RLS and grants prohibit direct client writes to orders, items, and events. History is backend-only with no client policies, exposed through the authorized API.

Duplicate receipt confirmation by the same owner returns the already-confirmed order successfully with no additional event. Duplicate identical state requests can return the current state if the persisted action already happened; incompatible stale changes return 409 and prompt refresh. Unknown/nonowned IDs return 404. Unexpected database errors are logged server-side and become generic safe errors; never send Postgres text to clients.

Do not implement update and history insert as separate HTTP queries: either could succeed alone. API unit tests with mocks do not prove transaction behavior; SQL verification is a separate requirement.

### Checkout prerequisite (included)

Add authenticated `POST /orders` with `{ checkout_request_id: UUID, items: [{ product_id: UUID, quantity: positive integer }], shipping: ShippingSnapshot, delivery_method: 'standard' | 'express', payment_method: 'cod' }`. Unique `(user_id, checkout_request_id)` makes retries safe. Prices, shipping fees, availability, and totals are authoritative on the server. Standard shipping matches today's checkout: subtotal >=999 is free, otherwise 99; express is 199. Persist order, item price/name/image snapshots, initial event, and stock deduction together. Lock products in deterministic ID order and validate active status/all quantities before decrementing. Reject empty carts, duplicates or aggregate them before stock validation, and reject nonpositive/noninteger quantities. Cancellation before shipment restores stock exactly once in the same transaction; later cancellation is prohibited. Retain snapshot names/images for future product edits; existing items can fall back to current joined product data without pretending it is a historic snapshot.

Only after persistence succeeds should checkout clear the local cart and navigate to `/orders?order=<id>`. On failure preserve form/cart and allow a retry with the same request ID. Never mark online payments paid or display gateway success without an integration. The existing UI's selectable methods and shipping fee must reflect what the backend actually supports. Place the request in a checkout/orders API function, not the page's JSX.

## Implementation tasks

1. **Freeze contract.** Have backend and frontend agree the exact mirrored names above before parallel edits. Interview choices are settled; do not introduce gateways or automatic receipt.
2. **Expand schema and security.** Update `petko-be/supabase/schema.sql`; create idempotent `petko-be/supabase/migration-003-order-tracking.sql` and `petko-be/supabase/verify-order-tracking.sql`. Add fields/events/indexes/constraints, backfill without fabricated timestamps, and backend-only transaction functions. Verification proves role grants, ownership, valid/invalid transitions, stale-version conflicts, rollback on event failure, duplicate confirmation idempotency, and rerunning migration safety. Verify checkout retry deduplication, server prices, concurrent stock, and one-time cancellation stock restoration.
3. **Backend module.** Create `petko-be/src/modules/orders/orders.module.ts`, `orders.controller.ts`, `orders.service.ts`, `orders.repository.ts`, `orders.types.ts`, `orders.constants.ts`; DTOs `dto/order-list-query.dto.ts`, `dto/update-fulfillment.dto.ts`, `dto/confirm-receipt.dto.ts`, `dto/create-order.dto.ts`, and bounded issue report/resolution DTOs. Register in `petko-be/src/app.module.ts`. Tests: colocated `orders.controller.spec.ts`, `orders.service.spec.ts`, and `orders.repository.spec.ts`. Reuse `common/testing/supabase-query.mock.ts`. Prove authenticated identity propagation, owner filtering, admin-only mutation, illegal transitions, terminal states, hidden foreign IDs, and safe RPC error mapping. Verify focused orders Jest tests pass.
4. **Shared frontend domain/API.** Create `petko-fe/src/lib/order-types.ts` and `petko-fe/src/lib/order-status.ts`; `petko-fe/src/features/orders/orders-api.ts`, `orders-queries.ts`; `petko-fe/src/features/admin/admin-orders-api.ts`, `use-admin-orders.ts`. Use current API/state conventions and getApiErrorMessage. Typed hooks own loading/refresh/mutation and cancel stale effect updates on unmount/account change. No TanStack Query/Zod installation. Add `petko-fe/src/features/checkout/checkout-api.ts`, `checkout-validation.ts` and wire `checkout-page.tsx` without redesigning it.
5. **Customer view.** Replace static `petko-fe/src/features/orders/orders-page.tsx`; add feature-local `order-card.tsx` and `order-progress.tsx`. Render actual orders, item images/names, prices, known timestamps, optional address/tracking, empty/loading/error/retry states, and an accessible confirmation prompt. Clear pending and completed timeline styling, textual status, and vertical/compact mobile layout; no horizontal overflow. Keep cream background, blue headings, orange accents, rounded cards. Absent historical address is “Address unavailable for this order,” never a sample address. Refresh after mutations and on focus. Support `?order=<id>` only when that ID is owned.
6. **Admin view.** Replace `petko-fe/src/features/admin/admin-orders-page.tsx`; optionally add `admin-order-detail.tsx`. Match admin users/products spacing, breadcrumb to `/admin`, cards, filters, list, refresh, loading and errors. Open details with shared typed presentation data; display current progress/history, receipt status, and only legal next actions. Disable only the affected order during mutation; 409 retains truthful server state and offers refresh. Hide confirmation controls for other people's orders. Show unresolved reports and a note-only admin resolution action, retaining delivered/unconfirmed state without progress rewind.
7. **Integration checks.** Create `petko-be/test/orders.e2e-spec.ts` using Nest + controlled Supabase mocks to prove 401 unauthenticated, 403 customer admin mutations, 404 foreign order/confirmation, validation errors, full admin progression, owner confirmation, and response envelope shape. Extend `petko-be/src/bootstrap.spec.ts` with guarded route smoke checks. Exercise both frontend views in a browser with dummy environment and mocked APIs, including empty/error, mobile, all progress states, confirmation cancellation/submission, stale conflicts, two owners, and selected-order navigation. Do not claim mocked browser checks verify the SQL.
8. **Docs and release preparation.** Update `context/CLAUDE.md` and `README.md` with endpoints, lifecycle, manual migration order, payment limitations, and test commands once implementation exists. Do not commit, push, deploy, or modify live Supabase unless the user explicitly requests that action.

## Verification and release risk

Run from repository root with dummy configuration and `VERCEL=1` so automated checks cannot load real env files:

- `npm run lint` -> exit 0.
- `npm test -- --runInBand` -> all unit tests pass.
- `npm run test:e2e --prefix petko-be -- --runInBand` -> all e2e tests pass.
- `npm run build` -> both applications build.
- Run `verify-order-tracking.sql` against an isolated local/test database after applying the migration twice -> all assertions pass; fixture transaction rolls back. If a local SQL environment is unavailable, explicitly report this unverified requirement. Never use live production as a test fixture.
- Render `/orders` and `/admin/orders` at desktop and mobile sizes; verify keyboard focus, dialog dismissal/restore, truthful pending-confirmation wording, refresh behavior, and absence of fabricated order data.

Apply schema expansion before deploying new APIs/UI. Keep existing status columns and read policies during rollout; baseline backfill is additive. No new environment flag or service is required. Complete isolated transactional verification before release.

Rollback: roll back the application release and retain new columns/events for investigation. Do not drop history or reverse confirmed delivery data. There is no contract phase deleting legacy fields in this feature. Primary risks are mistaken payment promises, stale concurrent state, broken direct grants, and inventing shipping history; the contracts and separate SQL verification above address them.

## Verification results

Completed locally on 2026-11-10 with placeholder credentials and env-file loading disabled:

- Root lint passed. Unit tests: 19 suites / 122 tests. HTTP e2e: 2 suites / 35 tests. Root production build passed; the existing large-chunk warning remains.
- Isolated PostgreSQL via PGlite 0.5.16: fresh schema and upgrade from the previous schema, migration applied twice, legacy mapping/import history, actual authenticated-role ownership reads, revoked RPC execution, and the complete `verify-order-tracking.sql` fixture passed. PGlite uses one connection; independent simultaneous database sessions were not tested. No live Supabase database was accessed.
- Headless Chromium with controlled API fixtures: customer/admin desktop (1280px) and mobile (390px), progress, nonreceipt report/admin response, customer confirmation, stale-update recovery, cancellation, empty/error/foreign-order views, and dialog Escape/focus passed. COD checkout validation, unavailable online methods, retry identity, intentional repurchase, and navigation during pending checkout passed. Late duplicate responses reconcile cart quantities once. No browser page errors or horizontal overflow were observed. Mocked browser checks do not substitute for live API/SQL integration.
- Review findings were fixed: malformed nested checkout payloads, mixed-version history reads, stale selected-order refresh, tracking navigation, receipt wording, and checkout retry identity across route changes.

The final shared frontend API/domain files live in `src/lib/orders-api.ts`, `order-types.ts`, and `order-status.ts`; hooks in `src/hooks/use-orders.ts`; shared presentation in `src/components/orders/`. Checkout uses `features/checkout/use-checkout.ts` and `checkout-validation.ts`. These shared locations let customer/admin views reuse the same contract without reaching into another feature's internals.

## Release verification

The user authorized committing, pushing, opening a PR, merging to main, and applying migration-003 before release. [PR #19](https://github.com/DanielHC16/petko/pull/19) integrates the latest storefront banners, local images, footer, terms, and scrollable checkout summary. A small responsive footer correction prevents category links from clipping on narrow screens.

Migration-003 was applied once to the live Petko project on 2026-11-10. Read-only metadata checks verified required columns/table/functions, history RLS and immutability, uniqueness constraints, service-role-only function execution, and revoked browser write/history privileges. No production test fixtures or customer-data reads were used. All local checks and the desktop/mobile browser flows were repeated after integrating main; GitHub CI and Vercel statuses on the PR record final release checks. Rollback retains the added tracking schema/history and restores the previous application release.
