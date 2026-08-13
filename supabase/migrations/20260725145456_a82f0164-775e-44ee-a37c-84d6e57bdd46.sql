
-- Extend coupon_usage with snapshot columns
ALTER TABLE public.coupon_usage
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS discount_type text,
  ADD COLUMN IF NOT EXISTS discount_value numeric,
  ADD COLUMN IF NOT EXISTS subtotal_before_discount numeric,
  ADD COLUMN IF NOT EXISTS delivery_charge numeric,
  ADD COLUMN IF NOT EXISTS grand_total numeric;

-- Add coupon_usage_id to customer_orders
ALTER TABLE public.customer_orders
  ADD COLUMN IF NOT EXISTS coupon_usage_id uuid;

-- FKs (guard against duplicates)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_orders_coupon_id_fkey') THEN
    ALTER TABLE public.customer_orders
      ADD CONSTRAINT customer_orders_coupon_id_fkey
      FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupon_usage_order_id_fkey') THEN
    ALTER TABLE public.coupon_usage
      ADD CONSTRAINT coupon_usage_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.customer_orders(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupon_usage_customer_id_fkey') THEN
    ALTER TABLE public.coupon_usage
      ADD CONSTRAINT coupon_usage_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_orders_coupon_usage_id_fkey') THEN
    ALTER TABLE public.customer_orders
      ADD CONSTRAINT customer_orders_coupon_usage_id_fkey
      FOREIGN KEY (coupon_usage_id) REFERENCES public.coupon_usage(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Atomic finalize function: insert coupon_usage, link back to order, increment used_count.
CREATE OR REPLACE FUNCTION public.finalize_coupon_usage(
  p_order_id uuid,
  p_coupon_id uuid,
  p_customer_id uuid,
  p_order_number text,
  p_coupon_code text,
  p_discount_type text,
  p_discount_value numeric,
  p_discount_amount numeric,
  p_subtotal numeric,
  p_delivery_charge numeric,
  p_grand_total numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage_id uuid;
BEGIN
  INSERT INTO public.coupon_usage (
    coupon_id, customer_id, order_id, order_number, coupon_code,
    discount_type, discount_value, discount_amount,
    subtotal_before_discount, delivery_charge, grand_total
  ) VALUES (
    p_coupon_id, p_customer_id, p_order_id, p_order_number, p_coupon_code,
    p_discount_type, p_discount_value, p_discount_amount,
    p_subtotal, p_delivery_charge, p_grand_total
  )
  RETURNING id INTO v_usage_id;

  UPDATE public.customer_orders
    SET coupon_usage_id = v_usage_id
    WHERE id = p_order_id;

  UPDATE public.coupons
    SET used_count = COALESCE(used_count, 0) + 1
    WHERE id = p_coupon_id;

  RETURN v_usage_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_coupon_usage(uuid, uuid, uuid, text, text, text, numeric, numeric, numeric, numeric, numeric) TO authenticated, service_role;
