
CREATE TABLE public.accessories_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.accessories_classes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accessories_classes TO authenticated;
GRANT ALL ON public.accessories_classes TO service_role;
ALTER TABLE public.accessories_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read accessories classes" ON public.accessories_classes FOR SELECT TO public USING (true);
CREATE POLICY "Auth manage accessories classes" ON public.accessories_classes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_accessories_classes_updated
BEFORE UPDATE ON public.accessories_classes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.accessories_product_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessory_product_id UUID NOT NULL REFERENCES public.accessories_products(id) ON DELETE CASCADE,
  product_size_id UUID NOT NULL REFERENCES public.accessories_product_sizes(id) ON DELETE CASCADE,
  accessory_class_id UUID NOT NULL REFERENCES public.accessories_classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_size_id, accessory_class_id)
);
CREATE INDEX idx_accessories_product_classes_product ON public.accessories_product_classes(accessory_product_id);
CREATE INDEX idx_accessories_product_classes_size ON public.accessories_product_classes(product_size_id);
GRANT SELECT ON public.accessories_product_classes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accessories_product_classes TO authenticated;
GRANT ALL ON public.accessories_product_classes TO service_role;
ALTER TABLE public.accessories_product_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read accessories product classes" ON public.accessories_product_classes FOR SELECT TO public USING (true);
CREATE POLICY "Auth manage accessories product classes" ON public.accessories_product_classes FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.accessories_classes (name, sort_order) VALUES
  ('Nursery', 1),
  ('KG', 2),
  ('Class 1', 3),
  ('Class 2', 4),
  ('Class 3', 5),
  ('Class 4', 6),
  ('Class 5', 7),
  ('Class 6', 8),
  ('Class 7', 9),
  ('Class 8', 10),
  ('Class 9', 11),
  ('Class 10', 12),
  ('Class 11', 13),
  ('Class 12', 14)
ON CONFLICT (name) DO NOTHING;
