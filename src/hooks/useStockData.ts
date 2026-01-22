import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

    await fetchCategories();
    toast({ title: 'Sucesso', description: 'Categoria atualizada!' });
    return true;
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir categoria',
        variant: 'destructive',
      });
      return false;
    }

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

    await fetchStockItems();
    toast({ title: 'Sucesso', description: 'Item adicionado!' });
    return data;
  };

  const updateStockItem = async (id: string, updates: Partial<StockItem>) => {
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

    await fetchStockItems();
    return true;
  };

  const deleteStockItem = async (id: string) => {
    const { error } = await supabase.from('stock_items').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir item',
        variant: 'destructive',
      });
      return false;
    }

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
      responsible_user: string;
    }>
  ) => {
    const promises = updates.map((update) =>
      supabase
        .from('stock_items')
        .update({
          current_quantity: update.current_quantity,
          expiry_date: update.expiry_date,
          count_date: update.count_date,
          responsible_user: update.responsible_user,
        })
        .eq('id', update.id)
    );

    const results = await Promise.all(promises);
    const errors = results.filter((r) => r.error);

    if (errors.length > 0) {
      toast({
        title: 'Erro',
        description: `Erro ao atualizar ${errors.length} itens`,
        variant: 'destructive',
      });
      return false;
    }

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