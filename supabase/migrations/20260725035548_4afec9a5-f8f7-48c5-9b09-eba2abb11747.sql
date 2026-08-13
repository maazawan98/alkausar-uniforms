
-- Enum for boys/girls collection (reuse existing school_collection_type)

-- Colleges
CREATE TABLE public.colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  logo text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.colleges TO anon;
GRANT SELECT ON public.colleges TO authenticated;
GRANT ALL ON public.colleges TO service_role;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active colleges" ON public.colleges FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Colleges table is server-managed" ON public.colleges TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER colleges_set_updated_at BEFORE UPDATE ON public.colleges FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Categories
CREATE TABLE public.college_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE RESTRICT,
  collection_type public.school_collection_type NOT NULL,
  name text NOT NULL,
  image text,
  show_on_homepage boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT college_categories_unique UNIQUE (college_id, collection_type, name)
);
CREATE INDEX college_categories_college_id_idx ON public.college_categories(college_id, collection_type);
GRANT SELECT ON public.college_categories TO authenticated;
GRANT ALL ON public.college_categories TO service_role;
ALTER TABLE public.college_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "College categories server-managed" ON public.college_categories TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER college_categories_set_updated_at BEFORE UPDATE ON public.college_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Classes / Levels
CREATE TABLE public.college_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT college_classes_unique_per_college UNIQUE (college_id, name)
);
CREATE INDEX college_classes_college_id_idx ON public.college_classes(college_id);
CREATE INDEX college_classes_college_sort_idx ON public.college_classes(college_id, sort_order);
GRANT SELECT ON public.college_classes TO authenticated;
GRANT ALL ON public.college_classes TO service_role;
ALTER TABLE public.college_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "College classes server-managed" ON public.college_classes TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER college_classes_set_updated_at BEFORE UPDATE ON public.college_classes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Campuses
CREATE TABLE public.college_campuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  campus_name text,
  country text NOT NULL DEFAULT 'Pakistan',
  city text NOT NULL,
  area text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX college_campuses_unique_location ON public.college_campuses
  (college_id, lower(country), lower(city), lower(area), lower(COALESCE(campus_name, '')));
CREATE INDEX college_campuses_college_id_idx ON public.college_campuses(college_id);
CREATE INDEX college_campuses_college_sort_idx ON public.college_campuses(college_id, sort_order);
GRANT SELECT ON public.college_campuses TO authenticated;
GRANT ALL ON public.college_campuses TO service_role;
ALTER TABLE public.college_campuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "College campuses server-managed" ON public.college_campuses TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER college_campuses_set_updated_at BEFORE UPDATE ON public.college_campuses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Products
CREATE TABLE public.college_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.college_categories(id) ON DELETE CASCADE,
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
CREATE INDEX college_products_scope_idx ON public.college_products(college_id, category_id, collection_type);
CREATE UNIQUE INDEX college_products_unique_name_per_scope ON public.college_products
  (college_id, collection_type, category_id, lower(name));
GRANT SELECT ON public.college_products TO authenticated;
GRANT ALL ON public.college_products TO service_role;
ALTER TABLE public.college_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "College products server-managed" ON public.college_products TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER college_products_set_updated_at BEFORE UPDATE ON public.college_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Product sizes
CREATE TABLE public.college_product_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.college_products(id) ON DELETE CASCADE,
  size text NOT NULL,
  price numeric(12,2) NOT NULL CHECK (price > 0),
  sale_price numeric(12,2) CHECK (sale_price IS NULL OR sale_price > 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX college_product_sizes_product_idx ON public.college_product_sizes(product_id, sort_order);
CREATE UNIQUE INDEX college_product_sizes_unique ON public.college_product_sizes(product_id, lower(size));
GRANT SELECT ON public.college_product_sizes TO authenticated;
GRANT ALL ON public.college_product_sizes TO service_role;
ALTER TABLE public.college_product_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "College product sizes server-managed" ON public.college_product_sizes TO authenticated USING (false) WITH CHECK (false);

-- Product images
CREATE TABLE public.college_product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.college_products(id) ON DELETE CASCADE,
  image text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX college_product_images_product_idx ON public.college_product_images(product_id, sort_order);
CREATE UNIQUE INDEX college_product_images_one_primary ON public.college_product_images(product_id) WHERE is_primary;
GRANT SELECT ON public.college_product_images TO authenticated;
GRANT ALL ON public.college_product_images TO service_role;
ALTER TABLE public.college_product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "College product images server-managed" ON public.college_product_images TO authenticated USING (false) WITH CHECK (false);

-- Product colours
CREATE TABLE public.college_product_colours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.college_products(id) ON DELETE CASCADE,
  colour_name text NOT NULL,
  hex_code text NOT NULL CHECK (hex_code ~* '^#[0-9a-f]{6}$'),
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX college_product_colours_product_idx ON public.college_product_colours(product_id, sort_order);
GRANT SELECT ON public.college_product_colours TO authenticated;
GRANT ALL ON public.college_product_colours TO service_role;
ALTER TABLE public.college_product_colours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "College product colours server-managed" ON public.college_product_colours TO authenticated USING (false) WITH CHECK (false);

-- Product quality tags
CREATE TABLE public.college_product_quality_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.college_products(id) ON DELETE CASCADE,
  tag text NOT NULL,
  CONSTRAINT college_product_quality_tags_unique UNIQUE (product_id, tag)
);
GRANT SELECT ON public.college_product_quality_tags TO authenticated;
GRANT ALL ON public.college_product_quality_tags TO service_role;
ALTER TABLE public.college_product_quality_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "College product tags server-managed" ON public.college_product_quality_tags TO authenticated USING (false) WITH CHECK (false);

-- Product campuses (link)
CREATE TABLE public.college_product_campuses (
  product_id uuid NOT NULL REFERENCES public.college_products(id) ON DELETE CASCADE,
  campus_id uuid NOT NULL REFERENCES public.college_campuses(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, campus_id)
);
CREATE INDEX college_product_campuses_campus_idx ON public.college_product_campuses(campus_id);
GRANT SELECT ON public.college_product_campuses TO authenticated;
GRANT ALL ON public.college_product_campuses TO service_role;
ALTER TABLE public.college_product_campuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "College product campuses server-managed" ON public.college_product_campuses TO authenticated USING (false) WITH CHECK (false);

-- Product classes (link size -> level)
CREATE TABLE public.college_product_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.college_products(id) ON DELETE CASCADE,
  product_size_id uuid NOT NULL REFERENCES public.college_product_sizes(id) ON DELETE CASCADE,
  college_class_id uuid NOT NULL REFERENCES public.college_classes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT college_product_classes_unique UNIQUE (product_size_id, college_class_id)
);
CREATE INDEX college_product_classes_product_idx ON public.college_product_classes(product_id);
CREATE INDEX college_product_classes_class_idx ON public.college_product_classes(college_class_id);
CREATE INDEX college_product_classes_size_idx ON public.college_product_classes(product_size_id);
GRANT SELECT ON public.college_product_classes TO authenticated;
GRANT ALL ON public.college_product_classes TO service_role;
ALTER TABLE public.college_product_classes ENABLE ROW LEVEL SECURITY;
