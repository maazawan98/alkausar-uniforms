
CREATE TABLE public.medical_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  rating NUMERIC(3,1) NOT NULL DEFAULT 5 CHECK (rating >= 0 AND rating <= 5),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_deal BOOLEAN NOT NULL DEFAULT false,
  is_out_of_stock BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT medical_products_name_unique UNIQUE (name)
);
GRANT SELECT ON public.medical_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_products TO authenticated;
GRANT ALL ON public.medical_products TO service_role;
ALTER TABLE public.medical_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active medical products" ON public.medical_products FOR SELECT USING (is_active = true);
CREATE POLICY "Medical products server-managed" ON public.medical_products FOR ALL USING (false);

CREATE TABLE public.medical_product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.medical_products(id) ON DELETE CASCADE,
  image TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX medical_product_images_primary_uidx ON public.medical_product_images(product_id) WHERE is_primary;
GRANT SELECT ON public.medical_product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_product_images TO authenticated;
GRANT ALL ON public.medical_product_images TO service_role;
ALTER TABLE public.medical_product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read medical product images" ON public.medical_product_images FOR SELECT USING (true);
CREATE POLICY "Medical product images server-managed" ON public.medical_product_images FOR ALL USING (false);

CREATE TABLE public.medical_product_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.medical_products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price > 0),
  sale_price NUMERIC(10,2) CHECK (sale_price IS NULL OR sale_price > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (product_id, size)
);
GRANT SELECT ON public.medical_product_sizes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_product_sizes TO authenticated;
GRANT ALL ON public.medical_product_sizes TO service_role;
ALTER TABLE public.medical_product_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read medical product sizes" ON public.medical_product_sizes FOR SELECT USING (true);
CREATE POLICY "Medical product sizes server-managed" ON public.medical_product_sizes FOR ALL USING (false);

CREATE TABLE public.medical_product_colours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.medical_products(id) ON DELETE CASCADE,
  colour_name TEXT NOT NULL,
  hex_code TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT ON public.medical_product_colours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_product_colours TO authenticated;
GRANT ALL ON public.medical_product_colours TO service_role;
ALTER TABLE public.medical_product_colours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read medical product colours" ON public.medical_product_colours FOR SELECT USING (true);
CREATE POLICY "Medical product colours server-managed" ON public.medical_product_colours FOR ALL USING (false);

CREATE TABLE public.medical_product_quality_tags (
  product_id UUID NOT NULL REFERENCES public.medical_products(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (product_id, tag)
);
GRANT SELECT ON public.medical_product_quality_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_product_quality_tags TO authenticated;
GRANT ALL ON public.medical_product_quality_tags TO service_role;
ALTER TABLE public.medical_product_quality_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read medical product tags" ON public.medical_product_quality_tags FOR SELECT USING (true);
CREATE POLICY "Medical product tags server-managed" ON public.medical_product_quality_tags FOR ALL USING (false);

CREATE TABLE public.medical_product_genders (
  product_id UUID NOT NULL REFERENCES public.medical_products(id) ON DELETE CASCADE,
  gender TEXT NOT NULL,
  PRIMARY KEY (product_id, gender)
);
GRANT SELECT ON public.medical_product_genders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_product_genders TO authenticated;
GRANT ALL ON public.medical_product_genders TO service_role;
ALTER TABLE public.medical_product_genders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read medical product genders" ON public.medical_product_genders FOR SELECT USING (true);
CREATE POLICY "Medical product genders server-managed" ON public.medical_product_genders FOR ALL USING (false);

CREATE TRIGGER medical_products_set_updated_at
BEFORE UPDATE ON public.medical_products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
