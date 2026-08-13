ALTER TABLE public.customer_orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending_verification',
  ADD COLUMN IF NOT EXISTS payment_screenshot TEXT;