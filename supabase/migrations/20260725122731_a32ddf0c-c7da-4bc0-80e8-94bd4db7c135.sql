
CREATE TABLE public.delivery_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_charge numeric(10,2) NOT NULL CHECK (delivery_charge >= 0),
  instruction text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.delivery_charges TO authenticated;
GRANT ALL ON public.delivery_charges TO service_role;

ALTER TABLE public.delivery_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read delivery charges"
  ON public.delivery_charges FOR SELECT
  TO authenticated
  USING (true);

CREATE UNIQUE INDEX delivery_charges_single_active
  ON public.delivery_charges (is_active)
  WHERE is_active = true;

CREATE TRIGGER trg_delivery_charges_updated_at
  BEFORE UPDATE ON public.delivery_charges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.customer_orders
  ADD COLUMN IF NOT EXISTS delivery_charge numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_instruction text;
