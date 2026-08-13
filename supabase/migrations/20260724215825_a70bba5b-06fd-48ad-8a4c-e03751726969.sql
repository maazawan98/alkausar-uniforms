-- Enum for boys/girls collections
CREATE TYPE public.school_collection_type AS ENUM ('boys', 'girls');

-- Schools table
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  logo TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT schools_name_unique UNIQUE (name),
  CONSTRAINT schools_slug_unique UNIQUE (slug)
);
GRANT SELECT ON public.schools TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active schools" ON public.schools
  FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Schools table is server-managed" ON public.schools
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER schools_set_updated_at BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Classes
CREATE TABLE public.school_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT school_classes_unique_per_school UNIQUE (school_id, name)
);
GRANT SELECT ON public.school_classes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_classes TO authenticated;
GRANT ALL ON public.school_classes TO service_role;
ALTER TABLE public.school_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Classes server-managed" ON public.school_classes
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER school_classes_set_updated_at BEFORE UPDATE ON public.school_classes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Campuses
CREATE TABLE public.school_campuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT school_campuses_unique_per_school UNIQUE (school_id, name)
);
GRANT SELECT ON public.school_campuses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_campuses TO authenticated;
GRANT ALL ON public.school_campuses TO service_role;
ALTER TABLE public.school_campuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Campuses server-managed" ON public.school_campuses
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER school_campuses_set_updated_at BEFORE UPDATE ON public.school_campuses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Categories (boys/girls)
CREATE TABLE public.school_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  collection_type public.school_collection_type NOT NULL,
  name TEXT NOT NULL,
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT school_categories_unique UNIQUE (school_id, collection_type, name)
);
GRANT SELECT ON public.school_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_categories TO authenticated;
GRANT ALL ON public.school_categories TO service_role;
ALTER TABLE public.school_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories server-managed" ON public.school_categories
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER school_categories_set_updated_at BEFORE UPDATE ON public.school_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX school_classes_school_id_idx ON public.school_classes(school_id);
CREATE INDEX school_campuses_school_id_idx ON public.school_campuses(school_id);
CREATE INDEX school_categories_school_id_idx ON public.school_categories(school_id, collection_type);