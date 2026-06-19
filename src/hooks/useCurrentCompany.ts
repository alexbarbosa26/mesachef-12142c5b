import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook central para obter o company_id do usuário autenticado.
 * Cacheia o resultado e expõe estados de loading/erro.
 * Use este hook em qualquer query multiempresa para garantir escopo.
 */
export function useCurrentCompany() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['current-company', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.company_id as string | null) ?? null;
    },
  });

  return {
    companyId: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}
