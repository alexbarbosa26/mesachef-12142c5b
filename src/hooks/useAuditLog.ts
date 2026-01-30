import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

interface AuditLogEntry {
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
}

export const useAuditLog = () => {
  const { user } = useAuth();

  const logAction = async (entry: AuditLogEntry) => {
    if (!user) return;

    try {
      // Use the secure SECURITY DEFINER function to create audit logs
      // This prevents malicious users from directly inserting fake audit entries
      await supabase.rpc('create_audit_log', {
        p_user_id: user.id,
        p_action: entry.action,
        p_entity_type: entry.entity_type,
        p_entity_id: entry.entity_id || null,
        p_details: (entry.details as Json) || null,
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  };

  return { logAction };
};
