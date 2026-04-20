import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useStockData } from '@/hooks/useStockData';
import { useStockPurchases } from '@/hooks/useStockPurchases';
import { calculateItemTotalValue } from '@/utils/stockValuation';

export interface CMVSnapshot {
  id: string;
  period_start: string;
  period_end: string;
  initial_stock_value: number;
  purchases_value: number;
  final_stock_value: number;
  theoretical_cmv: number;
  real_cmv: number;
  difference_value: number;
  difference_pct: number;
  status: 'normal' | 'alerta' | 'critico';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useCMVSnapshots = () => {
  const [snapshots, setSnapshots] = useState<CMVSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { logAction } = useAuditLog();

  const fetchSnapshots = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cmv_snapshots')
      .select('*')
      .order('period_end', { ascending: false });

    if (error) {
      console.error('Error fetching snapshots:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar snapshots', variant: 'destructive' });
    }
    setSnapshots((data as CMVSnapshot[]) || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const generateSnapshot = async (
    periodStart: string,
    periodEnd: string,
    stockItems: Array<{ id: string; current_quantity: number; unit: string; value: number | null; is_active: boolean }>,
    purchases: Array<{ purchase_date: string; total_cost: number }>,
    initialStockValue: number,
    realCMV?: number,
    notes?: string
  ) => {
    const finalStockValue = stockItems
      .filter((i) => i.is_active)
      .reduce((sum, i) => sum + calculateItemTotalValue(i), 0);

    const purchasesValue = purchases
      .filter((p) => p.purchase_date >= periodStart && p.purchase_date <= periodEnd)
      .reduce((sum, p) => sum + p.total_cost, 0);

    const theoreticalCMV = initialStockValue + purchasesValue - finalStockValue;
    const actualRealCMV = realCMV ?? theoreticalCMV;
    const differenceValue = actualRealCMV - theoreticalCMV;
    const differencePct = theoreticalCMV !== 0 ? (differenceValue / theoreticalCMV) * 100 : 0;

    let status: 'normal' | 'alerta' | 'critico' = 'normal';
    if (Math.abs(differencePct) > 10) status = 'critico';
    else if (Math.abs(differencePct) > 5) status = 'alerta';

    const { data, error } = await supabase
      .from('cmv_snapshots')
      .insert({
        period_start: periodStart,
        period_end: periodEnd,
        initial_stock_value: initialStockValue,
        purchases_value: purchasesValue,
        final_stock_value: finalStockValue,
        theoretical_cmv: theoreticalCMV,
        real_cmv: actualRealCMV,
        difference_value: differenceValue,
        difference_pct: differencePct,
        status,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao gerar snapshot', variant: 'destructive' });
      return null;
    }

    await logAction({
      action: 'CREATE',
      entity_type: 'cmv_snapshot',
      entity_id: data.id,
      details: { period_start: periodStart, period_end: periodEnd, theoretical_cmv: theoreticalCMV, status },
    });

    await fetchSnapshots();
    toast({ title: 'Sucesso', description: 'Snapshot CMV gerado com sucesso!' });
    return data;
  };

  const deleteSnapshot = async (id: string) => {
    const { error } = await supabase.from('cmv_snapshots').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir snapshot', variant: 'destructive' });
      return false;
    }
    await logAction({ action: 'DELETE', entity_type: 'cmv_snapshot', entity_id: id });
    await fetchSnapshots();
    toast({ title: 'Sucesso', description: 'Snapshot excluído!' });
    return true;
  };

  return { snapshots, loading, refetch: fetchSnapshots, generateSnapshot, deleteSnapshot };
};