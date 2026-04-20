import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';

export interface StockPurchase {
  id: string;
  stock_item_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  supplier_name: string | null;
  purchase_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useStockPurchases = () => {
  const [purchases, setPurchases] = useState<StockPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { logAction } = useAuditLog();

  const fetchPurchases = useCallback(async (startDate?: string, endDate?: string) => {
    setLoading(true);
    let query = supabase
      .from('stock_purchases')
      .select('*')
      .order('purchase_date', { ascending: false });

    if (startDate) query = query.gte('purchase_date', startDate);
    if (endDate) query = query.lte('purchase_date', endDate);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching purchases:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar compras', variant: 'destructive' });
      setLoading(false);
      return;
    }

    setPurchases(data || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const addPurchase = async (purchase: Partial<StockPurchase>) => {
    const totalCost = (purchase.quantity || 0) * (purchase.unit_cost || 0);
    const payload = { ...purchase, total_cost: totalCost };

    const { data, error } = await supabase
      .from('stock_purchases')
      .insert(payload as any)
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao registrar compra', variant: 'destructive' });
      return null;
    }

    // Update stock item quantity
    if (purchase.stock_item_id && purchase.quantity) {
      const { data: item } = await supabase
        .from('stock_items')
        .select('current_quantity')
        .eq('id', purchase.stock_item_id)
        .single();

      if (item) {
        await supabase
          .from('stock_items')
          .update({ current_quantity: item.current_quantity + purchase.quantity })
          .eq('id', purchase.stock_item_id);
      }
    }

    await logAction({
      action: 'CREATE',
      entity_type: 'stock_purchase',
      entity_id: data.id,
      details: {
        stock_item_id: purchase.stock_item_id,
        quantity: purchase.quantity,
        unit_cost: purchase.unit_cost,
        total_cost: totalCost,
      },
    });

    await fetchPurchases();
    toast({ title: 'Sucesso', description: 'Compra registrada com sucesso!' });
    return data;
  };

  const deletePurchase = async (id: string) => {
    const { error } = await supabase.from('stock_purchases').delete().eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir compra', variant: 'destructive' });
      return false;
    }

    await logAction({ action: 'DELETE', entity_type: 'stock_purchase', entity_id: id });
    await fetchPurchases();
    toast({ title: 'Sucesso', description: 'Compra excluída!' });
    return true;
  };

  const getPurchasesByItem = (itemId: string) => {
    return purchases.filter((p) => p.stock_item_id === itemId);
  };

  const getPurchasesByPeriod = (startDate: string, endDate: string) => {
    return purchases.filter(
      (p) => p.purchase_date >= startDate && p.purchase_date <= endDate
    );
  };

  const getTotalPurchasesValue = (startDate?: string, endDate?: string) => {
    let filtered = purchases;
    if (startDate && endDate) {
      filtered = getPurchasesByPeriod(startDate, endDate);
    }
    return filtered.reduce((sum, p) => sum + p.total_cost, 0);
  };

  return {
    purchases,
    loading,
    refetch: fetchPurchases,
    addPurchase,
    deletePurchase,
    getPurchasesByItem,
    getPurchasesByPeriod,
    getTotalPurchasesValue,
  };
};