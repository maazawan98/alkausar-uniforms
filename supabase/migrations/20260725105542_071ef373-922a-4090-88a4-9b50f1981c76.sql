
-- =========================================================
-- customer_wishlist
-- =========================================================
CREATE TABLE public.customer_wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module text NOT NULL CHECK (module IN ('school','college','medical','accessories')),
  product_id uuid NOT NULL,
  category_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, module, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_wishlist TO authenticated;
GRANT ALL ON public.customer_wishlist TO service_role;
ALTER TABLE public.customer_wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wishlist_owner_all" ON public.customer_wishlist
  FOR ALL TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE INDEX customer_wishlist_customer_idx ON public.customer_wishlist (customer_id, created_at DESC);

-- =========================================================
-- customer_cart
-- =========================================================
CREATE TABLE public.customer_cart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module text NOT NULL CHECK (module IN ('school','college','medical','accessories')),
  product_id uuid NOT NULL,
  category_id uuid NULL,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 999),
  color text NULL,
  size text NULL,
  gender text NULL,
  class_name text NULL,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  product_name text NOT NULL,
  product_image text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, module, product_id, color, size, gender, class_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_cart TO authenticated;
GRANT ALL ON public.customer_cart TO service_role;
ALTER TABLE public.customer_cart ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart_owner_all" ON public.customer_cart
  FOR ALL TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE INDEX customer_cart_customer_idx ON public.customer_cart (customer_id, created_at DESC);

CREATE TRIGGER customer_cart_set_updated_at
  BEFORE UPDATE ON public.customer_cart
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- customer_orders
-- =========================================================
CREATE TABLE public.customer_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NULL,
  country text NOT NULL DEFAULT 'Pakistan',
  city text NOT NULL,
  postal_code text NULL,
  address text NOT NULL,
  delivery_note text NULL,
  payment_method text NOT NULL DEFAULT 'cod',
  items jsonb NOT NULL,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.customer_orders TO authenticated;
GRANT ALL ON public.customer_orders TO service_role;
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_owner_select" ON public.customer_orders
  FOR SELECT TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "orders_owner_insert" ON public.customer_orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE INDEX customer_orders_customer_idx ON public.customer_orders (customer_id, created_at DESC);

CREATE TRIGGER customer_orders_set_updated_at
  BEFORE UPDATE ON public.customer_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
