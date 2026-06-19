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
        .select('*, technical_sheet_ingredients(id)')
        .eq('company_id', companyId as string);
      if (error) throw error;
      return data || [];
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
    selfServiceRecords: selfServiceRecords.data || [],
  };
}
