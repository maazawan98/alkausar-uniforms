
CREATE TABLE public.advertisements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_path TEXT NOT NULL,
  title TEXT,
  description TEXT,
  redirect_url TEXT,
  display_priority INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.advertisements TO anon;
GRANT SELECT ON public.advertisements TO authenticated;
GRANT ALL ON public.advertisements TO service_role;

ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active advertisements"
ON public.advertisements FOR SELECT
USING (is_active = true);

CREATE TRIGGER set_advertisements_updated_at
BEFORE UPDATE ON public.advertisements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX advertisements_active_priority_idx
ON public.advertisements (is_active, display_priority);
