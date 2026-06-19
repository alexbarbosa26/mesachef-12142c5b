import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Period } from '@/utils/centralLucroCalculations';

interface Props {
  value: Period;
  onChange: (v: Period) => void;
}

export function PeriodSelector({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Period)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7d">Últimos 7 dias</SelectItem>
        <SelectItem value="30d">Últimos 30 dias</SelectItem>
        <SelectItem value="90d">Últimos 90 dias</SelectItem>
        <SelectItem value="mtd">Mês atual</SelectItem>
      </SelectContent>
    </Select>
  );
}
