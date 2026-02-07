import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { PricingConfigGlobal, useUpdatePricingConfigGlobal } from '@/hooks/usePricingData';
import { Settings, AlertTriangle, Info } from 'lucide-react';

interface GlobalConfigFormProps {
  config: PricingConfigGlobal;
}

export function GlobalConfigForm({ config }: GlobalConfigFormProps) {
  const [variableExpenses, setVariableExpenses] = useState('10');
  const [fixedExpenses, setFixedExpenses] = useState('30');
  const [profit, setProfit] = useState('15');
  const [investment, setInvestment] = useState('5');
  const [healthyMargin, setHealthyMargin] = useState('50');
  const [proximityFactor, setProximityFactor] = useState('1.05');

  const updateConfig = useUpdatePricingConfigGlobal();

  useEffect(() => {
    if (config) {
      setVariableExpenses(config.variable_expenses_pct.toString());
      setFixedExpenses(config.fixed_expenses_pct.toString());
      setProfit(config.profit_pct.toString());
      setInvestment(config.investment_pct.toString());
      setHealthyMargin(config.healthy_margin_threshold.toString());
      setProximityFactor(config.price_proximity_factor.toString());
    }
  }, [config]);

  const totalPct =
    (parseFloat(variableExpenses) || 0) +
    (parseFloat(fixedExpenses) || 0) +
    (parseFloat(profit) || 0) +
    (parseFloat(investment) || 0);

  const hasError = totalPct >= 100;
  const hasWarning = totalPct >= 80 && totalPct < 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasError) return;

    await updateConfig.mutateAsync({
      id: config.id,
      variable_expenses_pct: parseFloat(variableExpenses) || 0,
      fixed_expenses_pct: parseFloat(fixedExpenses) || 0,
      profit_pct: parseFloat(profit) || 0,
      investment_pct: parseFloat(investment) || 0,
      healthy_margin_threshold: parseFloat(healthyMargin) || 50,
      price_proximity_factor: parseFloat(proximityFactor) || 1.05,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configuração Global de Percentuais
        </CardTitle>
        <CardDescription>
          Estes percentuais serão aplicados a todos os produtos que não possuem configuração específica
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Percentuais principais */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              Percentuais para Formação de Preço
            </h4>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dv">DV% - Despesas Variáveis</Label>
                <div className="relative">
                  <Input
                    id="dv"
                    type="number"
                    step="0.1"
                    min="0"
                    max="99"
                    value={variableExpenses}
                    onChange={(e) => setVariableExpenses(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Taxa cartão, marketplace, comissões
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="df">DF% - Despesas Fixas</Label>
                <div className="relative">
                  <Input
                    id="df"
                    type="number"
                    step="0.1"
                    min="0"
                    max="99"
                    value={fixedExpenses}
                    onChange={(e) => setFixedExpenses(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Aluguel, água, luz, salários, contador
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="l">L% - Lucro Desejado</Label>
                <div className="relative">
                  <Input
                    id="l"
                    type="number"
                    step="0.1"
                    min="0"
                    max="99"
                    value={profit}
                    onChange={(e) => setProfit(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Lucro líquido por unidade vendida</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="i">I% - Taxa de Investimento</Label>
                <div className="relative">
                  <Input
                    id="i"
                    type="number"
                    step="0.1"
                    min="0"
                    max="99"
                    value={investment}
                    onChange={(e) => setInvestment(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Reserva para reinvestimento</p>
              </div>
            </div>

            {/* Total indicator */}
            <div
              className={`p-3 rounded-lg ${
                hasError
                  ? 'bg-destructive/10 border border-destructive/30'
                  : hasWarning
                  ? 'bg-yellow-500/10 border border-yellow-500/30'
                  : 'bg-muted'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total de Percentuais:</span>
                <span
                  className={`text-lg font-bold ${
                    hasError ? 'text-destructive' : hasWarning ? 'text-yellow-600' : ''
                  }`}
                >
                  {totalPct.toFixed(1)}%
                </span>
              </div>
              {hasError && (
                <p className="text-xs text-destructive mt-1">
                  A soma não pode atingir ou ultrapassar 100%
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Parâmetros de status */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              Parâmetros de Alerta
            </h4>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="healthyMargin">Margem Saudável Mínima (%)</Label>
                <div className="relative">
                  <Input
                    id="healthyMargin"
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={healthyMargin}
                    onChange={(e) => setHealthyMargin(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Abaixo disso, produto entra em "Atenção"
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proximity">Fator de Proximidade (PV/PM)</Label>
                <Input
                  id="proximity"
                  type="number"
                  step="0.01"
                  min="1"
                  max="2"
                  value={proximityFactor}
                  onChange={(e) => setProximityFactor(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Se PV ≤ PM × fator, produto entra em "Atenção"
                </p>
              </div>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              A fórmula SEBRAE calcula: <strong>PV = CVU ÷ (1 - DV% - DF% - L% - I%)</strong>
            </AlertDescription>
          </Alert>

          <Button type="submit" disabled={hasError || updateConfig.isPending} className="w-full">
            {updateConfig.isPending ? 'Salvando...' : 'Salvar Configuração Global'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
