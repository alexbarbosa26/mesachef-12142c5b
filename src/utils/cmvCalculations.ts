import { StockItem } from '@/hooks/useStockData';
import { StockPurchase } from '@/hooks/useStockPurchases';
import { calculateItemTotalValue, normalizeQuantityToBaseUnit } from '@/utils/stockValuation';

export interface CMVCalculation {
  initialStockValue: number;
  purchasesValue: number;
  finalStockValue: number;
  theoreticalCMV: number;
  realCMV: number;
  difference: number;
  differencePct: number;
  status: 'normal' | 'alerta' | 'critico';
}

export interface CMVByProduct {
  itemId: string;
  itemName: string;
  categoryId: string;
  unit: string;
  initialQty: number;
  purchasesQty: number;
  finalQty: number;
  unitValue: number;
  cmvValue: number;
  cmvPct: number;
}

/**
 * Calcula o CMV para um período.
 * CMV = Estoque Inicial + Compras - Estoque Final
 */
export function calculateCMV(
  initialStockValue: number,
  purchasesValue: number,
  finalStockValue: number,
  alertThresholdPct: number = 5
): CMVCalculation {
  const theoreticalCMV = initialStockValue + purchasesValue - finalStockValue;
  const realCMV = theoreticalCMV; // Real CMV would come from physical count
  const difference = 0;
  const differencePct = 0;

  let status: 'normal' | 'alerta' | 'critico' = 'normal';
  if (Math.abs(differencePct) > alertThresholdPct * 2) {
    status = 'critico';
  } else if (Math.abs(differencePct) > alertThresholdPct) {
    status = 'alerta';
  }

  return {
    initialStockValue,
    purchasesValue,
    finalStockValue,
    theoreticalCMV,
    realCMV,
    difference,
    differencePct,
    status,
  };
}

/**
 * Calcula CMV por produto individual
 */
export function calculateCMVByProduct(
  item: StockItem,
  purchases: StockPurchase[],
  initialQuantity: number
): CMVByProduct {
  const itemPurchases = purchases.filter((p) => p.stock_item_id === item.id);
  const purchasesQty = itemPurchases.reduce((sum, p) => sum + p.quantity, 0);
  const unitValue = item.value || 0;

  const normalizedInitial = normalizeQuantityToBaseUnit(initialQuantity, item.unit);
  const normalizedPurchases = normalizeQuantityToBaseUnit(purchasesQty, item.unit);
  const normalizedFinal = normalizeQuantityToBaseUnit(item.current_quantity, item.unit);

  const cmvValue = (normalizedInitial + normalizedPurchases - normalizedFinal) * unitValue;

  return {
    itemId: item.id,
    itemName: item.name,
    categoryId: item.category_id,
    unit: item.unit,
    initialQty: initialQuantity,
    purchasesQty,
    finalQty: item.current_quantity,
    unitValue,
    cmvValue: Math.max(0, cmvValue),
    cmvPct: 0, // Will be calculated relative to total
  };
}

/**
 * Calcula o custo médio ponderado de um item
 */
export function calculateWeightedAverageCost(
  currentQty: number,
  currentValue: number,
  purchaseQty: number,
  purchaseUnitCost: number
): number {
  const totalQty = currentQty + purchaseQty;
  if (totalQty === 0) return 0;
  const totalValue = currentQty * currentValue + purchaseQty * purchaseUnitCost;
  return totalValue / totalQty;
}

/**
 * Formata valor em reais
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata percentual
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}