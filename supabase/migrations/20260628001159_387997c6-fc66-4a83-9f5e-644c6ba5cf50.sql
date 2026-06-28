REVOKE ALL ON FUNCTION public.prevent_profile_self_escalation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_profile_self_escalation() FROM anon;
REVOKE ALL ON FUNCTION public.prevent_profile_self_escalation() FROM authenticated;