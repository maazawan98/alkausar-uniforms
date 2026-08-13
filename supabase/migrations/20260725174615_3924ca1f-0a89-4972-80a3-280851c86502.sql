CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.customer_orders(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_email TEXT,
  customer_phone TEXT,
  customer_photo TEXT,
  product_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  module TEXT NOT NULL,
  category TEXT,
  review_title TEXT,
  review_text TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','deleted')),
  featured_on_homepage BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_by UUID,
  rejected_at TIMESTAMPTZ,
  deleted_by UUID,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX reviews_unique_customer_order_product
  ON public.reviews (customer_id, order_id, product_id);

CREATE INDEX reviews_status_idx ON public.reviews (status);
CREATE INDEX reviews_product_idx ON public.reviews (module, product_id);
CREATE INDEX reviews_featured_idx ON public.reviews (featured_on_homepage) WHERE featured_on_homepage = true;

GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Customer can view own reviews (any status)
CREATE POLICY "reviews_select_own"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Public can view approved reviews (product pages, homepage)
CREATE POLICY "reviews_select_approved_public"
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

-- Customer can insert own review; only for their own delivered order and their own customer_id
CREATE POLICY "reviews_insert_own_for_delivered"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.customer_orders o
      WHERE o.id = reviews.order_id
        AND o.customer_id = auth.uid()
        AND o.status = 'delivered'
    )
  );

CREATE TRIGGER reviews_set_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();