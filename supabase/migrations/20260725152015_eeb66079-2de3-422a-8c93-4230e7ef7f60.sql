
ALTER TABLE public.customer_orders
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS public.customer_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.customer_orders(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  order_date timestamptz NOT NULL,
  order_status text NOT NULL,

  customer_id uuid,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,

  country text,
  city text,
  postal_code text,
  address text,
  delivery_note text,

  payment_method text,
  payment_status text,
  payment_screenshot text,
  payment_verified_at timestamptz,

  coupon_id uuid,
  coupon_code text,
  coupon_discount_type text,
  coupon_discount_value numeric,
  coupon_discount numeric NOT NULL DEFAULT 0,

  delivery_charge numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,

  items jsonb NOT NULL DEFAULT '[]'::jsonb,

  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_history_customer_id_idx ON public.customer_history(customer_id);
CREATE INDEX IF NOT EXISTS customer_history_email_idx ON public.customer_history(customer_email);
CREATE INDEX IF NOT EXISTS customer_history_confirmed_at_idx ON public.customer_history(confirmed_at DESC);

GRANT ALL ON public.customer_history TO service_role;

ALTER TABLE public.customer_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_history_service_role_only"
  ON public.customer_history FOR ALL
  USING (false) WITH CHECK (false);
