
ALTER TABLE public.school_classes ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.school_campuses ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id, (row_number() OVER (PARTITION BY school_id ORDER BY created_at) - 1) AS rn
  FROM public.school_classes
)
UPDATE public.school_classes c SET sort_order = ranked.rn FROM ranked WHERE c.id = ranked.id;

WITH ranked AS (
  SELECT id, (row_number() OVER (PARTITION BY school_id ORDER BY created_at) - 1) AS rn
  FROM public.school_campuses
)
UPDATE public.school_campuses c SET sort_order = ranked.rn FROM ranked WHERE c.id = ranked.id;

CREATE INDEX IF NOT EXISTS school_classes_school_sort_idx ON public.school_classes (school_id, sort_order);
CREATE INDEX IF NOT EXISTS school_campuses_school_sort_idx ON public.school_campuses (school_id, sort_order);
