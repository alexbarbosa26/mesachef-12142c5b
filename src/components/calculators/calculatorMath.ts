// Pure helpers for production calculators.
// All weights normalized to grams internally.

export type WeightUnit = 'kg' | 'g';

export const toGrams = (value: number, unit: WeightUnit): number =>
  unit === 'kg' ? value * 1000 : value;

export const parseDecimal = (raw: string): number => {
  if (raw === null || raw === undefined) return NaN;
  const cleaned = String(raw).trim().replace(/\./g, '').replace(',', '.');
  // If user typed with dot as decimal we already lost it. Try a safer path:
  // Strategy: if string contains both ',' and '.', assume '.' is thousand and ',' decimal.
  // Otherwise the cleaned version is fine; fallback to original parseFloat.
  const v = parseFloat(cleaned);
  if (!isNaN(v)) return v;
  return parseFloat(String(raw));
};

export const formatBRL = (v: number, fractionDigits = 2) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(isFinite(v) ? v : 0);

export const formatPct = (v: number) =>
  `${(isFinite(v) ? v * 100 : 0).toFixed(2)}%`;

export const formatNumber = (v: number, digits = 3) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(isFinite(v) ? v : 0);

export interface CorrectionResult {
  grossG: number;
  netG: number;
  lossG: number;
  lossPct: number;
  yieldPct: number;
  correctionFactor: number;
  totalCost: number;
  costPerKgGross: number;
  costPerKgNet: number;
  costPerGNet: number;
}

export function computeCorrection(input: {
  grossWeight: number;
  grossUnit: WeightUnit;
  lossWeight?: number;
  lossUnit?: WeightUnit;
  netWeight?: number;
  netUnit?: WeightUnit;
  totalCost: number;
}): CorrectionResult | null {
  const grossG = toGrams(input.grossWeight, input.grossUnit);
  if (!grossG || grossG <= 0) return null;

  let netG: number | null = null;
  let lossG: number | null = null;

  if (input.netWeight && input.netWeight > 0 && input.netUnit) {
    netG = toGrams(input.netWeight, input.netUnit);
    lossG = grossG - netG;
  } else if (input.lossWeight && input.lossWeight > 0 && input.lossUnit) {
    lossG = toGrams(input.lossWeight, input.lossUnit);
    netG = grossG - lossG;
  } else {
    return null;
  }
  if (netG <= 0 || lossG < 0) return null;

  const totalCost = input.totalCost || 0;
  const grossKg = grossG / 1000;
  const netKg = netG / 1000;
  const costPerKgGross = totalCost / grossKg;
  const costPerKgNet = totalCost / netKg;

  return {
    grossG,
    netG,
    lossG,
    lossPct: lossG / grossG,
    yieldPct: netG / grossG,
    correctionFactor: grossG / netG,
    totalCost,
    costPerKgGross,
    costPerKgNet,
    costPerGNet: costPerKgNet / 1000,
  };
}

export interface CookingResult {
  beforeG: number;
  afterG: number;
  lossG: number;
  lossPct: number;
  yieldPct: number;
  cookingFactor: number;
  costPerKgBefore: number;
  costPerKgAfter: number;
  costPerGAfter: number;
  totalCostUsed: number;
}

export function computeCooking(input: {
  beforeWeight: number;
  beforeUnit: WeightUnit;
  afterWeight: number;
  afterUnit: WeightUnit;
  costPerKgBefore: number;
}): CookingResult | null {
  const beforeG = toGrams(input.beforeWeight, input.beforeUnit);
  const afterG = toGrams(input.afterWeight, input.afterUnit);
  if (!beforeG || beforeG <= 0 || !afterG || afterG <= 0) return null;
  if (afterG > beforeG) return null;

  const costPerKgBefore = input.costPerKgBefore || 0;
  const costPerGBefore = costPerKgBefore / 1000;
  const totalCostUsed = beforeG * costPerGBefore;
  const costPerGAfter = totalCostUsed / afterG;

  return {
    beforeG,
    afterG,
    lossG: beforeG - afterG,
    lossPct: (beforeG - afterG) / beforeG,
    yieldPct: afterG / beforeG,
    cookingFactor: afterG / beforeG,
    costPerKgBefore,
    costPerKgAfter: costPerGAfter * 1000,
    costPerGAfter,
    totalCostUsed,
  };
}

/**
 * Converts a cost expressed per Kg into the cost-per-unit stored in
 * `stock_items.value` for a given item unit.
 * Returns null when the unit cannot be converted from weight (e.g. unidade, pacote).
 */
export function costPerKgToItemUnitValue(
  costPerKg: number,
  itemUnit: string
): number | null {
  const u = (itemUnit || '').toLowerCase().trim();
  if (u === 'kg' || u === 'l') return costPerKg;
  if (u === 'g' || u === 'ml') return costPerKg / 1000;
  return null;
}