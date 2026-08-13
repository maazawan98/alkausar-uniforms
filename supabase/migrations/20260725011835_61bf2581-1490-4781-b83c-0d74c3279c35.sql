
CREATE TABLE public.product_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_size_id UUID NOT NULL REFERENCES public.product_sizes(id) ON DELETE CASCADE,
  school_class_id UUID NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_size_id, school_class_id)
);

GRANT ALL ON public.product_classes TO service_role;

ALTER TABLE public.product_classes ENABLE ROW LEVEL SECURITY;

CREATE INDEX product_classes_product_idx ON public.product_classes(product_id);
CREATE INDEX product_classes_size_idx ON public.product_classes(product_size_id);
CREATE INDEX product_classes_class_idx ON public.product_classes(school_class_id);
