import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from '@/hooks/use-toast';

export type ProductCategory = 'cafe' | 'doce' | 'bolo' | 'combo' | 'salgado' | 'bebida' | 'outro';
export type SaleUnit = 'unidade' | 'fatia' | 'copo' | 'porcao' | 'kg' | 'litro';
export type PricingStatus = 'saudavel' | 'atencao' | 'inviavel';
export type PricingBasis = 'unit' | 'kg' | 'portion';

export interface PricingProduct {
  id: string;
  name: string;
  category: ProductCategory;
  category_id: string | null;
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
  pricing_basis?: PricingBasis;
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
  monthly_revenue: number;
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
  sale_price: number;
  pricing_basis: PricingBasis;
  reference_suggested_price: number;
  reference_min_price: number;
  reference_cost: number;
  cmv_pct: number;
  profit_per_unit: number;
  investment_per_unit: number;
  contribution_margin: number;
  contribution_margin_pct: number;
  cost_per_kg?: number;
  price_per_kg?: number;
  cost_per_portion?: number;
  price_per_portion?: number;
  applied_profit_value: number;
  applied_profit_pct: number;
  desired_profit_pct: number;
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
      sale_price: sheet.sale_price || 0,
      pricing_basis: sheet.pricing_basis ?? 'unit',
      reference_suggested_price: 0,
      reference_min_price: 0,
      reference_cost: 0,
      cmv_pct: 0,
      profit_per_unit: 0,
      investment_per_unit: 0,
      contribution_margin: 0,
      contribution_margin_pct: 0,
      applied_profit_value: 0,
      applied_profit_pct: 0,
      desired_profit_pct: 0,
      status: 'inviavel',
      error: 'Percentuais não podem somar 100% ou mais.',
    };
  }

  if ((dv + df) >= 1) {
    return {
      cvu: 0,
      pv: 0,
      pm: 0,
      sale_price: sheet.sale_price || 0,
      pricing_basis: sheet.pricing_basis ?? 'unit',
      reference_suggested_price: 0,
      reference_min_price: 0,
      reference_cost: 0,
      cmv_pct: 0,
      profit_per_unit: 0,
      investment_per_unit: 0,
      contribution_margin: 0,
      contribution_margin_pct: 0,
      applied_profit_value: 0,
      applied_profit_pct: 0,
      desired_profit_pct: 0,
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

  // Preço de venda informado pelo usuário
  const sale_price = sheet.sale_price || 0;

  // Custo e preço por KG e por porção
  const cost_per_kg = sheet.yield_kg > 0 ? cvu / sheet.yield_kg : undefined;
  const price_per_kg = sheet.yield_kg > 0 ? pv / sheet.yield_kg : undefined;
  const min_price_per_kg = sheet.yield_kg > 0 ? pm / sheet.yield_kg : undefined;
  const cost_per_portion = sheet.yield_portions > 0 ? cvu / sheet.yield_portions : undefined;
  const price_per_portion = sheet.yield_portions > 0 ? pv / sheet.yield_portions : undefined;
  const min_price_per_portion = sheet.yield_portions > 0 ? pm / sheet.yield_portions : undefined;

  // Base de comparação (unidade / kg / porção)
  const pricing_basis: PricingBasis = sheet.pricing_basis ?? 'unit';
  let reference_suggested_price = pv;
  let reference_min_price = pm;
  let reference_cost = cvu;
  if (pricing_basis === 'kg' && sheet.yield_kg > 0) {
    reference_suggested_price = price_per_kg!;
    reference_min_price = min_price_per_kg!;
    reference_cost = cost_per_kg!;
  } else if (pricing_basis === 'portion' && sheet.yield_portions > 0) {
    reference_suggested_price = price_per_portion!;
    reference_min_price = min_price_per_portion!;
    reference_cost = cost_per_portion!;
  }

  // CMV% = custo / preço praticado (mesma base)
  const cmv_pct = sale_price > 0 ? (reference_cost / sale_price) * 100 : 0;

  // Lucro aplicado real: preço praticado - CV(%) sobre preço - CF(%) sobre preço - custo da ficha
  const applied_profit_value = sale_price > 0
    ? sale_price - (sale_price * dv) - (sale_price * df) - reference_cost
    : 0;
  const applied_profit_pct = sale_price > 0 ? (applied_profit_value / sale_price) * 100 : 0;
  const desired_profit_pct = l * 100;

  // Status baseado em lucro aplicado vs lucro desejado
  let status: PricingStatus = 'saudavel';
  if (sale_price > 0) {
    if (applied_profit_value < 0) {
      status = 'inviavel';
    } else if (applied_profit_pct < desired_profit_pct) {
      status = 'atencao';
    } else {
      status = 'saudavel';
    }
  } else {
    if (pv <= pm) {
      status = 'inviavel';
    } else if (
      pv <= pm * globalConfig.price_proximity_factor ||
      contribution_margin_pct < globalConfig.healthy_margin_threshold
    ) {
      status = 'atencao';
    }
  }

  return {
    cvu,
    pv,
    pm,
    sale_price,
    pricing_basis,
    reference_suggested_price,
    reference_min_price,
    reference_cost,
    cmv_pct,
    profit_per_unit,
    investment_per_unit,
    contribution_margin,
    contribution_margin_pct,
    cost_per_kg,
    price_per_kg,
    cost_per_portion,
    price_per_portion,
    applied_profit_value,
    applied_profit_pct,
    desired_profit_pct,
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
        .select(`
          *,
          technical_sheet_ingredients!technical_sheet_ingredients_technical_sheet_id_fkey (
            id,
            quantity,
            unit_type,
            component_type,
            stock_item_id,
            linked_sheet_id,
            stock_items ( value )
          )
        `);

      if (error) throw error;
      // Recalcula o CMV dinamicamente, incluindo fichas técnicas vinculadas (componentes reutilizáveis).
      const rows = (data as any[]) || [];
      const byId = new Map<string, any>();
      rows.forEach((r) => byId.set(r.id, r));

      const cvuOf = (sheetId: string, visiting: Set<string>): number => {
        const s = byId.get(sheetId);
        if (!s) return 0;
        const cmv = cmvOf(sheetId, visiting);
        const labor =
          (Number(s.labor_cost_per_hour) || 0) * ((Number(s.prep_time_minutes) || 0) / 60);
        const pack = Number(s.packaging_cost) || 0;
        return cmv + labor + pack;
      };

      const cmvOf = (sheetId: string, visiting: Set<string>): number => {
        if (visiting.has(sheetId)) return 0; // proteção contra ciclo
        const s = byId.get(sheetId);
        if (!s) return 0;
        const ings: any[] = s.technical_sheet_ingredients || [];
        if (ings.length === 0) return Number(s.cmv) || 0;
        visiting.add(sheetId);
        let total = 0;
        for (const ing of ings) {
          const u = String(ing.unit_type || '').toLowerCase();
          let qty = Number(ing.quantity) || 0;
          const isSheet =
            ing.component_type === 'sheet' || (!!ing.linked_sheet_id && !ing.stock_item_id);
          if (isSheet && ing.linked_sheet_id) {
            const linked = byId.get(ing.linked_sheet_id);
            const linkedCvu = cvuOf(ing.linked_sheet_id, visiting);
            if (linked) {
              const yKg = Number(linked.yield_kg) || 0;
              const yPort = Number(linked.yield_portions) || 0;
              if ((u === 'kg' || u === 'g') && yKg > 0) {
                const q = u === 'g' ? qty / 1000 : qty;
                total += (linkedCvu * q) / yKg;
              } else if (u === 'porcao' && yPort > 0) {
                total += (linkedCvu * qty) / yPort;
              } else {
                total += linkedCvu * qty;
              }
            }
          } else {
            const price = Number(ing.stock_items?.value) || 0;
            if (u === 'g' || u === 'ml') qty = qty / 1000;
            total += price * qty;
          }
        }
        visiting.delete(sheetId);
        return total;
      };

      return rows.map((s) => {
        const liveCmv = cmvOf(s.id, new Set<string>());
        return { ...s, cmv: liveCmv } as TechnicalSheet;
      });
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
        .maybeSingle();

      if (error) throw error;
      if (data) return data as PricingConfigGlobal;

      // Auto-seed defaults if missing (new company without config yet).
      // company_id é preenchido pelo trigger set_company_id_on_insert.
      const { data: created, error: insertError } = await supabase
        .from('pricing_config_global')
        .insert({})
        .select()
        .single();
      if (insertError) throw insertError;
      return created as PricingConfigGlobal;
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
