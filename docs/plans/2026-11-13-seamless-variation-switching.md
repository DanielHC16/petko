# Seamless product variation switching

Status: plan and implementation handoff only. No implementation, commit, push, deployment, or worker launch is authorized by this document.

## Goal and scope

On a loaded product page, selecting another variation should update its price, image, stock, SKU, contents, and purchase actions immediately while the page and picker stay in place. The URL continues to identify the selected SKU. This is a frontend improvement to the existing product-detail picker. Checkout/cart variation editing, a feature toggle, catalog changes, database/API changes, new libraries, and a visual redesign are outside scope. The earlier checkout/toggle interview was cancelled; there are no blocking product questions for this narrower change.

## Existing behavior and cause

- `petko-fe/src/features/products/product-detail-page.tsx:229` navigates to the sibling product URL with `replace: true`.
- The page tracks a separate `product`, `variants`, and `loadedId`; `isLoading` compares the route ID to `loadedId` at `product-detail-page.tsx:34`. Every ID change reruns the effect at `:36`, fetching the selected product (`:43`), the same family (`:44`), and recommendations (`:53`). It clears recommendations at `:50`.
- On that next render, the IDs differ and the full detail tree is replaced by “Loading product details...” at `product-detail-page.tsx:132`. This is an SPA loading transition, rather than a browser document reload, but it removes the picker/image/layout and feels like a reload.
- The family query already returns full product rows: `petko-fe/src/features/products/products-api.ts:61`. It restricts siblings by exact parent name and active status. `fetchProductById` at `:49` remains the cold-load path. `petko-fe/src/lib/product-catalog.ts:62` already defines the family identity; reuse it.
- Cart and Buy Now read `product.id`, price, image, and stock at `product-detail-page.tsx:80` and `:110`. Preserve those contracts. Quantity/Added currently reset when a new SKU loads (`:48`); the Added timeout at `:99` has no cleanup.
- The existing browser fixture already exercises selection, separate cart lines, quantity reset, Buy Now, and keyboard use: `petko-fe/scripts/verify-variations.py:125`.

## Options and recommendation

| Option | Trade-off |
| --- | --- |
| Add a cache check inside the current route effect | Small edit, but still flashes the loader for one render because `loadedId !== id` is evaluated before the effect. It also leaves recommendation cancellation coupled to SKU navigation. Insufficient. |
| Derive selection synchronously from the URL and current family cache; separate family loading and recommendations | Small local hook refactor, no migration or dependency. Preserves direct links and current history behavior while eliminating repeated sibling fetches. Recommended. |
| Keep selection only in local state and stop updating the URL | Simple interaction, but refresh/share/history can identify the wrong SKU. Reject. |

## Intended design

Create `petko-fe/src/features/products/use-product-detail.ts`. It owns the current loaded family, its product rows indexed by immutable product ID, guarded cold-load requests, family-scoped recommendations, and retry state. Keep network calls in the existing API module. A suitable return contract is `{ product: Product | null, variants: Product[], suggestions: ProductFamily[], status: 'loading' | 'ready' | 'error', error: string | null, retry: () => void }`, with an explicit TypeScript return type.

1. **Render the route selection synchronously.** Resolve `product` from the route ID in the cached family on every render. A cached sibling is immediately `ready`; an effect that later sets `loadedId` is not the fast path. Keep the detail root and all picker buttons mounted, with stable keys. The URL is the sole selected-SKU source of truth.
2. **Load only unknown routes.** On first entry, refresh, or navigation outside the cached family, use `fetchProductById(id)` followed by `fetchProductVariants(product)`. Include the requested row in the cache even if it is absent from the sibling response. Reuse the existing standalone-product behavior. Cache only the current family for this page instance; no global cache, persistence, or new stale-data policy.
3. **Separate request lifetimes.** Guard commits against the current requested ID/generation and unmount. An abandoned unknown-route response must not replace a later cached selection. Recommendations use a stable family key, including category/pet type inputs used by the existing query, and their own cancellation/generation guard. Switching siblings must neither cancel pending recommendations nor restart/clear them. An actual family change resets recommendations; a failed recommendation request does not block the product or its purchase actions.
4. **Preserve navigation behavior.** Keep `/products/:id` and `navigate(..., { replace: true })` for picker clicks. Selecting the current option is a no-op. Refresh/deep links select the same SKU; browser Back leaves the family as it does today, and Forward returns to the replaced selected-SKU URL. Route changes within the cached family must not force scrolling or focus changes. Do not add route/component keys based on SKU.
5. **Keep selection-owned UI consistent.** Quantity becomes 1 and Added becomes false on an actual selected-ID change; selecting the same option preserves them. Associate transient values with the selected ID so a new render cannot expose the previous SKU's quantity/Added state before effects run. Clear the old Added timer on selection change/unmount and before scheduling another timer. All labels, stock limits, image alt text, cart payloads, and direct-checkout payloads must consume the resolved selected product. Unknown/error routes cannot purchase the previous cached product.
6. **Keep image changes local.** Reserve a stable responsive image frame consistent with the current layout (`product-detail-page.tsx:198`), using `object-contain`. Prefetch only current-family image URLs once after family load; failure must not prevent selection. While the selected image loads, show a neutral placeholder inside that frame, and use a local failed-image state if needed. Never wait for image decoding to update the selected SKU or replace the whole page. Key image load/error state by URL so a late event cannot mark a newer image ready. Respect reduced motion; animation is optional and unnecessary for this fix.
7. **Cold-load failures stay recoverable.** Show the product-loading state only for an uncached ID. On request failure, show an inline error with Retry and Back to Store, scoped to that route. Retry the current ID only. Do not clear a valid family cache because its image/recommendations failed; do not show a stale cached product under an unknown ID.

## Implementation sequence and proof

1. Create `use-product-detail.ts` with the route/cache contract above. Refactor `product-detail-page.tsx` to consume it, remove `loadedId` and the combined per-SKU loading effect, and preserve existing markup/picker semantics. Prove cold SKU entry and standalone items still work; count product requests before/after cached sibling switches.
2. In `product-detail-page.tsx`, scope quantity/Added/timer and image state to selection, reserve the image frame, and preserve focus/scroll. Prove actions immediately after switching use the final SKU and its stock/price; prove no timer from another SKU changes its feedback.
3. Extend `petko-fe/scripts/verify-variations.py` rather than introduce a test stack. Keep mocked authentication/data/mutations and placeholder configuration. Add delayed and failed responses, request counters, and browser observations that catch a transient loader, not just the final screen.

Acceptance checks:

- After one family loads, A → B → A rapidly performs zero additional product/family/recommendation queries, never inserts the full-page loading message, and does not remove/recreate the detail root or picker. Observe DOM mutations from before the first switch; a final locator assertion alone can miss a one-frame flash.
- Delay the initial recommendation response, switch to B, then resolve it: recommendations still appear once for that family. A response for an abandoned different family cannot overwrite the active family.
- Price, stock, SKU, attributes, contents, image URL/alt, and `aria-pressed` agree with the final route ID. Quantity resets to 1. Existing cart quantities still reduce remaining stock for that selected product ID. Add both variations and verify distinct cart lines; Buy Now writes the selected SKU's expected price/image/quantity.
- Pointer switching preserves scroll; keyboard Space/Enter selection retains focus on the same mounted option button. Test at desktop 1280px and mobile 390px, including image failure/delay, with no page overflow or browser exceptions. Inspect screenshots.
- Cold direct link, refresh, same-option click, browser Back/Forward, standalone item, unknown ID, network failure/retry, and navigating away during a delayed load remain correct. During an unknown route's failure/loading state, old-family purchase controls are unavailable.

Implementer verification (repo root, PowerShell; use placeholder values and never read real `.env` files):

```powershell
$env:VERCEL='1'
$env:VITE_SUPABASE_URL='https://example.supabase.co'
$env:VITE_SUPABASE_ANON_KEY='placeholder-anon-key'
npm run lint
npm test -- --runInBand
npm run test:e2e --prefix petko-be -- --runInBand
npm run build
python .agents/skills/webapp-testing/scripts/with_server.py --help
python .agents/skills/webapp-testing/scripts/with_server.py --server "npm.cmd run dev --prefix petko-fe -- --host 127.0.0.1 --port 5174" --port 5174 -- python petko-fe/scripts/verify-variations.py
```

Expected: all commands exit 0, existing checks remain green, extended browser assertions pass, and screenshots show stable detail layout. The browser script's documented helper path is the existing repo precedent; resolve the installed webapp-testing skill's helper if that local path is unavailable. No checks were run while drafting this plan.

## Risk, rollback, and prepared handoff

The main risks are a one-frame fallback caused by effect-only selection, mismatched SKU/action state, late request/image/timer events, and recommendations cancelled on a sibling change. The design and tests above address each directly. Cached price/stock has the same bounded page-session freshness as the existing family response; checkout remains authoritative. No feature flag or schema work is warranted for this small reversible UI fix. Roll back the application change through the normal PR release flow; retain the catalog and variation schema.

Copy-ready handoff to a different frontend engineer (prepare only; do not launch from this planning task):

> Read `AGENTS.md`, `context/CLAUDE.md`, `context/STANDARDS-fe.md`, and this plan. Implement seamless existing product-detail variation switching. Own `petko-fe/src/features/products/use-product-detail.ts`, `petko-fe/src/features/products/product-detail-page.tsx`, and `petko-fe/scripts/verify-variations.py`. You are not alone in the codebase: preserve others' edits. Resolve the selected SKU synchronously from the route and cached family; keep recommendation requests family-scoped; preserve URL replacement, quantity/cart/Buy Now semantics, focus, scroll, and image-frame stability. Do not add checkout/cart editors, database/API changes, dependencies, or a new design system. Use the webapp-testing skill, run the verification and acceptance checks above, and report changed file:line references, real command output, screenshots, and anything unverified. Do not commit, push, deploy, or perform live database/order writes unless separately instructed.

Have the coder execute `docs/plans/2026-11-13-seamless-variation-switching.md` when implementation is requested, with the frontend-engineer role for this UI work.
