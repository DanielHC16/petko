# Profile, account carts, and cashless checkout

## Goal and accepted behavior

Fix profile editing and account deletion; isolate persisted carts per customer; complete cashless checkout without moving money or collecting payment credentials. Normal orders keep stock reservation, fulfillment, and tracking. Cashless checkout shows method/amount confirmation, cancellation, processing, and success; there is no demo banner. Simulated payments never contribute to collected/completed sales. COD behavior remains available.

Deletion is allowed only after every order is customer-confirmed complete or cancelled and every delivery issue is resolved. Retain anonymized order history. Protect the last effective admin. These choices were confirmed in the requirements interview; no blocking product questions remain.

## Existing behavior and causes

- `petko-fe/src/features/customer/profile.tsx:334` updates Auth metadata before attempting a write to nonexistent `profiles`; deletion at line 376 calls a missing route and unimplemented RPC fallback.
- `petko-be/src/modules/users/users.controller.ts:38` exposes profile GET and terms acceptance, but no self-service profile mutation/deletion.
- `petko-fe/src/store/cart.store.ts:113` merges shared local items into whichever account signs in. Its persisted key at line 143 has no owner. `petko-fe/src/main.tsx:17` retains cart/profile state during auth transitions and awaits an API operation inside the auth callback.
- `petko-fe/src/features/cart/cart-api.ts:18` already uses `cart_items` with a user filter, but silently discards query/write errors. Existing owner RLS is in `petko-be/supabase/schema.sql:133`; reuse it rather than add a second cart persistence service.
- `petko-fe/src/features/checkout/checkout-page.tsx:267` displays selected items but line 320 only supplies explicit lines for direct purchases. `use-checkout.ts` otherwise submits all cart items and reconciles locally; page code removes selected products a second time.
- `petko-be/supabase/migration-003-order-tracking.sql:93` already creates orders transactionally with stock locks and checkout-key idempotency. Extend this function instead of placing separate nontransactional cart/payment writes around it.
- Orders reference users with `ON DELETE RESTRICT` (`schema.sql:142`); history has an immutable trigger (`migration-003-order-tracking.sql:76`). Analytics currently sums every completed order (`migration-004-admin-analytics.sql:98`).

## Decision and tradeoffs

Extend existing Nest users/order modules, direct Supabase cart API, and PostgreSQL transactions. This reuses installed dependencies and ownership controls. A new payment gateway would move real money and contradict scope; a browser-only fake checkout would lose order/stock/idempotency guarantees. Account deletion uses one service-role-only SQL transaction so anonymization and identity deletion either both succeed or both roll back; multiple HTTP cleanup calls would risk partial deletion.

Keep Auth metadata for saved shipping, behind shared frontend API helpers with checked Supabase errors. `public.users.full_name` is canonical for display name; do not require an Auth metadata write to save it. This avoids another partial-success workflow.

## Contracts

- `PATCH /api/users/me`, authenticated owner, body `{ full_name: string }`, trimmed length 1–120. Reject additional fields (especially role/id/email). Return the existing profile shape with its effective role intact. Backend uses controller → service → repository. Frontend replaces only the matching current user's profile after success.
- `DELETE /api/users/me`, authenticated owner, no target ID supplied. Return `{ message: string }`. Dedicated service-role-only `petko_delete_own_account(p_user_id uuid)` performs active-order/admin checks, anonymization, and hard identity deletion atomically. Map dedicated database conflict codes to safe actionable 409 messages. Declare `me` before `:id` routes.
- Payment method: `'cod' | 'gcash' | 'maya' | 'card'`. `payment_simulated boolean NOT NULL DEFAULT false` is derived exclusively from method by SQL, never trusted from a DTO. A simulated cashless confirmation can use the existing `paid` order status internally while financial summaries filter the simulation flag. Return payment method in order details and render its actual label; do not label every non-COD order unavailable.
- Extend create-order input with optional `checkout_source: 'cart' | 'direct'`, default `direct` for legacy API clients. New frontend always supplies it. Explicit item lines are the exact displayed selection for either source. Include method/source/items/shipping/delivery in the retry fingerprint.
- `petko_create_order` consumes only purchased quantities in persisted `cart_items` for source `cart`, within the same transaction as stock reservation. Lock cart lines in stable order and retain excess quantities. Retry returns the previously created order before touching stock/cart again. Direct purchases never modify cart.
- Cart store tracks `ownerId`, loading/error state and serialized pending mutations. Switching owner clears visible items synchronously, cancels/ignores stale results, loads that owner's server cart, and never merges unowned legacy local contents. Clear checkout selection/direct session snapshots on identity changes. Wait for pending cart writes before checkout; after successful cart checkout reload authoritative cart rather than submitting another delete. Network failures stay visible and must not erase the durable cart.

## Schema and deletion details

Create idempotent `petko-be/supabase/migration-008-profile-cart-cashless.sql` after migration 007, plus matching isolated verifier `verify-profile-cart-cashless.sql`. Keep `schema.sql` behavior equivalent. Add columns/checks/functions before deploying application consumers.

For deletion, drop `orders.user_id` NOT NULL but **retain the existing RESTRICT foreign key**. Only the dedicated deletion transaction may explicitly anonymize and null ownership, so the older admin Auth deletion path cannot orphan identifiable order data or bypass active-order checks. Lock `public.users` and `public.admin_access_emails` against concurrent role/list mutations while counting actual effective admins (confirmed Auth email or stored admin), and lock the owner plus their orders. Checkout must lock/check the owner too, so a checkout cannot race deletion.

Reject when any order is neither cancelled nor receipt-confirmed, or has an unresolved issue. Redact order shipping, checkout payload/request identifiers, freeform delivery issues, and courier/tracking identifiers that identify the removed customer. Preserve item snapshots, amounts, fulfillment states, timestamps and event sequence. Redact actor IDs and freeform notes for affected history using a narrowly scoped anonymization context. The immutable trigger may allow only this exact redaction (all other columns unchanged), never general history modification or trigger disabling. Redact identifying event fields on other orders where the deleted user acted as admin as well. Remove matching admin access email so re-registration cannot recover deleted administrative access. Delete Auth identity (and cascading profile/cart/sessions) inside the transaction; null analytics identity references. Restrict function execution to service role, fixed empty search path, fully qualified object names, and no user-supplied effective role.

Analytics keeps placed/completed order counts and placed value for simulated orders, but filters `NOT payment_simulated` for every `completedSales` total, including daily values. Keep the existing response envelope and field names.

## Ordered implementation and proof

1. **Backend regressions and migration.** Modify users DTO/controller/service/repository and tests; orders DTO/types/repository and tests; `petko-be/test/orders.e2e-spec.ts`; new migration/verifier and `schema.sql`. Prove profile ownership/validation, self-delete guard ordering, 409 active/last-admin handling, payment enum, rejected client simulation flags, and checkout source validation. Run focused Jest tests before/after the implementation. Isolated SQL verifier covers actual transaction rollback, complete/cancelled deletion redaction, last-admin races/guards, function grants, exact cart quantity consumption, retries, direct checkout, and simulated sales exclusion. Never execute fixture verifier on production.
2. **Frontend account/cart state.** Modify `store/cart.store.ts`, `features/cart/cart-api.ts`, `main.tsx`, `lib/auth.ts`, profile page/API helpers, and cart selection helpers/page. Centralize shipping read/save/clear and validation compatible with checkout. Remove speculative missing-RPC fallback. Ensure deletion clears local auth/cart/session checkout state even if ordinary signout sees the already-deleted identity. Add state regressions or exercise browser flows with mocked API fixtures: switch A→B→A, delayed A load, failed write, refresh, save name/reload/header, shipping save/clear/prefill.
3. **Frontend checkout.** Modify checkout page/hook, shared order types/labels, and order detail components. Keep existing styling. Add accessible confirmation dialog with amount/method; cancel sends no request. Lock input/duplicate submits through processing, then show server-confirmed success. Failed checkout preserves cart and selection; successful cart checkout reloads only once and removes completed selection snapshot; direct source preserves unrelated cart. Test selected subset and retained quantities, idempotent retry after lost response, method switch, COD, and all three cashless choices.
4. **Review and full verification.** Reviewer examines auth, finance, tenancy and migration diff; fix material findings. Run `npm run lint`, `npm test -- --runInBand`, `npm run test:e2e --prefix petko-be -- --runInBand`, and `npm run build` using placeholder environment values and bypassing real env-file loading. Root independently checks rendered desktop/mobile behavior and deploy smoke tests.
5. **Release.** Root applies reviewed migration only after isolated verification and checks metadata/grants without production fixtures; opens feature PR, verifies preview/CI, merges with merge commit and verifies production. Never push directly to main. No real account deletion or charge in QA.

## Risks and rollback

Rollback application via prior Vercel deployment; retain additive payment fields, anonymized history, and nullable ownership. Deletion cannot restore personal data or credentials, so never test it on real users. Existing persisted unowned local carts are discarded instead of attributed to a potentially wrong person; per-account server carts remain. Do not restore old COD-only SQL after cashless records exist. For emergency disable cashless entry in frontend/server while retaining existing orders and simulation flags. A full schema rollback is inappropriate after account deletion; keep migration protections and forward-fix.

Have the coder execute `docs/plans/2026-11-13-profile-cart-cashless.md`.
