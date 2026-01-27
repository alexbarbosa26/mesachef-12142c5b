-- Add user management fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS password_expiry_days integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS password_expires_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_password_change timestamp with time zone DEFAULT now();

-- Create password history table for tracking last 10 passwords
CREATE TABLE IF NOT EXISTS public.password_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  password_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on password_history
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

-- Only service role can access password history (for edge functions)
CREATE POLICY "Service role only access" 
ON public.password_history
FOR ALL 
USING (false)
WITH CHECK (false);

-- Update profiles RLS to allow admins to update any profile
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" 
ON public.profiles 
FOR UPDATE 
USING (is_admin(auth.uid()));