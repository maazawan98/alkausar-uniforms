CREATE INDEX IF NOT EXISTS idx_customer_orders_status_created ON public.customer_orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_orders_created_at ON public.customer_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_orders_delivered_at ON public.customer_orders (delivered_at);
CREATE INDEX IF NOT EXISTS idx_revenue_events_order_id ON public.revenue_events (order_id);

-- Revenue trigger: idempotent credits/reversals, append-only ledger
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance numeric;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'confirmed' THEN
      NEW.confirmed_at := now();
      NEW.shipped_at := NULL;
      NEW.delivered_at := NULL;
      NEW.auto_timeline := true;
    ELSIF NEW.status = 'shipped' THEN
      NEW.shipped_at := now();
      NEW.delivered_at := NULL;
      IF NEW.confirmed_at IS NULL THEN NEW.confirmed_at := now(); END IF;
    ELSIF NEW.status = 'delivered' THEN
      NEW.delivered_at := now();
      NEW.auto_timeline := false;
    ELSIF NEW.status IN ('pending', 'cancelled') THEN
      NEW.auto_timeline := false;
    END IF;

    SELECT COALESCE(sum(amount), 0) INTO v_balance
      FROM public.revenue_events WHERE order_id = NEW.id;

    IF NEW.status = 'delivered' AND OLD.status <> 'delivered' THEN
      -- credit only if this order currently has no outstanding credit
      IF v_balance = 0 THEN
        INSERT INTO public.revenue_events (order_id, order_number, amount, reason)
        VALUES (NEW.id, NEW.order_number, COALESCE(NEW.total, 0), 'delivered');
      END IF;
    ELSIF OLD.status = 'delivered' AND NEW.status <> 'delivered' THEN
      -- reverse only if there is an outstanding credit to reverse
      IF v_balance > 0 THEN
        INSERT INTO public.revenue_events (order_id, order_number, amount, reason)
        VALUES (NEW.id, NEW.order_number, -v_balance, 'reversed_' || NEW.status);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Scheduler: re-verify status per row right before transitioning
CREATE OR REPLACE FUNCTION public.run_order_timeline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM public.customer_orders
     WHERE status = 'confirmed'
       AND auto_timeline = true
       AND confirmed_at IS NOT NULL
       AND EXTRACT(DOW FROM (confirmed_at AT TIME ZONE 'Asia/Karachi')) IN (1, 2, 3)
     FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.customer_orders
       SET status = 'shipped'
     WHERE id = r.id
       AND status = 'confirmed'
       AND auto_timeline = true;
  END LOOP;

  FOR r IN
    SELECT id FROM public.customer_orders
     WHERE status = 'shipped'
       AND auto_timeline = true
       AND shipped_at IS NOT NULL
       AND (now() AT TIME ZONE 'Asia/Karachi')::date >=
           ((shipped_at AT TIME ZONE 'Asia/Karachi')::date
             + (((5 - EXTRACT(DOW FROM (shipped_at AT TIME ZONE 'Asia/Karachi'))::int) + 7) % 7))
     FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.customer_orders
       SET status = 'delivered'
     WHERE id = r.id
       AND status = 'shipped'
       AND auto_timeline = true;
  END LOOP;
END;
$function$;

-- Extended dashboard stats
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats(p_from timestamp with time zone, p_to timestamp with time zone)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH rev_total AS (SELECT GREATEST(0, COALESCE(sum(amount), 0)) AS v FROM public.revenue_events),
       del_total AS (SELECT count(*) AS v FROM public.customer_orders WHERE status = 'delivered'),
       coupons_created AS (SELECT count(*) AS v FROM public.coupons),
       coupons_used AS (SELECT count(*) AS v FROM public.coupon_usage)
  SELECT jsonb_build_object(
    'total_products', (
      (SELECT count(*) FROM public.products WHERE is_active)
      + (SELECT count(*) FROM public.college_products WHERE is_active)
      + (SELECT count(*) FROM public.medical_products WHERE is_active)
      + (SELECT count(*) FROM public.accessories_products WHERE is_active)
    ),
    'pending', (SELECT count(*) FROM public.customer_orders WHERE status = 'pending'),
    'confirmed', (SELECT count(*) FROM public.customer_orders WHERE status = 'confirmed'),
    'shipped', (SELECT count(*) FROM public.customer_orders WHERE status = 'shipped'),
    'delivered', (SELECT v FROM del_total),
    'cancelled', (SELECT count(*) FROM public.customer_orders WHERE status = 'cancelled'),
    'total_orders', (SELECT count(*) FROM public.customer_orders),
    'total_customers', (SELECT count(*) FROM public.customers),
    'history_customers', (SELECT count(DISTINCT customer_email) FROM public.customer_history),
    'total_reviews', (SELECT count(*) FROM public.reviews),
    'coupon_usage', (SELECT v FROM coupons_used),
    'coupons_created', (SELECT v FROM coupons_created),
    'coupons_used', (SELECT v FROM coupons_used),
    'coupon_usage_percent', CASE WHEN (SELECT v FROM coupons_created) > 0
      THEN round(((SELECT v FROM coupons_used)::numeric * 100) / (SELECT v FROM coupons_created), 1)
      ELSE 0 END,
    'revenue_today', GREATEST(0, COALESCE((
      SELECT sum(amount) FROM public.revenue_events
      WHERE (occurred_at AT TIME ZONE 'Asia/Karachi')::date = (now() AT TIME ZONE 'Asia/Karachi')::date
    ), 0)),
    'revenue_total', (SELECT v FROM rev_total),
    'revenue_range', GREATEST(0, COALESCE((
      SELECT sum(amount) FROM public.revenue_events
      WHERE occurred_at >= p_from AND occurred_at < p_to
    ), 0)),
    'orders_range', (
      SELECT count(*) FROM public.customer_orders
      WHERE created_at >= p_from AND created_at < p_to
    ),
    'delivered_range', (
      SELECT count(*) FROM public.customer_orders
      WHERE status = 'delivered' AND delivered_at >= p_from AND delivered_at < p_to
    ),
    'coupon_usage_range', (
      SELECT count(*) FROM public.coupon_usage WHERE used_at >= p_from AND used_at < p_to
    ),
    'avg_order_value', CASE WHEN (SELECT v FROM del_total) > 0
      THEN round((SELECT v FROM rev_total) / (SELECT v FROM del_total), 2) ELSE 0 END
  );
$function$;

-- Top selling products (delivered orders only)
CREATE OR REPLACE FUNCTION public.admin_top_products(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer DEFAULT 10)
RETURNS TABLE(product_id text, product_name text, module text, quantity bigint, revenue numeric, orders bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT (it->>'product_id')::text AS product_id,
         max(it->>'product_name') AS product_name,
         max(it->>'module') AS module,
         sum(COALESCE((it->>'quantity')::numeric, 0))::bigint AS quantity,
         sum(COALESCE((it->>'total_price')::numeric, 0)) AS revenue,
         count(DISTINCT o.id)::bigint AS orders
    FROM public.customer_orders o
    CROSS JOIN LATERAL jsonb_array_elements(o.items) AS it
   WHERE o.status = 'delivered'
     AND o.delivered_at >= p_from AND o.delivered_at < p_to
   GROUP BY 1
   ORDER BY quantity DESC, revenue DESC
   LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 50));
$function$;

-- Recent orders within range
CREATE OR REPLACE FUNCTION public.admin_recent_orders(p_from timestamp with time zone, p_to timestamp with time zone, p_limit integer DEFAULT 10)
RETURNS TABLE(id uuid, order_number text, full_name text, email text, total numeric, status text, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT o.id, o.order_number, o.full_name, o.email, o.total, o.status, o.created_at
    FROM public.customer_orders o
   WHERE o.created_at >= p_from AND o.created_at < p_to
   ORDER BY o.created_at DESC
   LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 50));
$function$;