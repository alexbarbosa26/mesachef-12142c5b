import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/utils/centralLucroCalculations';

interface SelfServiceRecord {
  total_produced_kg?: number | null;
  total_consumed_kg?: number | null;
  total_leftover_kg?: number | null;
  total_leftover_value?: number | null;
  practiced_kg_price?: number | null;
  suggested_kg_price?: number | null;
  estimated_result?: number | null;
}

export function SelfServiceSummary({ records }: { records: SelfServiceRecord[] }) {
  if (records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" /> Self-Service
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">
            Sem dados de self-service no período. Cadastre o primeiro dia para acompanhar produção, sobras e resultado.
          </p>
          <Button asChild size="sm">
            <Link to="/self-service">Cadastrar primeiro dia</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sum = (key: keyof SelfServiceRecord) =>
    records.reduce((acc, r) => acc + Number(r[key] ?? 0), 0);
  const avg = (key: keyof SelfServiceRecord) => {
    const vals = records.map((r) => Number(r[key] ?? 0)).filter((v) => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const items = [
    { label: 'Produzido', value: `${sum('total_produced_kg').toFixed(1)} kg` },
    { label: 'Consumido', value: `${sum('total_consumed_kg').toFixed(1)} kg` },
    { label: 'Sobras', value: `${sum('total_leftover_kg').toFixed(1)} kg` },
    { label: 'Valor da sobra', value: formatCurrency(sum('total_leftover_value')) },
    { label: 'Preço/kg praticado', value: formatCurrency(avg('practiced_kg_price')) },
    { label: 'Preço/kg sugerido', value: formatCurrency(avg('suggested_kg_price')) },
    { label: 'Resultado estimado', value: formatCurrency(sum('estimated_result')) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5" /> Self-Service no período
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {items.map((it) => (
            <div key={it.label} className="rounded-md bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">{it.label}</p>
              <p className="text-sm font-semibold mt-0.5">{it.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
