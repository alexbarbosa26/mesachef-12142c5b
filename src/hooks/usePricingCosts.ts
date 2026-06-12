import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface PricingFixedCost {
  id: string;
  name: string;
  amount: number;
  is_active: boolean;
}

export interface PricingVariableCost {
  id: string;
  name: string;
  percentage: number;
  is_active: boolean;
}

export function usePricingFixedCosts() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['pricing-fixed-costs'],
    queryFn: async () => {
      if (!isAdmin) return [] as PricingFixedCost[];
      const { data, error } = await supabase
        .from('pricing_fixed_costs')
        .select('id,name,amount,is_active')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PricingFixedCost[];
    },
    enabled: isAdmin,
  });
}

export function usePricingVariableCosts() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['pricing-variable-costs'],
    queryFn: async () => {
      if (!isAdmin) return [] as PricingVariableCost[];
      const { data, error } = await supabase
        .from('pricing_variable_costs')
        .select('id,name,percentage,is_active')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PricingVariableCost[];
    },
    enabled: isAdmin,
  });
}

export function useUpsertFixedCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PricingFixedCost> & { name: string; amount: number; is_active?: boolean }) => {
      if (input.id) {
        const { data, error } = await supabase
          .from('pricing_fixed_costs')
          .update({ name: input.name, amount: input.amount, is_active: input.is_active ?? true })
          .eq('id', input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('pricing_fixed_costs')
        .insert({ name: input.name, amount: input.amount, is_active: input.is_active ?? true })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pricing-fixed-costs'] });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteFixedCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pricing_fixed_costs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-fixed-costs'] }),
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useUpsertVariableCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PricingVariableCost> & { name: string; percentage: number; is_active?: boolean }) => {
      if (input.id) {
        const { data, error } = await supabase
          .from('pricing_variable_costs')
          .update({ name: input.name, percentage: input.percentage, is_active: input.is_active ?? true })
          .eq('id', input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('pricing_variable_costs')
        .insert({ name: input.name, percentage: input.percentage, is_active: input.is_active ?? true })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-variable-costs'] }),
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteVariableCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pricing_variable_costs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pricing-variable-costs'] }),
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
}