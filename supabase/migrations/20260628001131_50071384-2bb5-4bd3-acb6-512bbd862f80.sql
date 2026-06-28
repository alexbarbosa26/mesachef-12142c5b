CREATE OR REPLACE FUNCTION public.prevent_profile_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Backend administrative operations use the service role after validating
  -- the requesting user's permissions in the Edge Function. In PostgREST calls,
  -- auth.role() is the reliable way to identify the service role inside triggers.
  IF auth.role() = 'service_role' OR current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Superadmins bypass all checks
  IF public.is_superadmin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- No one except superadmin may change company_id or user_id
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'Não é permitido alterar company_id do perfil';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Não é permitido alterar user_id do perfil';
  END IF;

  -- Admins can change email/is_active/password_expiry_days on company profiles
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Regular users (self-update) cannot change these
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Não é permitido alterar email do perfil';
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Não é permitido alterar status do perfil';
  END IF;
  IF NEW.password_expiry_days IS DISTINCT FROM OLD.password_expiry_days THEN
    RAISE EXCEPTION 'Não é permitido alterar password_expiry_days';
  END IF;

  RETURN NEW;
END;
$function$;