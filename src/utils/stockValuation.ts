
interface StockValuationItem {
  current_quantity: number;
  unit: string;
  value: number | null;
}

/**
 * Calcula o valor total de um item de estoque considerando a unidade de medida.
 * 
 * O campo `value` representa o preço por unidade BASE (kg, l, unidade).
 * Se a quantidade está em unidade menor (g, ml), converte antes de multiplicar.
 * 
 * Exemplo: 1000g de queijo a R$38/kg = R$38 (não R$38.000)
 */
export function calculateItemTotalValue(item: StockValuationItem): number {
  if (!item.value || item.value <= 0) return 0;
  const normalizedQty = normalizeQuantityToBaseUnit(item.current_quantity, item.unit);
  return item.value * normalizedQty;
}

/**
 * Calcula o valor total dado quantidade, unidade e valor unitário.
 */
export function calculateValueForQuantity(quantity: number, unit: string, unitValue: number): number {
  if (!unitValue || unitValue <= 0) return 0;
  const normalizedQty = normalizeQuantityToBaseUnit(quantity, unit);
  return unitValue * normalizedQty;
}

/**
 * Converte quantidade para a unidade base:
 * - g → kg (divide por 1000)
 * - ml → l (divide por 1000)
 * - Demais unidades: sem conversão
 */
export function normalizeQuantityToBaseUnit(quantity: number, unit: string): number {
  const u = unit.toLowerCase().trim();
  if (u === 'g' || u === 'gramas' || u === 'grama') {
    return quantity / 1000;
  }
  if (u === 'ml' || u === 'mililitros' || u === 'mililitro') {
    return quantity / 1000;
  }
  return quantity;
}
