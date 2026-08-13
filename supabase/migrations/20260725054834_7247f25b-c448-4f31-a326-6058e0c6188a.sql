
-- ============ Accessories Categories ============
CREATE TABLE public.accessories_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  image text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accessories_categories_name_unique UNIQUE (name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accessories_categories TO authenticated;
GRANT SELECT ON public.accessories_categories TO anon;
GRANT ALL ON public.accessories_categories TO service_role;
ALTER TABLE public.accessories_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read accessories categories" ON public.accessories_categories FOR SELECT USING (true);
CREATE POLICY "Auth manage accessories categories" ON public.accessories_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ Accessories Products ============
CREATE TABLE public.accessories_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.accessories_categories(id) ON DELETE RESTRICT,
  product_name text,
  company_name text,
  description text NOT NULL DEFAULT '',
  rating numeric(2,1) NOT NULL DEFAULT 5,
  is_featured boolean NOT NULL DEFAULT false,
  is_deal boolean NOT NULL DEFAULT false,
  is_out_of_stock boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accessories_products_name_or_company CHECK (
    coalesce(nullif(btrim(product_name), ''), nullif(btrim(company_name), '')) IS NOT NULL
  )
);
CREATE INDEX accessories_products_category_idx ON public.accessories_products(category_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accessories_products TO authenticated;
GRANT SELECT ON public.accessories_products TO anon;
GRANT ALL ON public.accessories_products TO service_role;
ALTER TABLE public.accessories_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read accessories products" ON public.accessories_products FOR SELECT USING (true);
CREATE POLICY "Auth manage accessories products" ON public.accessories_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ Sub-tables ============
CREATE TABLE public.accessories_product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.accessories_products(id) ON DELETE CASCADE,
  image text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX accessories_product_images_product_idx ON public.accessories_product_images(product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accessories_product_images TO authenticated;
GRANT SELECT ON public.accessories_product_images TO anon;
GRANT ALL ON public.accessories_product_images TO service_role;
ALTER TABLE public.accessories_product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read accessories images" ON public.accessories_product_images FOR SELECT USING (true);
CREATE POLICY "Auth manage accessories images" ON public.accessories_product_images FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.accessories_product_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.accessories_products(id) ON DELETE CASCADE,
  size text NOT NULL,
  price numeric(12,2) NOT NULL,
  sale_price numeric(12,2),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX accessories_product_sizes_product_idx ON public.accessories_product_sizes(product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accessories_product_sizes TO authenticated;
GRANT SELECT ON public.accessories_product_sizes TO anon;
GRANT ALL ON public.accessories_product_sizes TO service_role;
ALTER TABLE public.accessories_product_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read accessories sizes" ON public.accessories_product_sizes FOR SELECT USING (true);
CREATE POLICY "Auth manage accessories sizes" ON public.accessories_product_sizes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.accessories_product_colours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.accessories_products(id) ON DELETE CASCADE,
  colour_name text NOT NULL,
  hex_code text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX accessories_product_colours_product_idx ON public.accessories_product_colours(product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accessories_product_colours TO authenticated;
GRANT SELECT ON public.accessories_product_colours TO anon;
GRANT ALL ON public.accessories_product_colours TO service_role;
ALTER TABLE public.accessories_product_colours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read accessories colours" ON public.accessories_product_colours FOR SELECT USING (true);
CREATE POLICY "Auth manage accessories colours" ON public.accessories_product_colours FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.accessories_product_quality_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.accessories_products(id) ON DELETE CASCADE,
  tag text NOT NULL,
  UNIQUE (product_id, tag)
);
CREATE INDEX accessories_product_quality_tags_product_idx ON public.accessories_product_quality_tags(product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accessories_product_quality_tags TO authenticated;
GRANT SELECT ON public.accessories_product_quality_tags TO anon;
GRANT ALL ON public.accessories_product_quality_tags TO service_role;
ALTER TABLE public.accessories_product_quality_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read accessories tags" ON public.accessories_product_quality_tags FOR SELECT USING (true);
CREATE POLICY "Auth manage accessories tags" ON public.accessories_product_quality_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.accessories_product_genders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.accessories_products(id) ON DELETE CASCADE,
  gender text NOT NULL,
  UNIQUE (product_id, gender)
);
CREATE INDEX accessories_product_genders_product_idx ON public.accessories_product_genders(product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accessories_product_genders TO authenticated;
GRANT SELECT ON public.accessories_product_genders TO anon;
GRANT ALL ON public.accessories_product_genders TO service_role;
ALTER TABLE public.accessories_product_genders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read accessories genders" ON public.accessories_product_genders FOR SELECT USING (true);
CREATE POLICY "Auth manage accessories genders" ON public.accessories_product_genders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ updated_at triggers ============
CREATE TRIGGER accessories_categories_set_updated_at BEFORE UPDATE ON public.accessories_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER accessories_products_set_updated_at BEFORE UPDATE ON public.accessories_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
