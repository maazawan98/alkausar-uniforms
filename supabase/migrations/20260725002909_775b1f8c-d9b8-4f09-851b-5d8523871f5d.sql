
-- products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.school_categories(id) ON DELETE CASCADE,
  collection_type text NOT NULL CHECK (collection_type IN ('boys','girls')),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  rating numeric(2,1) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  is_featured boolean NOT NULL DEFAULT false,
  is_deal boolean NOT NULL DEFAULT false,
  is_out_of_stock boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX products_unique_name_per_scope
  ON public.products (school_id, collection_type, category_id, lower(name));
CREATE INDEX products_school_cat_idx ON public.products (school_id, category_id, collection_type);
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products server-managed" ON public.products FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- product_images
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_images_product_idx ON public.product_images (product_id, sort_order);
CREATE UNIQUE INDEX product_images_one_primary ON public.product_images (product_id) WHERE is_primary;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product images server-managed" ON public.product_images FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- product_sizes
CREATE TABLE public.product_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size text NOT NULL,
  price numeric(12,2) NOT NULL CHECK (price > 0),
  sale_price numeric(12,2) CHECK (sale_price IS NULL OR sale_price > 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX product_sizes_unique ON public.product_sizes (product_id, lower(size));
CREATE INDEX product_sizes_product_idx ON public.product_sizes (product_id, sort_order);
GRANT ALL ON public.product_sizes TO service_role;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product sizes server-managed" ON public.product_sizes FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- product_campuses
CREATE TABLE public.product_campuses (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  campus_id uuid NOT NULL REFERENCES public.school_campuses(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, campus_id)
);
CREATE INDEX product_campuses_campus_idx ON public.product_campuses (campus_id);
GRANT ALL ON public.product_campuses TO service_role;
ALTER TABLE public.product_campuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product campuses server-managed" ON public.product_campuses FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- product_quality_tags
CREATE TABLE public.product_quality_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tag text NOT NULL
);
CREATE UNIQUE INDEX product_quality_tags_unique ON public.product_quality_tags (product_id, tag);
GRANT ALL ON public.product_quality_tags TO service_role;
ALTER TABLE public.product_quality_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product tags server-managed" ON public.product_quality_tags FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- product_colours
CREATE TABLE public.product_colours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  colour_name text NOT NULL,
  hex_code text NOT NULL CHECK (hex_code ~* '^#[0-9a-f]{6}$'),
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX product_colours_product_idx ON public.product_colours (product_id, sort_order);
GRANT ALL ON public.product_colours TO service_role;
ALTER TABLE public.product_colours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product colours server-managed" ON public.product_colours FOR ALL TO authenticated USING (false) WITH CHECK (false);
