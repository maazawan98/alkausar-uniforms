CREATE TABLE public.product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  module text NOT NULL CHECK (module IN ('school','college','medical','accessories')),
  type_name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_types_product_idx ON public.product_types (module, product_id, display_order);

GRANT SELECT ON public.product_types TO anon, authenticated;
GRANT ALL ON public.product_types TO service_role;

ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read product types" ON public.product_types FOR SELECT USING (true);
CREATE POLICY "Product types server-managed" ON public.product_types FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TRIGGER product_types_set_updated_at
BEFORE UPDATE ON public.product_types
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();