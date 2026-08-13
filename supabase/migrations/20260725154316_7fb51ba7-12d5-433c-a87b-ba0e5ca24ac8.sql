GRANT SELECT ON public.customer_history TO authenticated;

DROP POLICY IF EXISTS "Customers view own history" ON public.customer_history;
CREATE POLICY "Customers view own history"
  ON public.customer_history
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());