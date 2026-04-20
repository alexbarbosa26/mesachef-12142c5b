import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';

export interface StockAdjustment {
  id: string;
  stock_item_id: string;
  snapshot_id: string | null;
  theoretical_quantity: number;
  physical_quantity: number;
  difference: number;
  adjustment_type: 'perda' | 'quebra' | 'erro_operacional';
  value_impact: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useStockAdjustments = () => {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { logAction } = useAuditLog();

  const fetchAdjustments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('stock_adjustments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching adjustments:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar ajustes', variant: 'destructive' });
    }
    setAdjustments((data as StockAdjustment[]) || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  const createAdjustment = async (adjustment: {
    stock_item_id: string;
    snapshot_id?: string;
    theoretical_quantity: number;
    physical_quantity: number;
    adjustment_type: 'perda' | 'quebra' | 'erro_operacional';
    value_impact: number;
    notes?: string;
  }) => {
    const difference = adjustment.physical_quantity - adjustment.theoretical_quantity;

    const { data, error } = await supabase
      .from('stock_adjustments')
      .insert({
        stock_item_id: adjustment.stock_item_id,
        snapshot_id: adjustment.snapshot_id || null,
        theoretical_quantity: adjustment.theoretical_quantity,
        physical_quantity: adjustment.physical_quantity,
        difference,
        adjustment_type: adjustment.adjustment_type,
        value_impact: adjustment.value_impact,
        notes: adjustment.notes || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao registrar ajuste', variant: 'destructive' });
      return null;
    }

    // Update stock item quantity to physical count
    await supabase
      .from('stock_items')
      .update({ current_quantity: adjustment.physical_quantity })
      .eq('id', adjustment.stock_item_id);

    await logAction({
      action: 'CREATE',
      entity_type: 'stock_adjustment',
      entity_id: data.id,
      details: {
        stock_item_id: adjustment.stock_item_id,
        type: adjustment.adjustment_type,
        difference,
        value_impact: adjustment.value_impact,
      },
    });

    await fetchAdjustments();
    toast({ title: 'Sucesso', description: 'Ajuste registrado com sucesso!' });
    return data;
  };

  const deleteAdjustment = async (id: string) => {
    const { error } = await supabase.from('stock_adjustments').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir ajuste', variant: 'destructive' });
      return false;
    }
    await logAction({ action: 'DELETE', entity_type: 'stock_adjustment', entity_id: id });
    await fetchAdjustments();
    toast({ title: 'Sucesso', description: 'Ajuste excluído!' });
    return true;
  };

  return { adjustments, loading, refetch: fetchAdjustments, createAdjustment, deleteAdjustment };
};