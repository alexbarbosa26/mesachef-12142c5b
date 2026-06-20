import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { Period, getPeriodRange } from '@/utils/centralLucroCalculations';

export function useCentralLucroData(period: Period) {
  const { companyId } = useCurrentCompany();
  const range = getPeriodRange(period);
  const enabled = !!companyId;

  const stockItems = useQuery({
    queryKey: ['central-lucro', 'stock-items', companyId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .eq('company_id', companyId as string);
      if (error) throw error;
      return data || [];
    },
  });

  const categories = useQuery({
    queryKey: ['central-lucro', 'categories', companyId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('company_id', companyId as string);
      if (error) throw error;
      return data || [];
    },
  });

  const purchases = useQuery({
    queryKey: ['central-lucro', 'purchases', companyId, range.startDate, range.endDate],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_purchases')
        .select('*')
        .eq('company_id', companyId as string)
        .gte('purchase_date', range.startDate)
        .lte('purchase_date', range.endDate)
        .order('purchase_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const adjustments = useQuery({
    queryKey: ['central-lucro', 'adjustments', companyId, range.startDate, range.endDate],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_adjustments')
        .select('*')
        .eq('company_id', companyId as string)
        .gte('created_at', range.startDate);
      if (error) throw error;
      return data || [];
    },
  });

  const snapshots = useQuery({
    queryKey: ['central-lucro', 'snapshots', companyId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cmv_snapshots')
        .select('*')
        .eq('company_id', companyId as string)
        .order('period_end', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const pricingProducts = useQuery({
    queryKey: ['central-lucro', 'pricing-products', companyId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_products')
        .select('*')
        .eq('company_id', companyId as string)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  const technicalSheets = useQuery({
    queryKey: ['central-lucro', 'technical-sheets', companyId],
    enabled,
    queryFn: async () => {
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
        `)
        .eq('company_id', companyId as string);
      if (error) throw error;
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
        if (visiting.has(sheetId)) return 0;
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

      return rows.map((s) => ({
        ...s,
        cmv: cmvOf(s.id, new Set<string>()),
        ingredient_count: (s.technical_sheet_ingredients || []).length,
      }));
    },
  });

  const pricingGlobal = useQuery({
    queryKey: ['central-lucro', 'pricing-global', companyId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_config_global')
        .select('*')
        .eq('company_id', companyId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const pricingConfigProducts = useQuery({
    queryKey: ['central-lucro', 'pricing-config-products', companyId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_config_product')
        .select('*')
        .eq('company_id', companyId as string);
      if (error) throw error;
      return data || [];
    },
  });

  const selfServiceRecords = useQuery({
    queryKey: ['central-lucro', 'self-service', companyId, range.startDate, range.endDate],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('self_service_daily_records')
        .select('*')
        .eq('company_id', companyId as string)
        .gte('date', range.startDate)
        .lte('date', range.endDate);
      if (error) {
        // Tabela pode não existir em todos os ambientes — silenciar
        console.warn('self_service_daily_records:', error.message);
        return [];
      }
      return data || [];
    },
  });

  const loading =
    !companyId ||
    stockItems.isLoading ||
    purchases.isLoading ||
    snapshots.isLoading ||
    pricingProducts.isLoading;

  return {
    companyId,
    range,
    loading,
    stockItems: stockItems.data || [],
    categories: categories.data || [],
    purchases: purchases.data || [],
    adjustments: adjustments.data || [],
    snapshots: snapshots.data || [],
    pricingProducts: pricingProducts.data || [],
    technicalSheets: technicalSheets.data || [],
    pricingGlobal: pricingGlobal.data || null,
    pricingConfigProducts: pricingConfigProducts.data || [],
    selfServiceRecords: selfServiceRecords.data || [],
  };
}
