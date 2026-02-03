-- Add email settings to settings table
INSERT INTO public.settings (key, value) VALUES
  ('smtp_host', ''),
  ('smtp_port', '587'),
  ('smtp_secure', 'tls'),
  ('smtp_user', ''),
  ('smtp_password', ''),
  ('smtp_from_email', ''),
  ('smtp_from_name', 'MesaChef')
ON CONFLICT (key) DO NOTHING;