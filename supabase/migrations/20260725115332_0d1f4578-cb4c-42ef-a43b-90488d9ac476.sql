
CREATE TABLE IF NOT EXISTS public.order_number_sequences (
  day date PRIMARY KEY,
  last_seq integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.order_number_sequences TO service_role;
ALTER TABLE public.order_number_sequences ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d date := (now() AT TIME ZONE 'UTC')::date;
  next_seq integer;
BEGIN
  INSERT INTO public.order_number_sequences (day, last_seq)
  VALUES (d, 1)
  ON CONFLICT (day) DO UPDATE SET last_seq = public.order_number_sequences.last_seq + 1
  RETURNING last_seq INTO next_seq;

  RETURN 'AKU-' || to_char(d, 'YYYYMMDD') || '-' || lpad(next_seq::text, 3, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_order_number() TO authenticated, service_role;
