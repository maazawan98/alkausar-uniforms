ALTER TABLE public.medical_products
  ADD COLUMN IF NOT EXISTS show_on_homepage boolean NOT NULL DEFAULT false;

ALTER TABLE public.accessories_categories
  ADD COLUMN IF NOT EXISTS show_on_homepage boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_medical_products_show_on_homepage
  ON public.medical_products (show_on_homepage) WHERE show_on_homepage;

CREATE INDEX IF NOT EXISTS idx_accessories_categories_show_on_homepage
  ON public.accessories_categories (show_on_homepage) WHERE show_on_homepage;