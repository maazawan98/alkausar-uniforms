
-- COUPONS
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_name TEXT NOT NULL,
  coupon_code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value NUMERIC(12,2) NOT NULL CHECK (discount_value > 0),
  minimum_order_amount NUMERIC(12,2),
  maximum_discount NUMERIC(12,2),
  usage_limit INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  per_customer_limit INTEGER,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  applicable_modules TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active coupons"
  ON public.coupons FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE TRIGGER coupons_set_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_coupons_code ON public.coupons (coupon_code);
CREATE INDEX idx_coupons_active ON public.coupons (is_active, valid_from, valid_until);

-- COUPON USAGE
CREATE TABLE public.coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  order_id UUID,
  discount_amount NUMERIC(12,2) NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coupon_usage TO authenticated;
GRANT ALL ON public.coupon_usage TO service_role;

ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers see their own coupon usage"
  ON public.coupon_usage FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE INDEX idx_coupon_usage_coupon ON public.coupon_usage (coupon_id);
CREATE INDEX idx_coupon_usage_customer ON public.coupon_usage (customer_id);

-- ORDER SNAPSHOT COLUMNS
ALTER TABLE public.customer_orders
  ADD COLUMN IF NOT EXISTS coupon_id UUID,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS coupon_discount_type TEXT,
  ADD COLUMN IF NOT EXISTS coupon_discount_value NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(12,2) NOT NULL DEFAULT 0;
