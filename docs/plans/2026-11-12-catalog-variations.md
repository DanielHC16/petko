# Catalog replacement and product variations

The user authorized replacing the existing catalog, deleting its contents, and updating the database. Migration 007 and the catalog replacement were applied to production on 2026-11-12. Application changes follow the normal feature branch, reviewed PR, merge commit, and Vercel release flow.

## Sources and reconciliation

- Primary: https://docs.google.com/spreadsheets/d/1ubrm8f5shxtVA4aGkVIEgJfxhEQyqBapW1blrDKcJo0/edit — `Database_Feed`, 98 variants/49 families. Its price, stock, details, attributes, and images take precedence over the supplemental sheet.
- Supplemental: https://docs.google.com/spreadsheets/d/1cx9lHWKHn8uSPk81sljhVpQcXbalE65RAFcdkLaOndY/edit — `PetKo_Final_Products_100`, 100 rows. Only Kagat ng Saya Dog Biscuits is absent from the primary sheet; add its 150g pouch (PHP129) and 300g jar (PHP239).
- The two biscuit SKUs receive an explicit initial stock default of 25 each. No ingredient/nutritional analysis was supplied; the generated copy refers customers to the packaging. These are seed assumptions, not a stocktake or a manufacturer analysis.
- The primary sheet's dry-food parent names/descriptions conflict with its pet types and images. Visual inspection of the original packaging, corroborated by the supplemental sheet, establishes Busog at Liksi as cat dry food and Masaganang Sigla as dog dry food. Correct those names/descriptions. Replace conflicting ingredient/analysis copy with packaging guidance; do not invent a formula. Busog packaging identifies chicken/fish; Masaganang flavor is unspecified.
- All other primary details are retained. Non-applicable optional dimensions/analysis stay absent rather than inventing values. SKU identity includes all supplied attributes in the purchase name, including flavors missing from the original variant title.
- Categories map to `food,treats,litter,feeding,accessories,toys,grooming,wellness,bedding,apparel,cleaning,travel`.

Original source snapshots are in `petko-be/data/catalog-primary.json` and `catalog-supplemental.json`; explicit corrections are in `catalog-corrections.json`. `catalog-products.json` is generated. All 100 original images were downloaded and verified as PNGs. Public Googleusercontent image URLs let the live catalog render before application deployment; downloads remain under ignored `.tmp/catalog-images` for verification.

## Data and API contract

Each SKU stays a separate `products` row. New fields are `sku` (unique when supplied), `parent_product_name` (empty for standalone), `variant_attributes` (only size/color/weight_volume/flavor_scent/style, nonblank strings <=100 characters), and ingredients/materials, guaranteed analysis, usage instructions, and safety warnings. Parent names are <=240 characters. Stock is an integer. Additive defaults preserve old requests/rows.

The storefront groups exact parent-name matches, displays the minimum family price, sorts by that displayed price, and keeps complete families when any variant matches search. Selection navigates to a real variant ID and resets quantity. Options expose the actual image, price, stock, and contents; no nonexistent attribute combinations are synthesized. Sold-out rows retain the existing automatic inactive behavior.

Cart uniqueness and checkout continue using product ID. PostgreSQL checkout locks/reserves each SKU and snapshots its generated purchase name, price, and image. Editing variant attributes regenerates names in both the admin form and backend to prevent stale color/flavor labels in future orders; existing order snapshots remain immutable. The cart cache moves once to persistence version 1 to retire obsolete browser cart IDs; current carts survive reloads.

## Production replacement and rollback

`seed-catalog-20261112.sql` runs in one transaction with a product-table lock. It creates a backend-only backup and import marker, snapshots the old catalog, clears old remote carts, deactivates old products, deletes old rows unreferenced by orders, and inserts the 100 deterministic SKU IDs. An existing import marker skips all mutations so a rerun never resets sold inventory.

Verified live immediately after replacement:

| Check | Result |
| --- | ---: |
| Active variants / families | 100 / 50 |
| Old products backed up | 57 |
| Old products archived for order references | 8 |
| Existing order items preserved | 11 |
| Old remote cart rows | 0 |
| Missing variant metadata / invalid image URLs | 0 / 0 |
| Anonymous or authenticated access to backup | denied |
| Production GET `/api/products` | HTTP 200, 100 PetKo products |

`catalog_backup_20261112` and `catalog_import_runs` have RLS and revoked client grants. They contain no exported customer data. Their presence is intentionally independent of application releases.

For an application rollback, retain migration 007's columns/indexes. For a catalog rollback, review inventory reconciliation first, then run `rollback-catalog-20261112.sql`: it archives imported SKUs and restores old catalog rows/visibility, retaining current stock on referenced old rows and all orders. It does not restore discarded carts. It removes the import marker; a populated backup intentionally blocks automatic reimport until manually reviewed. Never run fixture verification SQL against production.

## Verification

- Full root lint, backend unit tests, HTTP e2e tests, and production build run with placeholder environment values and no real environment-file reads.
- Source-integrity tests check counts, category coverage, distinct/deterministic SKUs, source price precedence, biscuit defaults, dry-food reconciliation, image URLs, and SQL escaping.
- In a dedicated disposable PostgreSQL container, schema/migration 007 reruns and `verify-product-variations.sql` pass. Actual checkout covers two variants, independent prices/stock, purchase snapshots after catalog edits, retry idempotency, mismatched retry rejection, and cancellation stock restoration.
- Catalog replacement/rollback verified in a separate isolated database containing an old order and cart: backup completeness, old-product reference retention, cart cleanup, RLS, inventory preservation on rerun, and catalog rollback pass.
- Python Playwright uses mocked auth/data/mutations against a placeholder-configured Vite server. It covers grouping/search/sort, actual SKU selection, image/price/stock changes, quantity reset, separate cart lines, Buy Now, keyboard use, admin edits/canonical names, old-cart migration and reload persistence, error/retry, empty states, and mobile overflow. Desktop/mobile screenshots were inspected under ignored `.tmp/variation-qa`.

No new dependency is added. The integrated branch passes lint, 193 unit tests, 63 HTTP e2e tests, five catalog integrity tests, the production build, and browser verification.
