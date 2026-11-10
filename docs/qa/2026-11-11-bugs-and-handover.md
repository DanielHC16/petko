# Petko Platform Quality & Bug Audit Handover

**Date**: November 11, 2026  
**Auditor**: Antigravity Pair Programmer  
**Branch**: `feat/order-tracking`  
**Scope**: Cart Persistence, Direct / Express Checkout, Order Flow, Admin Panel, and Storefront UI/UX  

---

## 1. Resolved in Current Turn

| Item | Problem | Resolution | Files Changed |
|---|---|---|---|
| **Cart Persistence** | Zustand cart store was memory-only. Any page refresh or browser reload wiped all items. | Added Zustand `persist` middleware with `localStorage` (key: `petko-cart`). | `petko-fe/src/store/cart.store.ts` |
| **Express Checkout** | "Buy Now / Express Checkout" on product detail page redirected with `window.location.href = '/checkout?mode=direct'`, which cleared in-memory state, and checkout page never parsed `sessionStorage.direct_checkout_item` or `?mode=direct`. Resulted in empty cart screen. | Handled `mode=direct` in `checkout-page.tsx`, updated `use-checkout.ts` to accept direct items without clearing persistent cart, and switched `product-detail-page.tsx` to React Router `navigate()`. | `petko-fe/src/features/checkout/checkout-page.tsx`<br>`petko-fe/src/features/checkout/use-checkout.ts`<br>`petko-fe/src/features/products/product-detail-page.tsx` |
| **Cart Shipping Discrepancy** | `cart-page.tsx` hardcoded shipping estimate to `₱100.00` and showed "₱899 minimum spend". In reality, standard delivery is `₱99.00` (free over `₱999.00`). | Aligned `cart-page.tsx` calculation and banner to free shipping over `₱999.00` (`₱99.00` otherwise). | `petko-fe/src/features/cart/cart-page.tsx` |

---

## 2. Identified Issues & Bug Backlog for Incoming Agents

### Severity: High

#### ISSUE-001: Missing Supabase-Backed Cart Sync (Cloud Persistence)
- **File**: `petko-be/src/app.module.ts`, `petko-fe/src/features/cart/`
- **Current State**: Cart persistence is currently client-side only via `localStorage`. Although `CLAUDE.md` specifies "Persistent shopping cart stored in Supabase, synced on login", the backend has no `CartModule` and the frontend has no `cart-api.ts`.
- **Impact**: If a user switches devices or signs in from another browser, their cart is empty.
- **Recommended Fix**:
  1. Create `petko-be/src/modules/cart/` (`cart.controller.ts`, `cart.service.ts`, `cart.module.ts`).
  2. Implement `GET /api/cart`, `PUT /api/cart` (or item-level upsert/delete) matching `cart_items` table in Supabase.
  3. Create `petko-fe/src/features/cart/cart-api.ts` and sync `useCartStore` on authentication change.

#### ISSUE-002: Direct Checkout Blocks if All Stock is Already in Regular Cart
- **File**: `petko-fe/src/features/products/product-detail-page.tsx:142`, `petko-fe/src/features/products/product-detail-page.tsx:291`
- **Current State**: `remainingStock = product.stock - currentCartQty`. If a product has stock = 2 and the customer has 2 in their regular cart, `remainingStock <= 0`, which disables the "Buy Now" button.
- **Impact**: Customers cannot use "Buy Now" to checkout immediately with an item if they already placed that same item's total inventory into their cart.
- **Recommended Fix**: Separate the max allowed quantity for "Buy Now" (which is `product.stock`) from the regular cart quantity addition (`product.stock - currentCartQty`).

---

### Severity: Medium

#### ISSUE-003: Cosmetic Uncontrolled Checkbox in Cart Items
- **File**: `petko-fe/src/features/cart/cart-page.tsx:163-167`
- **Current State**: `<input type="checkbox" className="..." defaultChecked />` is uncontrolled and has no state binding.
- **Impact**: Toggling the checkbox does not exclude items from the cart total or order placement. Users expect unchecked items not to be purchased.
- **Recommended Fix**: Either bind checkboxes to a `selectedProductIds` state set that filters what proceeds to checkout, or remove the checkboxes if all cart items are intended to be checked out simultaneously.

#### ISSUE-004: Hardcoded Item Description & Stock Badge in Cart Page
- **File**: `petko-fe/src/features/cart/cart-page.tsx:179-180`
- **Current State**: 
  - Line 179: `<p className="mt-0.5 text-xs text-gray-500">Product Description</p>` is hardcoded literal text.
  - Line 180: `<span className="mt-1 text-xs font-semibold text-green-600">In Stock</span>` always displays regardless of `item.stock`.
- **Impact**: Unprofessional UI display on real customer carts.
- **Recommended Fix**:
  - Store or render `item.category` or pet type instead of literal "Product Description".
  - Check `item.stock > 0` before showing "In Stock", or warn if stock is below cart quantity.

#### ISSUE-005: Dead Action Buttons in Cart Page
- **File**: `petko-fe/src/features/cart/cart-page.tsx:243`, `petko-fe/src/features/cart/cart-page.tsx:264`, `petko-fe/src/features/cart/cart-page.tsx:283`
- **Current State**:
  - "Edit Cart" button in summary card has no `onClick` handler.
  - "Change" button beside shipping estimate has no `onClick` handler.
  - "Apply" voucher button has no handler and vouchers are unintegrated.
- **Impact**: Dead clicks for users.
- **Recommended Fix**: Wire up or remove non-functional buttons. For vouchers, show an informative toast (e.g. "Vouchers are not available yet") or hide the promo section until coupon backend is ready.

---

### Severity: Low / Polish

#### ISSUE-006: Duplicate Product Name in Checkout Summary List
- **File**: `petko-fe/src/features/checkout/checkout-page.tsx:580-583`
- **Current State**:
  ```tsx
  <p className="text-xs font-semibold text-gray-800 line-clamp-1">{item.name}</p>
  <p className="text-[10px] text-gray-400 line-clamp-1">{item.name}</p>
  ```
- **Impact**: Product name is rendered twice identically in different fonts.
- **Recommended Fix**: Replace the second line with unit price or remove the redundant paragraph.

#### ISSUE-007: "Edit Cart" Link in Direct Checkout Routes to Main Cart
- **File**: `petko-fe/src/features/checkout/checkout-page.tsx:541-546`
- **Current State**: In `/checkout?mode=direct`, the "Edit Cart" link directs to `/cart`, which may be empty or contain unrelated items.
- **Impact**: Confusing navigation for single-product direct checkout buyers.
- **Recommended Fix**: If `isDirect && directItem`, render `<button onClick={() => navigate(-1)}>` or link to `/products/${directItem.product_id}` with label "Change item".

#### ISSUE-008: Vite Large Bundle Warning (>500 kB Chunk)
- **File**: `petko-fe/vite.config.ts`
- **Current State**: The production bundle produces a single large JS chunk (`dist/assets/index-*.js` ~705 kB uncompressed).
- **Impact**: Slower initial page load on mobile networks.
- **Recommended Fix**: Introduce `React.lazy()` for admin routes (`/admin/*`) and heavy pages to split vendor and page chunks.

---

## 3. Verification Commands for Next Agent

Before pushing any further updates, execute:
```bash
# 1. Verify backend and frontend linting
npm run lint

# 2. Run backend Jest unit tests
npm test -- --runInBand

# 3. Run backend e2e tests
npm run test:e2e --prefix petko-be -- --runInBand

# 4. Run frontend and backend production builds
npm run build
```
