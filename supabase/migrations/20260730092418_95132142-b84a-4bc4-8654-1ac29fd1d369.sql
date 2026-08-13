
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats(p_from timestamptz, p_to timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    'delivered', (SELECT count(*) FROM public.customer_orders WHERE status = 'delivered'),
    'cancelled', (SELECT count(*) FROM public.customer_orders WHERE status = 'cancelled'),
    'total_orders', (SELECT count(*) FROM public.customer_orders),
    'total_customers', (SELECT count(*) FROM public.customers),
    'history_customers', (SELECT count(DISTINCT customer_email) FROM public.customer_history),
    'total_reviews', (SELECT count(*) FROM public.reviews),
    'coupon_usage', (SELECT count(*) FROM public.coupon_usage),
    'revenue_today', GREATEST(0, COALESCE((
      SELECT sum(amount) FROM public.revenue_events
      WHERE (occurred_at AT TIME ZONE 'Asia/Karachi')::date = (now() AT TIME ZONE 'Asia/Karachi')::date
    ), 0)),
    'revenue_total', GREATEST(0, COALESCE((SELECT sum(amount) FROM public.revenue_events), 0)),
    'revenue_range', GREATEST(0, COALESCE((
      SELECT sum(amount) FROM public.revenue_events
      WHERE occurred_at >= p_from AND occurred_at < p_to
    ), 0)),
    'orders_range', (
      SELECT count(*) FROM public.customer_orders
      WHERE created_at >= p_from AND created_at < p_to
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_revenue_series(
  p_from timestamptz, p_to timestamptz, p_bucket text DEFAULT 'day'
)
RETURNS TABLE (bucket timestamptz, revenue numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT date_trunc(
           CASE WHEN p_bucket IN ('day','week','month','year') THEN p_bucket ELSE 'day' END,
           occurred_at AT TIME ZONE 'Asia/Karachi'
         ) AT TIME ZONE 'Asia/Karachi' AS bucket,
         GREATEST(0, sum(amount)) AS revenue
    FROM public.revenue_events
   WHERE occurred_at >= p_from AND occurred_at < p_to
   GROUP BY 1
   ORDER BY 1;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_stats(timestamptz, timestamptz) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_revenue_series(timestamptz, timestamptz, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats(timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_revenue_series(timestamptz, timestamptz, text) TO service_role;
