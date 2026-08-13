
CREATE TABLE public.sizings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  size_label TEXT NOT NULL,
  size TEXT NOT NULL,
  measurement_unit TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.sizings TO service_role;
ALTER TABLE public.sizings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sizings server-managed" ON public.sizings FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE public.sizing_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sizing_id UUID NOT NULL REFERENCES public.sizings(id) ON DELETE CASCADE,
  measurement_label TEXT NOT NULL,
  measurement_value NUMERIC(10,3) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sizing_id, measurement_label)
);
GRANT ALL ON public.sizing_measurements TO service_role;
ALTER TABLE public.sizing_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sizing measurements server-managed" ON public.sizing_measurements FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE INDEX idx_sizing_measurements_sizing ON public.sizing_measurements(sizing_id, sort_order);
CREATE INDEX idx_sizings_created ON public.sizings(created_at DESC);

CREATE TRIGGER trg_sizings_updated_at BEFORE UPDATE ON public.sizings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sizing_measurements_updated_at BEFORE UPDATE ON public.sizing_measurements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
