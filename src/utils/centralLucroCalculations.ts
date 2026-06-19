import { calculateItemTotalValue, normalizeQuantityToBaseUnit } from '@/utils/stockValuation';

export type Period = '7d' | '30d' | '90d' | 'mtd';

export interface PeriodRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;
}

export function getPeriodRange(period: Period): PeriodRange {
  const today = new Date();
  const endDate = today.toISOString().slice(0, 10);
  let start = new Date(today);
  let label = '';
  switch (period) {
    case '7d':
      start.setDate(today.getDate() - 7);
      label = 'Últimos 7 dias';
      break;
    case '30d':
      start.setDate(today.getDate() - 30);
      label = 'Últimos 30 dias';
      break;
    case '90d':
      start.setDate(today.getDate() - 90);
      label = 'Últimos 90 dias';
      break;
    case 'mtd':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      label = 'Mês atual';
      break;
  }
  return { startDate: start.toISOString().slice(0, 10), endDate, label };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(1)}%`;
}

export { calculateItemTotalValue, normalizeQuantityToBaseUnit };
