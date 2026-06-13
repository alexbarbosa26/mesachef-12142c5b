
-- 1) Settings: restrict admin SELECT to superadmin only (table is global/platform-wide)
DROP POLICY IF EXISTS "Only admins can view settings" ON public.settings;
CREATE POLICY "Only superadmins can view settings"
  ON public.settings FOR SELECT
  TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- 2) Profiles: enforce column-level restrictions on self-update via PRIVILEGES
--    Only edge functions (service_role) may modify sensitive columns.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Recreate self-update policy with explicit WITH CHECK as defense-in-depth
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
