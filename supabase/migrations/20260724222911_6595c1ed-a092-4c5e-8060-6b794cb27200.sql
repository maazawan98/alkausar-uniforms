
ALTER TABLE public.school_campuses DROP CONSTRAINT IF EXISTS school_campuses_unique_per_school;
ALTER TABLE public.school_campuses RENAME COLUMN name TO campus_name;
ALTER TABLE public.school_campuses ALTER COLUMN campus_name DROP NOT NULL;
ALTER TABLE public.school_campuses ADD COLUMN country text;
ALTER TABLE public.school_campuses ADD COLUMN city text;
ALTER TABLE public.school_campuses ADD COLUMN area text;

UPDATE public.school_campuses
SET country = 'Pakistan',
    city    = COALESCE(NULLIF(city, ''), 'Unknown'),
    area    = COALESCE(NULLIF(area, ''), 'Unknown')
WHERE country IS NULL OR city IS NULL OR area IS NULL;

ALTER TABLE public.school_campuses ALTER COLUMN country SET NOT NULL;
ALTER TABLE public.school_campuses ALTER COLUMN city SET NOT NULL;
ALTER TABLE public.school_campuses ALTER COLUMN area SET NOT NULL;
ALTER TABLE public.school_campuses ALTER COLUMN country SET DEFAULT 'Pakistan';

CREATE UNIQUE INDEX school_campuses_unique_location
  ON public.school_campuses (school_id, lower(country), lower(city), lower(area), lower(COALESCE(campus_name, '')));
