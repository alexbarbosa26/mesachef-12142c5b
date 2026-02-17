import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalculatedPricing, PricingStatus } from '@/hooks/usePricingData';
import { PricingStatusBadge } from './PricingStatusBadge';
import { Percent, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DiscountSimulatorProps {
  pricing: CalculatedPricing;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function DiscountSimulator({ pricing }: DiscountSimulatorProps) {
  const [discountPct, setDiscountPct] = useState(0);

  const simulation = useMemo(() => {
    const basePrice = pricing.sale_price > 0 ? pricing.sale_price : pricing.pv;
    const discountValue = basePrice * (discountPct / 100);
    const discountedPrice = basePrice - discountValue;

    let status: PricingStatus = 'saudavel';
    if (discountedPrice < pricing.pm) {
      status = 'inviavel';
    } else if (discountedPrice < pricing.pv) {
      status = 'atencao';
    }

    const newMargin = discountedPrice - pricing.cvu - (discountedPrice * (pricing.pv > 0 ? (pricing.pv - pricing.cvu - pricing.contribution_margin) / pricing.pv : 0));
    const newMarginPct = discountedPrice > 0 ? ((discountedPrice - pricing.cvu) / discountedPrice) * 100 : 0;
    const maxDiscountForSurvival = basePrice > 0 ? ((basePrice - pricing.pm) / basePrice) * 100 : 0;
    const maxDiscountForHealthy = basePrice > 0 ? ((basePrice - pricing.pv) / basePrice) * 100 : 0;

    return {
      basePrice,
      discountValue,
      discountedPrice,
      status,
      newMarginPct,
      maxDiscountForSurvival: Math.max(0, maxDiscountForSurvival),
      maxDiscountForHealthy: Math.max(0, maxDiscountForHealthy),
    };
  }, [pricing, discountPct]);

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Percent className="w-4 h-4 text-muted-foreground" />
          Simulador de Desconto
        </CardTitle>
        <CardDescription className="text-xs">
          Teste como descontos afetam a viabilidade do preço
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Slider de desconto */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Desconto</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={discountPct}
                onChange={(e) => setDiscountPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                className="w-20 h-8 text-sm text-right"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <Slider
            value={[discountPct]}
            onValueChange={([v]) => setDiscountPct(v)}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        <Separator />

        {/* Resultado da simulação */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Preço base</span>
            <span className="font-medium">{formatCurrency(simulation.basePrice)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />
              Desconto
            </span>
            <span className="font-medium text-destructive">
              - {formatCurrency(simulation.discountValue)}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Preço com desconto</span>
            <span className={`text-lg font-bold ${
              simulation.status === 'saudavel' ? 'text-green-600' :
              simulation.status === 'atencao' ? 'text-yellow-600' : 'text-destructive'
            }`}>
              {formatCurrency(simulation.discountedPrice)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status com desconto</span>
            <PricingStatusBadge status={simulation.status} />
          </div>
        </div>

        <Separator />

        {/* Limites de desconto */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Limites de desconto</p>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="w-3 h-3" />
              Máx. saudável
            </span>
            <Badge variant="secondary" className="text-xs">
              {simulation.maxDiscountForHealthy.toFixed(1)}%
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-yellow-600">
              <AlertTriangle className="w-3 h-3" />
              Máx. sobrevivência
            </span>
            <Badge variant="secondary" className="text-xs">
              {simulation.maxDiscountForSurvival.toFixed(1)}%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
