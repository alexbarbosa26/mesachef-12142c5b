import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from '@/hooks/use-toast';
import { StockItem } from '@/hooks/useStockData';

export type IngredientUnit = 'g' | 'kg' | 'ml' | 'l' | 'unidade';

export interface TechnicalSheetIngredient {
  id: string;
  technical_sheet_id: string;
  stock_item_id: string;
  quantity: number;
  unit_type: IngredientUnit;
  calculated_cost: number;
  created_at: string;
  updated_at: string;
}

export interface IngredientWithStockItem extends TechnicalSheetIngredient {
  stock_item?: StockItem;
}

export const INGREDIENT_UNIT_LABELS: Record<IngredientUnit, string> = {
  g: 'Gramas (g)',
  kg: 'Quilos (kg)',
  ml: 'Mililitros (ml)',
  l: 'Litros (l)',
  unidade: 'Unidade',
};

export const INGREDIENT_UNIT_SHORT: Record<IngredientUnit, string> = {
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'l',
  unidade: 'un',
};

// Calcula o custo do ingrediente baseado na quantidade e valor unitário do item de estoque
export function calculateIngredientCost(
  stockItem: StockItem,
  quantity: number,
  unitType: IngredientUnit
): number {
  if (!stockItem.value || stockItem.value <= 0) return 0;
  
  // Valor do item de estoque é por unidade base (kg, l, unidade)
  // Precisamos converter a quantidade para a unidade base
  let quantityInBaseUnit = quantity;
  
  // Conversões para unidade base
  if (unitType === 'g') {
    quantityInBaseUnit = quantity / 1000; // g para kg
  } else if (unitType === 'ml') {
    quantityInBaseUnit = quantity / 1000; // ml para l
  }
  
  // Se o item de estoque está em kg/l e usamos g/ml, calcular proporcionalmente
  // O valor no estoque é o preço por unidade cadastrada (kg, l, unidade)
  return stockItem.value * quantityInBaseUnit;
}

// Hook para buscar ingredientes de uma ficha técnica
export function useTechnicalSheetIngredients(technicalSheetId: string | undefined) {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ['technical-sheet-ingredients', technicalSheetId],
    queryFn: async () => {
      if (!isAdmin || !technicalSheetId) return [];

      const { data, error } = await supabase
        .from('technical_sheet_ingredients')
        .select('*')
        .eq('technical_sheet_id', technicalSheetId)
        .order('created_at');

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        unit_type: item.unit_type as IngredientUnit,
      })) as TechnicalSheetIngredient[];
    },
    enabled: isAdmin && !!technicalSheetId,
  });
}

// Hook para adicionar ingrediente
export function useAddIngredient() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (ingredient: Omit<TechnicalSheetIngredient, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('technical_sheet_ingredients')
        .insert(ingredient)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['technical-sheet-ingredients', data.technical_sheet_id] });
      logAction({
        action: 'create',
        entity_type: 'technical_sheet_ingredient',
        entity_id: data.id,
        details: { stock_item_id: data.stock_item_id, quantity: data.quantity },
      });
    },
    onError: (error: Error) => {
      if (error.message.includes('unique')) {
        toast({ title: 'Este ingrediente já foi adicionado', variant: 'destructive' });
      } else {
        toast({ title: 'Erro ao adicionar ingrediente', variant: 'destructive' });
      }
    },
  });
}

// Hook para atualizar ingrediente
export function useUpdateIngredient() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TechnicalSheetIngredient> & { id: string; technical_sheet_id: string }) => {
      const { data, error } = await supabase
        .from('technical_sheet_ingredients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['technical-sheet-ingredients', data.technical_sheet_id] });
      logAction({
        action: 'update',
        entity_type: 'technical_sheet_ingredient',
        entity_id: data.id,
        details: { quantity: data.quantity },
      });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar ingrediente', variant: 'destructive' });
    },
  });
}

// Hook para remover ingrediente
export function useRemoveIngredient() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, technicalSheetId }: { id: string; technicalSheetId: string }) => {
      const { error } = await supabase
        .from('technical_sheet_ingredients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, technicalSheetId };
    },
    onSuccess: ({ id, technicalSheetId }) => {
      queryClient.invalidateQueries({ queryKey: ['technical-sheet-ingredients', technicalSheetId] });
      logAction({
        action: 'delete',
        entity_type: 'technical_sheet_ingredient',
        entity_id: id,
      });
    },
    onError: () => {
      toast({ title: 'Erro ao remover ingrediente', variant: 'destructive' });
    },
  });
}

// Hook para salvar todos os ingredientes de uma vez (bulk upsert)
export function useSaveIngredients() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ 
      technicalSheetId, 
      ingredients 
    }: { 
      technicalSheetId: string; 
      ingredients: Array<Omit<TechnicalSheetIngredient, 'id' | 'created_at' | 'updated_at' | 'technical_sheet_id'> & { id?: string }>;
    }) => {
      // Primeiro, remove todos os ingredientes existentes
      await supabase
        .from('technical_sheet_ingredients')
        .delete()
        .eq('technical_sheet_id', technicalSheetId);

      // Depois, insere os novos
      if (ingredients.length > 0) {
        const toInsert = ingredients.map(ing => ({
          technical_sheet_id: technicalSheetId,
          stock_item_id: ing.stock_item_id,
          quantity: ing.quantity,
          unit_type: ing.unit_type,
          calculated_cost: ing.calculated_cost,
        }));

        const { error } = await supabase
          .from('technical_sheet_ingredients')
          .insert(toInsert);

        if (error) throw error;
      }

      return { technicalSheetId, count: ingredients.length };
    },
    onSuccess: ({ technicalSheetId, count }) => {
      queryClient.invalidateQueries({ queryKey: ['technical-sheet-ingredients', technicalSheetId] });
      logAction({
        action: 'bulk_update',
        entity_type: 'technical_sheet_ingredients',
        details: { technical_sheet_id: technicalSheetId, ingredients_count: count },
      });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar ingredientes', variant: 'destructive' });
    },
  });
}
