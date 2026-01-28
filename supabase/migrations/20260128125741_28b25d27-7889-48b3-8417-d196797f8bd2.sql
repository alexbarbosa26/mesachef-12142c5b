-- Drop existing profiles SELECT policies and recreate with proper restrictions
DROP POLICY IF EXISTS "Users can only view their own profile" ON public.profiles;

-- Users can only view their own profile (not admins viewing others)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all profiles (separate policy for admin access)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_admin(auth.uid()));

-- Restrict stock_history to admins only (audit trail should be admin-only)
DROP POLICY IF EXISTS "Authenticated users can view stock_history" ON public.stock_history;

CREATE POLICY "Admins can view stock_history"
ON public.stock_history
FOR SELECT
USING (is_admin(auth.uid()));