-- 1. FIX: profiles_table_public_exposure (ERROR)
-- Drop existing overly permissive SELECT policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create proper restrictive policy: users see only their own profile, admins see all
CREATE POLICY "Users can only view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- 2. FIX: settings_table_unrestricted_read (WARN)
-- Restrict settings to admins only
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.settings;

CREATE POLICY "Only admins can view settings" 
ON public.settings 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Also allow authenticated users to view specific non-sensitive settings
CREATE POLICY "Authenticated users can view non-sensitive settings" 
ON public.settings 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND key IN ('expiry_alert_days', 'low_stock_percentage')
);