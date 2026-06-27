// Helpers para conversão entre unidade de contagem (pacote, caixa, etc.)
// e unidade base (kg, g, l, ml, un) usada na ficha técnica/precificação.

export type BaseUnit = 'kg' | 'g' | 'l' | 'ml' | 'un';

export const PURCHASE_UNITS = [
  'pacote',
  'caixa',
  'unidade',
  'garrafa',
  'lata',
  'bandeja',
  'fardo',
  'saco',
  'kg',
  'g',
  'l',
  'ml',
] as const;

export const BASE_UNITS: BaseUnit[] = ['kg', 'g', 'l', 'ml', 'un'];

/**
 * Converte uma quantidade na unidade de contagem para a unidade base.
 * Ex: 3 pacotes × 500 (g por pacote) = 1500 g
 */
export function toBaseQuantity(
  countQuantity: number,
  packageSize: number,
): number {
  const qty = Number(countQuantity) || 0;
  const size = Number(packageSize) || 1;
  return qty * size;
}

/**
 * Converte uma quantidade em unidade base para a unidade de contagem.
 */
export function toCountQuantity(
  baseQuantity: number,
  packageSize: number,
): number {
  const qty = Number(baseQuantity) || 0;
  const size = Number(packageSize) || 1;
  if (size <= 0) return qty;
  return qty / size;
}

/**
 * Custo por unidade base a partir do custo da embalagem.
 * Ex: R$1,79/pacote ÷ 500g = R$0,00358/g
 */
export function packageCostToBaseCost(
  packageUnitCost: number,
  packageSize: number,
): number {
  const cost = Number(packageUnitCost) || 0;
  const size = Number(packageSize) || 1;
  if (size <= 0) return cost;
  return cost / size;
}

/**
 * Formata "1,5 kg" ou "1500 g" conforme unidade base.
 */
export function formatBaseQuantity(value: number, unit: string): string {
  const v = Number(value) || 0;
  const u = (unit || '').toLowerCase();
  // Auto-prettify g→kg, ml→l quando passar de 1000
  if (u === 'g' && Math.abs(v) >= 1000) {
    return `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg`;
  }
  if (u === 'ml' && Math.abs(v) >= 1000) {
    return `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} L`;
  }
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${unit}`;
}