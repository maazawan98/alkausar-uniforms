
CREATE TABLE public.customer_query (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  query_type text NOT NULL CHECK (query_type IN ('Newsletter','Contact')),
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'New' CHECK (status IN ('New','Read','Replied')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX customer_query_newsletter_unique_customer
  ON public.customer_query (customer_id)
  WHERE query_type = 'Newsletter' AND customer_id IS NOT NULL;

CREATE UNIQUE INDEX customer_query_newsletter_unique_email
  ON public.customer_query (lower(customer_email))
  WHERE query_type = 'Newsletter';

CREATE INDEX customer_query_type_created_idx
  ON public.customer_query (query_type, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_query TO authenticated;
GRANT ALL ON public.customer_query TO service_role;

ALTER TABLE public.customer_query ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_query_own_insert"
  ON public.customer_query FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "customer_query_own_select"
  ON public.customer_query FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE TRIGGER customer_query_set_updated_at
  BEFORE UPDATE ON public.customer_query
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
