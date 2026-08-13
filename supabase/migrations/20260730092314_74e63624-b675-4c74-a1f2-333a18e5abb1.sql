
-- 1. Timeline columns
ALTER TABLE public.customer_orders
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_timeline boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_customer_orders_status ON public.customer_orders (status);
CREATE INDEX IF NOT EXISTS idx_customer_orders_created_at ON public.customer_orders (created_at);
CREATE INDEX IF NOT EXISTS idx_customer_orders_timeline ON public.customer_orders (status, auto_timeline, confirmed_at, shipped_at);

-- 2. Permanent revenue ledger
CREATE TABLE IF NOT EXISTS public.revenue_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  order_number text,
  amount numeric NOT NULL,
  reason text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.revenue_events TO service_role;
ALTER TABLE public.revenue_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access to revenue events"
  ON public.revenue_events FOR SELECT TO authenticated USING (false);

CREATE INDEX IF NOT EXISTS idx_revenue_events_occurred_at ON public.revenue_events (occurred_at);

-- 3. Status change trigger: timestamps + revenue ledger
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    -- Revenue ledger: credit on entering delivered, reverse on leaving delivered
    IF NEW.status = 'delivered' AND OLD.status <> 'delivered' THEN
      INSERT INTO public.revenue_events (order_id, order_number, amount, reason)
      VALUES (NEW.id, NEW.order_number, COALESCE(NEW.total, 0), 'delivered');
    ELSIF OLD.status = 'delivered' AND NEW.status <> 'delivered' THEN
      INSERT INTO public.revenue_events (order_id, order_number, amount, reason)
      VALUES (NEW.id, NEW.order_number, -COALESCE(OLD.total, 0), 'reversed_' || NEW.status);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_status_change ON public.customer_orders;
CREATE TRIGGER trg_order_status_change
  BEFORE UPDATE ON public.customer_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_order_status_change();

-- Keep revenue history when an order row is deleted
ALTER TABLE public.revenue_events
  DROP CONSTRAINT IF EXISTS revenue_events_order_id_fkey;

-- 4. Automatic scheduler
CREATE OR REPLACE FUNCTION public.run_order_timeline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Confirmed on Mon/Tue/Wed -> Shipped
  UPDATE public.customer_orders
     SET status = 'shipped'
   WHERE status = 'confirmed'
     AND auto_timeline = true
     AND confirmed_at IS NOT NULL
     AND EXTRACT(DOW FROM (confirmed_at AT TIME ZONE 'Asia/Karachi')) IN (1, 2, 3);

  -- Shipped -> Delivered once the next Friday has arrived
  UPDATE public.customer_orders
     SET status = 'delivered'
   WHERE status = 'shipped'
     AND auto_timeline = true
     AND shipped_at IS NOT NULL
     AND (now() AT TIME ZONE 'Asia/Karachi')::date >=
         ((shipped_at AT TIME ZONE 'Asia/Karachi')::date
           + (((5 - EXTRACT(DOW FROM (shipped_at AT TIME ZONE 'Asia/Karachi'))::int) + 7) % 7));
END;
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'order-timeline-scheduler',
  '*/10 * * * *',
  $$SELECT public.run_order_timeline();$$
);
