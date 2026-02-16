import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalculatedPricing } from '@/hooks/usePricingData';
import { PricingStatusBadge } from './PricingStatusBadge';
import { DollarSign, TrendingUp, PiggyBank, AlertCircle, Target, BarChart3, Scale, Slice } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PricingResultCardsProps {
  pricing: CalculatedPricing | undefined;
  showDetailed?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function PricingResultCards({ pricing, showDetailed = true }: PricingResultCardsProps) {
  if (!pricing) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Preencha os custos para ver os cálculos</p>
      </div>
    );
  }

  if (pricing.error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{pricing.error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Status de Viabilidade</span>
        <PricingStatusBadge status={pricing.status} />
      </div>

      {/* Main Price Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Preço de Venda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(pricing.pv)}</p>
            <p className="text-xs text-muted-foreground mt-1">Com lucro e investimento</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-yellow-600" />
              Preço Mínimo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{formatCurrency(pricing.pm)}</p>
            <p className="text-xs text-muted-foreground mt-1">Sobrevivência (sem lucro)</p>
          </CardContent>
        </Card>
      </div>

      {showDetailed && (
        <>
          {/* CVU Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Custo Variável Unitário (CVU)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{formatCurrency(pricing.cvu)}</p>
              <p className="text-xs text-muted-foreground">CMV + Mão de obra + Embalagem</p>
            </CardContent>
          </Card>

          {/* Indicators Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Lucro/Unidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(pricing.profit_per_unit)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <PiggyBank className="w-4 h-4 text-blue-600" />
                  Investimento/Unidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold text-blue-600">{formatCurrency(pricing.investment_per_unit)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Contribution Margin */}
          <Card className={pricing.contribution_margin_pct < 50 ? 'border-yellow-500/30' : 'border-green-500/30'}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Margem de Contribuição</CardTitle>
            </CardHeader>
            <CardContent className="flex items-baseline gap-3">
              <p className="text-xl font-semibold">{formatCurrency(pricing.contribution_margin)}</p>
              <p className={`text-lg font-medium ${pricing.contribution_margin_pct < 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                ({formatPercent(pricing.contribution_margin_pct)})
              </p>
            </CardContent>
          </Card>

          {/* Per KG and Per Portion */}
          {(pricing.cost_per_kg !== undefined || pricing.cost_per_portion !== undefined) && (
            <div className="grid grid-cols-2 gap-3">
              {pricing.cost_per_kg !== undefined && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Scale className="w-4 h-4 text-orange-600" />
                      Por KG
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p className="text-xs text-muted-foreground">Custo: {formatCurrency(pricing.cost_per_kg)}</p>
                    <p className="text-lg font-semibold text-orange-600">Preço: {formatCurrency(pricing.price_per_kg!)}</p>
                  </CardContent>
                </Card>
              )}
              {pricing.cost_per_portion !== undefined && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Slice className="w-4 h-4 text-violet-600" />
                      Por Porção
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p className="text-xs text-muted-foreground">Custo: {formatCurrency(pricing.cost_per_portion)}</p>
                    <p className="text-lg font-semibold text-violet-600">Preço: {formatCurrency(pricing.price_per_portion!)}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
