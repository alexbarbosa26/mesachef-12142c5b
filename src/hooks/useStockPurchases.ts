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
  supplier_id: string | null;
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

  const updatePurchase = async (id: string, updates: Partial<StockPurchase>) => {
    const { data: original, error: fetchError } = await supabase
      .from('stock_purchases')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !original) {
      toast({ title: 'Erro', description: 'Compra não encontrada', variant: 'destructive' });
      return null;
    }

    const newQuantity = updates.quantity ?? original.quantity;
    const newUnitCost = updates.unit_cost ?? original.unit_cost;
    const totalCost = newQuantity * newUnitCost;

    const payload = { ...updates, quantity: newQuantity, unit_cost: newUnitCost, total_cost: totalCost };

    const { data, error } = await supabase
      .from('stock_purchases')
      .update(payload as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao atualizar compra', variant: 'destructive' });
      return null;
    }

    // Adjust stock item quantity by the delta
    const quantityDelta = newQuantity - original.quantity;
    const targetItemId = updates.stock_item_id ?? original.stock_item_id;

    if (updates.stock_item_id && updates.stock_item_id !== original.stock_item_id) {
      // Item changed: subtract from old item, add full new quantity to new item
      const { data: oldItem } = await supabase
        .from('stock_items')
        .select('current_quantity')
        .eq('id', original.stock_item_id)
        .single();
      if (oldItem) {
        await supabase
          .from('stock_items')
          .update({ current_quantity: oldItem.current_quantity - original.quantity })
          .eq('id', original.stock_item_id);
      }
      const { data: newItem } = await supabase
        .from('stock_items')
        .select('current_quantity')
        .eq('id', updates.stock_item_id)
        .single();
      if (newItem) {
        await supabase
          .from('stock_items')
          .update({ current_quantity: newItem.current_quantity + newQuantity })
          .eq('id', updates.stock_item_id);
      }
    } else if (quantityDelta !== 0) {
      const { data: item } = await supabase
        .from('stock_items')
        .select('current_quantity')
        .eq('id', targetItemId)
        .single();
      if (item) {
        await supabase
          .from('stock_items')
          .update({ current_quantity: item.current_quantity + quantityDelta })
          .eq('id', targetItemId);
      }
    }

    await logAction({
      action: 'UPDATE',
      entity_type: 'stock_purchase',
      entity_id: id,
      details: { before: original, after: data },
    });

    await fetchPurchases();
    toast({ title: 'Sucesso', description: 'Compra atualizada com sucesso!' });
    return data;
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
    updatePurchase,
    getPurchasesByItem,
    getPurchasesByPeriod,
    getTotalPurchasesValue,
  };
};