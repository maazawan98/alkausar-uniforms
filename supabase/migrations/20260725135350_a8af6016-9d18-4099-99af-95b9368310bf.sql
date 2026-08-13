
CREATE TABLE public.business_information (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  whatsapp_number TEXT,
  landline_number TEXT,
  address TEXT NOT NULL,
  google_maps_link TEXT,
  business_description TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  whatsapp_url TEXT,
  tiktok_url TEXT,
  youtube_url TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  opening_time TIME NOT NULL,
  closing_time TIME NOT NULL,
  working_days TEXT[] NOT NULL DEFAULT '{}',
  business_note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.business_information TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_information TO authenticated;
GRANT ALL ON public.business_information TO service_role;

ALTER TABLE public.business_information ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active business information"
  ON public.business_information FOR SELECT
  USING (is_active = true);

-- Admin writes go through service role (supabaseAdmin) so no user-level write policy is needed.

CREATE UNIQUE INDEX business_information_only_one_active
  ON public.business_information (is_active) WHERE is_active = true;

CREATE TRIGGER trg_business_information_updated_at
  BEFORE UPDATE ON public.business_information
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
