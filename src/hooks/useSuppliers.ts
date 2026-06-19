import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Supplier {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      console.error('Error fetching suppliers:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar fornecedores', variant: 'destructive' });
      setLoading(false);
      return;
    }
    setSuppliers((data as Supplier[]) || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const addSupplier = async (payload: Partial<Supplier>) => {
    if (!payload.name || !payload.name.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
      return null;
    }
    const { data, error } = await (supabase as any)
      .from('suppliers')
      .insert({
        name: payload.name.trim(),
        phone: payload.phone || null,
        email: payload.email || null,
        notes: payload.notes || null,
        is_active: payload.is_active ?? true,
      })
      .select()
      .single();
    if (error) {
      toast({ title: 'Erro', description: error.message || 'Erro ao cadastrar fornecedor', variant: 'destructive' });
      return null;
    }
    await fetchSuppliers();
    toast({ title: 'Sucesso', description: 'Fornecedor cadastrado!' });
    return data as Supplier;
  };

  const updateSupplier = async (id: string, payload: Partial<Supplier>) => {
    const { error } = await (supabase as any)
      .from('suppliers')
      .update({
        name: payload.name?.trim(),
        phone: payload.phone ?? null,
        email: payload.email ?? null,
        notes: payload.notes ?? null,
        is_active: payload.is_active,
      })
      .eq('id', id)
      .select();
    if (error) {
      toast({ title: 'Erro', description: error.message || 'Erro ao atualizar', variant: 'destructive' });
      return false;
    }
    await fetchSuppliers();
    toast({ title: 'Sucesso', description: 'Fornecedor atualizado!' });
    return true;
  };

  const deleteSupplier = async (id: string) => {
    const { error } = await (supabase as any).from('suppliers').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message || 'Erro ao excluir', variant: 'destructive' });
      return false;
    }
    await fetchSuppliers();
    toast({ title: 'Sucesso', description: 'Fornecedor excluído!' });
    return true;
  };

  return { suppliers, loading, refetch: fetchSuppliers, addSupplier, updateSupplier, deleteSupplier };
};