import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type CalculationType = 'correction' | 'cooking';
export type CalculationAction = 'updated_item' | 'created_item' | 'saved_only';

export interface ProductionCalculation {
  id: string;
  calculation_type: CalculationType;
  food_name: string;
  gross_weight_g: number | null;
  net_weight_g: number | null;
  loss_g: number | null;
  loss_pct: number | null;
  yield_pct: number | null;
  correction_factor: number | null;
  cooking_factor: number | null;
  total_cost: number | null;
  cost_per_kg_gross: number | null;
  cost_per_kg_net: number | null;
  cost_per_g_net: number | null;
  action_taken: CalculationAction;
  linked_item_id: string | null;
  source_calculation_id: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export type NewProductionCalculation = Omit<
  ProductionCalculation,
  'id' | 'created_at' | 'created_by'
>;

export const useProductionCalculations = () => {
  const [calculations, setCalculations] = useState<ProductionCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCalculations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('production_calculations' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching calculations:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar histórico de cálculos',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }
    setCalculations((data as any) || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchCalculations();
  }, [fetchCalculations]);

  const saveCalculation = async (
    payload: NewProductionCalculation
  ): Promise<ProductionCalculation | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const insertPayload: any = { ...payload, created_by: userData.user?.id ?? null };
    const { data, error } = await supabase
      .from('production_calculations' as any)
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Error saving calculation:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
    await fetchCalculations();
    return data as any;
  };

  return { calculations, loading, refetch: fetchCalculations, saveCalculation };
};