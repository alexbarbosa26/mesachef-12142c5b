import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';

export interface ResaleProduct {
  id: string;
  company_id: string;
  stock_item_id: string | null;
  product_name: string;
  acquisition_cost: number;
  packaging_cost: number;
  desired_profit_percentage: number;
  practiced_price: number;
  created_at: string;
  updated_at: string;
}

export type ResaleStatus =
  | 'viavel'
  | 'ajuste'
  | 'informe_preco'
  | 'informe_custo'
  | 'config_invalida';

export interface ResaleCalc {
  baseCost: number;
  suggestedPrice: number;
  appliedProfitPct: number;
  profitValue: number;
  cmvPct: number;
  status: ResaleStatus;
  configInvalid: boolean;
}

export function calculateResale(
  row: Pick<ResaleProduct, 'acquisition_cost' | 'packaging_cost' | 'desired_profit_percentage' | 'practiced_price'>,
  cvPct: number,
  cfPct: number,
): ResaleCalc {
  const acq = Number(row.acquisition_cost) || 0;
  const pack = Number(row.packaging_cost) || 0;
  const desired = Number(row.desired_profit_percentage) || 0;
  const price = Number(row.practiced_price) || 0;

  const baseCost = acq + pack;
  const cv = (cvPct || 0) / 100;
  const cf = (cfPct || 0) / 100;
  const l = desired / 100;

  const denom = 1 - cv - cf - l;
  const configInvalid = denom <= 0;
  const suggestedPrice = !configInvalid && baseCost > 0 ? baseCost / denom : 0;

  const appliedProfitValue = price > 0 ? price - price * cv - price * cf - baseCost : 0;
  const appliedProfitPct = price > 0 ? (appliedProfitValue / price) * 100 : 0;
  const profitValue = price > 0 ? (price * appliedProfitPct) / 100 : 0;
  const cmvPct = price > 0 ? (baseCost / price) * 100 : 0;

  let status: ResaleStatus = 'viavel';
  if (configInvalid) status = 'config_invalida';
  else if (baseCost <= 0) status = 'informe_custo';
  else if (price <= 0) status = 'informe_preco';
  else if (appliedProfitPct >= desired) status = 'viavel';
  else status = 'ajuste';

  return {
    baseCost,
    suggestedPrice,
    appliedProfitPct,
    profitValue,
    cmvPct,
    status,
    configInvalid,
  };
}

export function useResaleProducts() {
  const { companyId } = useCurrentCompany();
  return useQuery({
    queryKey: ['pricing-resale-products', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_resale_products' as any)
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ResaleProduct[];
    },
  });
}

export function useUpsertResaleProduct() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (
      input: Partial<ResaleProduct> & { product_name: string },
    ) => {
      if (input.id) {
        const { id, company_id, created_at, updated_at, ...rest } = input as any;
        const { data, error } = await supabase
          .from('pricing_resale_products' as any)
          .update(rest)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('pricing_resale_products' as any)
        .insert({
          product_name: input.product_name,
          stock_item_id: input.stock_item_id ?? null,
          acquisition_cost: input.acquisition_cost ?? 0,
          packaging_cost: input.packaging_cost ?? 0,
          desired_profit_percentage: input.desired_profit_percentage ?? 0,
          practiced_price: input.practiced_price ?? 0,
          created_by: user?.id ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pricing-resale-products'] });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteResaleProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pricing_resale_products' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pricing-resale-products'] });
      toast({ title: 'Produto removido' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao remover', description: e.message, variant: 'destructive' }),
  });
}