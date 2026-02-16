import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from '@/hooks/use-toast';

export type ProductCategory = 'cafe' | 'doce' | 'bolo' | 'combo' | 'salgado' | 'bebida' | 'outro';
export type SaleUnit = 'unidade' | 'fatia' | 'copo' | 'porcao' | 'kg' | 'litro';
export type PricingStatus = 'saudavel' | 'atencao' | 'inviavel';

export interface PricingProduct {
  id: string;
  name: string;
  category: ProductCategory;
  sale_unit: SaleUnit;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TechnicalSheet {
  id: string;
  product_id: string;
  cmv: number;
  labor_cost_per_hour: number;
  prep_time_minutes: number;
  packaging_cost: number;
  yield_kg: number;
  yield_portions: number;
  sale_price: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PricingConfigGlobal {
  id: string;
  variable_expenses_pct: number;
  fixed_expenses_pct: number;
  profit_pct: number;
  investment_pct: number;
  healthy_margin_threshold: number;
  price_proximity_factor: number;
  updated_by: string | null;
  updated_at: string;
}

export interface PricingConfigProduct {
  id: string;
  product_id: string;
  variable_expenses_pct: number | null;
  fixed_expenses_pct: number | null;
  profit_pct: number | null;
  investment_pct: number | null;
  updated_by: string | null;
  updated_at: string;
}

export interface ProductWithPricing extends PricingProduct {
  technical_sheet?: TechnicalSheet;
  config?: PricingConfigProduct;
  calculated?: CalculatedPricing;
}

export interface CalculatedPricing {
  cvu: number;
  pv: number;
  pm: number;
  profit_per_unit: number;
  investment_per_unit: number;
  contribution_margin: number;
  contribution_margin_pct: number;
  cost_per_kg?: number;
  price_per_kg?: number;
  cost_per_portion?: number;
  price_per_portion?: number;
  status: PricingStatus;
  error?: string;
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  cafe: 'Café',
  doce: 'Doce',
  bolo: 'Bolo',
  combo: 'Combo',
  salgado: 'Salgado',
  bebida: 'Bebida',
  outro: 'Outro',
};

export const UNIT_LABELS: Record<SaleUnit, string> = {
  unidade: 'Unidade',
  fatia: 'Fatia',
  copo: 'Copo',
  porcao: 'Porção',
  kg: 'Kg',
  litro: 'Litro',
};

// Calcula os indicadores de precificação baseado na metodologia SEBRAE
export function calculatePricing(
  sheet: TechnicalSheet | undefined,
  globalConfig: PricingConfigGlobal,
  productConfig?: PricingConfigProduct
): CalculatedPricing | undefined {
  if (!sheet) return undefined;

  // Usa override do produto se existir, senão usa global
  const dv = (productConfig?.variable_expenses_pct ?? globalConfig.variable_expenses_pct) / 100;
  const df = (productConfig?.fixed_expenses_pct ?? globalConfig.fixed_expenses_pct) / 100;
  const l = (productConfig?.profit_pct ?? globalConfig.profit_pct) / 100;
  const i = (productConfig?.investment_pct ?? globalConfig.investment_pct) / 100;

  // Validação de percentuais
  const totalPct = dv + df + l + i;
  if (totalPct >= 1) {
    return {
      cvu: 0,
      pv: 0,
      pm: 0,
      profit_per_unit: 0,
      investment_per_unit: 0,
      contribution_margin: 0,
      contribution_margin_pct: 0,
      status: 'inviavel',
      error: 'Percentuais não podem somar 100% ou mais.',
    };
  }

  if ((dv + df) >= 1) {
    return {
      cvu: 0,
      pv: 0,
      pm: 0,
      profit_per_unit: 0,
      investment_per_unit: 0,
      contribution_margin: 0,
      contribution_margin_pct: 0,
      status: 'inviavel',
      error: 'DV+DF não podem somar 100% ou mais.',
    };
  }

  // Cálculo do CVU (Custo Variável Unitário)
  const prepTimeHours = sheet.prep_time_minutes / 60;
  const laborCostUnit = sheet.labor_cost_per_hour * prepTimeHours;
  const cvu = Number(sheet.cmv) + laborCostUnit + Number(sheet.packaging_cost);

  // Fórmula SEBRAE: PV = CVU / (1 - (DV + DF + L + I))
  const pv = cvu / (1 - totalPct);

  // Preço mínimo (sobrevivência): PM = CVU / (1 - (DV + DF))
  const pm = cvu / (1 - (dv + df));

  // Indicadores
  const profit_per_unit = pv * l;
  const investment_per_unit = pv * i;
  const contribution_margin = pv - cvu - (pv * dv);
  const contribution_margin_pct = pv > 0 ? (contribution_margin / pv) * 100 : 0;

  // Determina status baseado no preço de venda real informado pelo usuário
  const salePrice = Number(sheet.sale_price) || 0;
  let status: PricingStatus = 'saudavel';
  
  if (salePrice <= 0) {
    // Se não informou preço de venda, usa o cálculo teórico
    if (pv <= pm) {
      status = 'inviavel';
    } else if (
      pv <= pm * globalConfig.price_proximity_factor ||
      contribution_margin_pct < globalConfig.healthy_margin_threshold
    ) {
      status = 'atencao';
    }
  } else {
    // Compara preço de venda real com os preços calculados
    if (salePrice < pm) {
      status = 'inviavel';
    } else if (salePrice < pv) {
      status = 'atencao';
    } else {
      status = 'saudavel';
    }
  }

  // Custo e preço por KG e por porção
  const cost_per_kg = sheet.yield_kg > 0 ? cvu / sheet.yield_kg : undefined;
  const price_per_kg = sheet.yield_kg > 0 ? pv / sheet.yield_kg : undefined;
  const cost_per_portion = sheet.yield_portions > 0 ? cvu / sheet.yield_portions : undefined;
  const price_per_portion = sheet.yield_portions > 0 ? pv / sheet.yield_portions : undefined;

  return {
    cvu,
    pv,
    pm,
    profit_per_unit,
    investment_per_unit,
    contribution_margin,
    contribution_margin_pct,
    cost_per_kg,
    price_per_kg,
    cost_per_portion,
    price_per_portion,
    status,
  };
}

// Hook para buscar produtos
export function usePricingProducts() {
  return useQuery({
    queryKey: ['pricing-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_products')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as PricingProduct[];
    },
  });
}

// Hook para buscar fichas técnicas (admin only)
export function useTechnicalSheets() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ['technical-sheets'],
    queryFn: async () => {
      if (!isAdmin) return [];
      
      const { data, error } = await supabase
        .from('technical_sheets')
        .select('*');

      if (error) throw error;
      return data as TechnicalSheet[];
    },
    enabled: isAdmin,
  });
}

// Hook para buscar configuração global (admin only)
export function usePricingConfigGlobal() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ['pricing-config-global'],
    queryFn: async () => {
      if (!isAdmin) return null;

      const { data, error } = await supabase
        .from('pricing_config_global')
        .select('*')
        .single();

      if (error) throw error;
      return data as PricingConfigGlobal;
    },
    enabled: isAdmin,
  });
}

// Hook para buscar configurações por produto (admin only)
export function usePricingConfigProducts() {
  const { isAdmin } = useAuth();

  return useQuery({
    queryKey: ['pricing-config-products'],
    queryFn: async () => {
      if (!isAdmin) return [];

      const { data, error } = await supabase
        .from('pricing_config_product')
        .select('*');

      if (error) throw error;
      return data as PricingConfigProduct[];
    },
    enabled: isAdmin,
  });
}

// Hook para criar produto
export function useCreatePricingProduct() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (product: Omit<PricingProduct, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('pricing_products')
        .insert({ ...product, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pricing-products'] });
      logAction({
        action: 'create',
        entity_type: 'pricing_product',
        entity_id: data.id,
        details: { name: data.name, category: data.category },
      });
      toast({ title: 'Produto criado com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar produto', variant: 'destructive' });
    },
  });
}

// Hook para atualizar produto
export function useUpdatePricingProduct() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PricingProduct> & { id: string }) => {
      const { data, error } = await supabase
        .from('pricing_products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pricing-products'] });
      logAction({
        action: 'update',
        entity_type: 'pricing_product',
        entity_id: data.id,
        details: { name: data.name },
      });
      toast({ title: 'Produto atualizado com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar produto', variant: 'destructive' });
    },
  });
}

// Hook para deletar produto
export function useDeletePricingProduct() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pricing_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['pricing-products'] });
      queryClient.invalidateQueries({ queryKey: ['technical-sheets'] });
      logAction({
        action: 'delete',
        entity_type: 'pricing_product',
        entity_id: id,
      });
      toast({ title: 'Produto excluído com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir produto', variant: 'destructive' });
    },
  });
}

// Hook para criar/atualizar ficha técnica
export function useUpsertTechnicalSheet() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (sheet: Omit<TechnicalSheet, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('technical_sheets')
        .upsert({ ...sheet, created_by: user?.id }, { onConflict: 'product_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['technical-sheets'] });
      logAction({
        action: 'upsert',
        entity_type: 'technical_sheet',
        entity_id: data.id,
        details: { product_id: data.product_id, cmv: data.cmv },
      });
      toast({ title: 'Ficha técnica salva com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar ficha técnica', variant: 'destructive' });
    },
  });
}

// Hook para atualizar configuração global
export function useUpdatePricingConfigGlobal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (config: Partial<PricingConfigGlobal> & { id: string }) => {
      const { data, error } = await supabase
        .from('pricing_config_global')
        .update({ ...config, updated_by: user?.id })
        .eq('id', config.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pricing-config-global'] });
      logAction({
        action: 'update',
        entity_type: 'pricing_config_global',
        entity_id: data.id,
        details: {
          variable_expenses_pct: data.variable_expenses_pct,
          fixed_expenses_pct: data.fixed_expenses_pct,
          profit_pct: data.profit_pct,
          investment_pct: data.investment_pct,
        },
      });
      toast({ title: 'Configuração global atualizada!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar configuração', variant: 'destructive' });
    },
  });
}

// Hook para upsert configuração por produto
export function useUpsertPricingConfigProduct() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (config: Omit<PricingConfigProduct, 'id' | 'updated_at' | 'updated_by'>) => {
      const { data, error } = await supabase
        .from('pricing_config_product')
        .upsert({ ...config, updated_by: user?.id }, { onConflict: 'product_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pricing-config-products'] });
      logAction({
        action: 'upsert',
        entity_type: 'pricing_config_product',
        entity_id: data.id,
        details: { product_id: data.product_id },
      });
      toast({ title: 'Configuração do produto atualizada!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar configuração do produto', variant: 'destructive' });
    },
  });
}

// Hook para deletar configuração por produto
export function useDeletePricingConfigProduct() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('pricing_config_product')
        .delete()
        .eq('product_id', productId);

      if (error) throw error;
      return productId;
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ['pricing-config-products'] });
      logAction({
        action: 'delete',
        entity_type: 'pricing_config_product',
        details: { product_id: productId },
      });
      toast({ title: 'Configuração específica removida!' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover configuração', variant: 'destructive' });
    },
  });
}
