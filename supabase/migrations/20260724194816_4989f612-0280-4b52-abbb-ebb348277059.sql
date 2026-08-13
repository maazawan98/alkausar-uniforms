-- Explicit deny-all policy on admins so linter sees intent (service_role bypasses RLS)
CREATE POLICY "Admins table is server-only"
  ON public.admins FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Revoke EXECUTE on SECURITY DEFINER helpers from public roles
REVOKE EXECUTE ON FUNCTION public.handle_new_customer() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;