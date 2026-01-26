-- Fix profiles RLS policy to prevent email exposure to all users
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Allow admins to view all profiles (needed for user management page)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

-- Allow users to view their own profile only
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);