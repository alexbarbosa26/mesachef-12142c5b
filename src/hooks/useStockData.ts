import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface StockItem {
  id: string;
  category_id: string;
  name: string;
  unit: string;
  value: number | null;
  minimum_stock: number;
  current_quantity: number;
  count_date: string | null;
  expiry_date: string | null;
  responsible_user: string | null;
}

export interface StockItemWithCategory extends StockItem {
  category: Category;
}

export const useStockData = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { logAction } = useAuditLog();

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar categorias',
        variant: 'destructive',
      });
      return;
    }

    setCategories(data || []);
  };

  const fetchStockItems = async () => {
    const { data, error } = await supabase
      .from('stock_items')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching stock items:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar itens de estoque',
        variant: 'destructive',
      });
      return;
    }

    setStockItems(data || []);
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchCategories(), fetchStockItems()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // CRUD operations for categories
  const addCategory = async (name: string) => {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao adicionar categoria',
        variant: 'destructive',
      });
      return null;
    }

    await logAction({
      action: 'CREATE',
      entity_type: 'category',
      entity_id: data.id,
      details: { name },
    });

    await fetchCategories();
    toast({ title: 'Sucesso', description: 'Categoria adicionada!' });
    return data;
  };

  const updateCategory = async (id: string, name: string) => {
    const { error } = await supabase
      .from('categories')
      .update({ name })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar categoria',
        variant: 'destructive',
      });
      return false;
    }

    await logAction({
      action: 'UPDATE',
      entity_type: 'category',
      entity_id: id,
      details: { name },
    });

    await fetchCategories();
    toast({ title: 'Sucesso', description: 'Categoria atualizada!' });
    return true;
  };

  const deleteCategory = async (id: string) => {
    const category = categories.find((c) => c.id === id);
    const { error } = await supabase.from('categories').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir categoria',
        variant: 'destructive',
      });
      return false;
    }

    await logAction({
      action: 'DELETE',
      entity_type: 'category',
      entity_id: id,
      details: { name: category?.name },
    });

    await fetchAll();
    toast({ title: 'Sucesso', description: 'Categoria excluída!' });
    return true;
  };

  // CRUD operations for stock items
  const addStockItem = async (item: Partial<StockItem>) => {
    const { data, error } = await supabase
      .from('stock_items')
      .insert(item as any)
      .select()
      .single();
    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao adicionar item',
        variant: 'destructive',
      });
      return null;
    }

    await logAction({
      action: 'CREATE',
      entity_type: 'stock_item',
      entity_id: data.id,
      details: { name: item.name, category_id: item.category_id },
    });

    await fetchStockItems();
    toast({ title: 'Sucesso', description: 'Item adicionado!' });
    return data;
  };

  const updateStockItem = async (id: string, updates: Partial<StockItem>) => {
    const item = stockItems.find((i) => i.id === id);
    const { error } = await supabase
      .from('stock_items')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar item',
        variant: 'destructive',
      });
      return false;
    }

    await logAction({
      action: 'UPDATE',
      entity_type: 'stock_item',
      entity_id: id,
      details: { name: item?.name, updates },
    });

    await fetchStockItems();
    return true;
  };

  const deleteStockItem = async (id: string) => {
    const item = stockItems.find((i) => i.id === id);
    const { error } = await supabase.from('stock_items').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir item',
        variant: 'destructive',
      });
      return false;
    }

    await logAction({
      action: 'DELETE',
      entity_type: 'stock_item',
      entity_id: id,
      details: { name: item?.name },
    });

    await fetchStockItems();
    toast({ title: 'Sucesso', description: 'Item excluído!' });
    return true;
  };

  // Bulk update for stock entry
  const bulkUpdateStock = async (
    updates: Array<{
      id: string;
      current_quantity: number;
      expiry_date: string | null;
      count_date: string;
      responsible_user?: string;
    }>
  ) => {
    // Capture previous values for audit logging
    const previousValues = updates.map((update) => {
      const item = stockItems.find((i) => i.id === update.id);
      return {
        id: update.id,
        name: item?.name,
        previous_quantity: item?.current_quantity,
        new_quantity: update.current_quantity,
        previous_expiry: item?.expiry_date,
        new_expiry: update.expiry_date,
      };
    });

    const promises = updates.map((update) => {
      const updatePayload: Record<string, any> = {
        current_quantity: update.current_quantity,
        expiry_date: update.expiry_date,
        count_date: update.count_date,
      };
      if (update.responsible_user) {
        updatePayload.responsible_user = update.responsible_user;
      }
      return supabase
        .from('stock_items')
        .update(updatePayload)
        .eq('id', update.id)
        .select();
    });

    const results = await Promise.all(promises);
    const errors = results.filter((r) => r.error);
    const silentFailures = results.filter((r) => !r.error && (!r.data || r.data.length === 0));

    if (errors.length > 0 || silentFailures.length > 0) {
      const totalFailed = errors.length + silentFailures.length;
      toast({
        title: 'Erro de permissão',
        description: `${totalFailed} item(ns) não puderam ser atualizados. Verifique se você tem permissão para editar esses itens.`,
        variant: 'destructive',
      });
      return false;
    }

    // Log bulk stock update
    await logAction({
      action: 'BULK_STOCK_UPDATE',
      entity_type: 'stock_items',
      details: {
        items_updated: updates.length,
        changes: previousValues.map((pv) => ({
          item_id: pv.id,
          item_name: pv.name,
          quantity_change: `${pv.previous_quantity} → ${pv.new_quantity}`,
          expiry_change: pv.previous_expiry !== pv.new_expiry ? `${pv.previous_expiry || 'N/A'} → ${pv.new_expiry || 'N/A'}` : undefined,
        })),
      },
    });

    await fetchStockItems();
    return true;
  };

  const getItemsByCategory = (categoryId: string) => {
    return stockItems.filter((item) => item.category_id === categoryId);
  };

  return {
    categories,
    stockItems,
    loading,
    refetch: fetchAll,
    addCategory,
    updateCategory,
    deleteCategory,
    addStockItem,
    updateStockItem,
    deleteStockItem,
    bulkUpdateStock,
    getItemsByCategory,
  };
};