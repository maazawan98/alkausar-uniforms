ALTER TABLE public.accessories_products ADD COLUMN IF NOT EXISTS customer_sees text NOT NULL DEFAULT '';

UPDATE public.accessories_products ap
SET customer_sees = TRIM(BOTH ' ' FROM
  CONCAT_WS(' ',
    NULLIF(BTRIM(COALESCE(ap.company_name,'')), ''),
    CASE
      WHEN NULLIF(BTRIM(COALESCE(ap.product_name,'')), '') IS NOT NULL
       AND LOWER(BTRIM(COALESCE(ap.product_name,''))) <> LOWER(BTRIM(COALESCE(ap.company_name,'')))
      THEN BTRIM(ap.product_name)
      ELSE NULL
    END,
    c.name
  )
)
FROM public.accessories_categories c
WHERE c.id = ap.category_id;