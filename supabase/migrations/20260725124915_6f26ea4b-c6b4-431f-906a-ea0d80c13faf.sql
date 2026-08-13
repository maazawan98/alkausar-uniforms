
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  account_title text NOT NULL,
  account_number text NOT NULL,
  iban_number text,
  display_order integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bank_accounts_display_order_positive CHECK (display_order > 0)
);

CREATE UNIQUE INDEX bank_accounts_display_order_unique
  ON public.bank_accounts (display_order);

GRANT SELECT ON public.bank_accounts TO authenticated, anon;
GRANT ALL ON public.bank_accounts TO service_role;

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bank accounts"
  ON public.bank_accounts FOR SELECT
  USING (is_active = true);

CREATE TRIGGER bank_accounts_set_updated_at
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
