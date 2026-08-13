## Phase 1 — Complete Customer Shopping Flow

Ship wishlist, cart, buy-now, checkout, order placement, and My Orders across School / College / Medical / Accessories modules with COD only.

### 1. Database (single migration)

Three new tables in `public`, all RLS-scoped to `auth.uid() = customer_id`, all with GRANTs to `authenticated` + `service_role`.

```text
customer_wishlist
  id, customer_id (auth.users), module (school|college|medical|accessories),
  product_id (uuid), category_id (uuid null), created_at
  UNIQUE (customer_id, module, product_id)

customer_cart
  id, customer_id, module, product_id, category_id,
  quantity int, color text, size text, gender text, class_name text,
  unit_price numeric, product_name text, product_image text,
  created_at, updated_at
  UNIQUE (customer_id, module, product_id, color, size, gender, class_name)

customer_orders
  id, customer_id, order_number text unique (ALK-YYYYMMDD-XXXX),
  status text default 'pending',
  full_name, email, phone,
  country, city, postal_code, address, delivery_note,
  payment_method text default 'cod',
  items jsonb  -- array of line items with module/category/product/name/image/color/size/gender/class/qty/unit_price/total
  subtotal numeric, total numeric,
  created_at, updated_at
```

Items live as `jsonb` on the order row (simpler, avoids 4 FK graphs across module-scoped product tables; matches "snapshot at time of order" semantics).

RLS: customer can select/insert/update/delete their own rows in wishlist/cart; select/insert their own orders (no update/delete). Service role bypasses.

### 2. Server functions (`src/lib/shop.functions.ts`)

All use `requireSupabaseAuth`.

- `listWishlist`, `toggleWishlist({module, productId, categoryId})`, `removeWishlist(id)`
- `listCart`, `addToCart(lineItem)` (upserts qty), `updateCartQty(id, qty)`, `removeCart(id)`, `clearCartItems(ids)`
- `placeOrder({shipping, items, paymentMethod})` — writes order, generates order number, deletes matching cart + wishlist rows, returns `{orderNumber, orderId}`
- `listMyOrders`, `getMyOrder(id)`
- `getCustomerProfile` — reads `customers` row for checkout auto-fill

### 3. Pending-action redirect flow

`src/lib/pending-action.ts` — sessionStorage helpers:
- `setPendingAction({ kind: 'wishlist'|'cart'|'buynow', payload, returnTo })`
- On mount of any page, `useConsumePendingAction()` hook: if user just logged in and pending exists, execute + navigate.

`AccountModal` on successful auth closes and triggers consumption. Add-to-cart / wishlist / buy-now handlers: if `!user` → save pending → open AccountModal (or navigate to `/auth`-style modal).

### 4. UI components

- `src/components/site/WishlistButton.tsx` — heart overlay for cards (absolute top-right), outlined→filled red, uses `toggleWishlist`.
- Update `ProductBrowseCard.tsx` — add WishlistButton overlay.
- Update `ProductDetailsView.tsx` — Add-to-Cart + Buy-Now + wishlist heart; passes selected color/size/gender/class/qty.
- `Header.tsx` — add Heart + Cart icons with live counts (TanStack Query subscriptions to `listWishlist`/`listCart`, `enabled: !!user`).

### 5. New routes

```text
/wishlist         → list + remove + move-to-cart
/cart             → list + qty +/- + remove (with confirm) + "Checkout" CTA
/checkout         → form + order summary sidebar + Place Order
/orders           → my orders list (customer only)
/orders/$id       → order detail
```

All under top-level (public route files) but each page checks auth via `useAuthUser` → if not logged in, show sign-in CTA that opens AccountModal.

Checkout form: react-hook-form + zod. Auto-fill from `getCustomerProfile`. Country default "Pakistan". Payment: COD (selected), Online Payment card disabled with "Coming Soon" badge. Coupon + Delivery Charges rows shown disabled with "Coming Soon".

Order Success: shadcn `Dialog` with order number, summary, "View My Orders" → `/orders`, "Continue Shopping" → `/accessories`.

### 6. Buy Now

`ProductDetailsView` Buy-Now → stores selection in `sessionStorage['buynow']` and navigates to `/checkout?mode=buynow`. Checkout reads either cart or buynow payload.

### 7. Consistency across modules

`module` string threaded through cards, details, cart, order items. Product image href helpers already exist per module — reuse for order/cart display.

### Technical notes

- No changes to existing product/category schemas.
- Cart/wishlist counts: `useQuery` with `staleTime: 30s`; invalidate after every mutation.
- Order number: `ALK-` + yyyymmdd + 4-digit random; retry on unique violation.
- Cleanup: `placeOrder` handler deletes cart rows whose `(module, product_id)` matches any ordered item, and wishlist rows likewise.
- No admin-order UI in this phase (out of scope).
- Regression pass: manual smoke via Playwright on `/accessories` end-to-end after implementation.

### Out of scope (explicitly deferred)

- Online payment, bank details, screenshot upload
- Coupons, delivery charge calculation
- Admin order management screens
- Order status transitions beyond `pending`
