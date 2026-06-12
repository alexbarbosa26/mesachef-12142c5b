import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface ProductCategory {
  id: string;
  company_id: string;
  name: string;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export function useProductCategories(options?: { activeOnly?: boolean }) {
  const { user } = useAuth();
  const activeOnly = options?.activeOnly ?? false;

  return useQuery({
    queryKey: ['product-categories', { activeOnly }],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from('product_categories')
        .select('*')
        .order('name');
      if (activeOnly) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProductCategory[];
    },
  });
}

export function useCreateProductCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (trimmed.length < 1) throw new Error('Nome obrigatório');
      const { data, error } = await supabase
        .from('product_categories')
        .insert({ name: trimmed } as any)
        .select()
        .single();
      if (error) throw error;
      return data as ProductCategory;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-categories'] });
      toast({ title: 'Categoria criada com sucesso!' });
    },
    onError: (e: any) => {
      const msg = e?.message?.includes('duplicate') || e?.code === '23505'
        ? 'Já existe uma categoria com esse nome'
        : 'Erro ao criar categoria';
      toast({ title: msg, variant: 'destructive' });
    },
  });
}

export function useUpdateProductCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; is_active?: boolean }) => {
      const { id, ...updates } = input;
      if (updates.name !== undefined) updates.name = updates.name.trim();
      const { data, error } = await supabase
        .from('product_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ProductCategory;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-categories'] });
      toast({ title: 'Categoria atualizada!' });
    },
    onError: (e: any) => {
      const msg = e?.code === '23505'
        ? 'Já existe uma categoria com esse nome'
        : 'Erro ao atualizar categoria';
      toast({ title: msg, variant: 'destructive' });
    },
  });
}

export function useDeleteProductCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Bloquear se houver produtos vinculados
      const { count, error: cErr } = await supabase
        .from('pricing_products')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', id);
      if (cErr) throw cErr;
      if ((count ?? 0) > 0) {
        throw new Error('IN_USE');
      }
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-categories'] });
      toast({ title: 'Categoria excluída!' });
    },
    onError: (e: any) => {
      const inUse = e?.message === 'IN_USE' || e?.code === '23503';
      toast({
        title: inUse
          ? 'Categoria em uso — desative-a em vez de excluir.'
          : 'Erro ao excluir categoria',
        variant: 'destructive',
      });
    },
  });
}