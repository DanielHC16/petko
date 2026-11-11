# Auto-Deactivate Out-Of-Stock Products Design

## Goal
Automatically deem any product with stock `<= 0` as INACTIVE (`is_active = false`), removing it from customer-facing storefront queries and reflecting it accurately in admin management dashboards.

## Architecture & Layers

1. **Database Tier (`migration-006-auto-deactivate-out-of-stock.sql`)**:
   - `handle_product_stock_status()` trigger function sets `NEW.is_active := false` whenever `NEW.stock <= 0`.
   - `trg_product_stock_status` trigger fires `BEFORE INSERT OR UPDATE OF stock, is_active ON public.products`.
   - Synchronizes existing out-of-stock products: `UPDATE public.products SET is_active = false WHERE stock <= 0 AND is_active = true`.

2. **Backend Services (`ProductsService`)**:
   - `create`: Enforces `is_active = false` if `dto.stock <= 0`.
   - `update`: Automatically sets `is_active = false` if `dto.stock <= 0`. Rejects attempts to activate (`is_active = true`) any product whose stock is `<= 0` with `BadRequestException('Cannot activate a product that is out of stock.')`.

3. **Admin UI (`admin-products-page.tsx`)**:
   - Active count metric filters strictly for active products in stock: `products.filter(p => p.is_active && p.stock > 0).length`.
   - Status badge in table rows renders `○ Inactive` and disables the toggle button when `product.stock <= 0`.
   - Add/Edit modal automatically disables and unchecks "Publish to Storefront" when stock is 0 or less, with a descriptive helper hint.
