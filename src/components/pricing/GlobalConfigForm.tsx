import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PricingConfigGlobal, useUpdatePricingConfigGlobal } from '@/hooks/usePricingData';
import {
  usePricingFixedCosts,
  usePricingVariableCosts,
  useUpsertFixedCost,
  useDeleteFixedCost,
  useUpsertVariableCost,
  useDeleteVariableCost,
} from '@/hooks/usePricingCosts';
import { Settings, Info, Plus, Trash2 } from 'lucide-react';

interface GlobalConfigFormProps {
  config: PricingConfigGlobal;
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function GlobalConfigForm({ config }: GlobalConfigFormProps) {
  const [profit, setProfit] = useState('15');
  const [investment, setInvestment] = useState('5');
  const [healthyMargin, setHealthyMargin] = useState('50');
  const [proximityFactor, setProximityFactor] = useState('1.05');
  const [monthlyRevenue, setMonthlyRevenue] = useState('0');

  const updateConfig = useUpdatePricingConfigGlobal();

  const { data: fixedCosts = [] } = usePricingFixedCosts();
  const { data: variableCosts = [] } = usePricingVariableCosts();
  const upsertFixed = useUpsertFixedCost();
  const deleteFixed = useDeleteFixedCost();
  const upsertVariable = useUpsertVariableCost();
  const deleteVariable = useDeleteVariableCost();

  const [newFixedName, setNewFixedName] = useState('');
  const [newFixedAmount, setNewFixedAmount] = useState('');
  const [newVarName, setNewVarName] = useState('');
  const [newVarPct, setNewVarPct] = useState('');

  useEffect(() => {
    if (config) {
      setProfit(config.profit_pct.toString());
      setInvestment(config.investment_pct.toString());
      setHealthyMargin(config.healthy_margin_threshold.toString());
      setProximityFactor(config.price_proximity_factor.toString());
      setMonthlyRevenue((config.monthly_revenue ?? 0).toString());
    }
  }, [config]);

  const totalFixedAmount = useMemo(
    () => fixedCosts.filter((c) => c.is_active).reduce((s, c) => s + Number(c.amount || 0), 0),
    [fixedCosts]
  );

  const totalVariablePct = useMemo(
    () => variableCosts.filter((c) => c.is_active).reduce((s, c) => s + Number(c.percentage || 0), 0),
    [variableCosts]
  );

  const revenue = parseFloat(monthlyRevenue) || 0;
  const computedFixedPct = revenue > 0 ? (totalFixedAmount / revenue) * 100 : 0;
  const computedVariablePct = totalVariablePct;

  const totalPct =
    computedFixedPct +
    computedVariablePct +
    (parseFloat(profit) || 0) +
    (parseFloat(investment) || 0);

  const hasError = totalPct >= 100;
  const hasWarning = totalPct >= 80 && totalPct < 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasError) return;
    await updateConfig.mutateAsync({
      id: config.id,
      variable_expenses_pct: Number(computedVariablePct.toFixed(4)),
      fixed_expenses_pct: Number(computedFixedPct.toFixed(4)),
      profit_pct: parseFloat(profit) || 0,
      investment_pct: parseFloat(investment) || 0,
      healthy_margin_threshold: parseFloat(healthyMargin) || 50,
      price_proximity_factor: parseFloat(proximityFactor) || 1.05,
      monthly_revenue: revenue,
    } as any);
  };

  const handleAddFixed = async () => {
    if (!newFixedName.trim()) return;
    await upsertFixed.mutateAsync({
      name: newFixedName.trim(),
      amount: parseFloat(newFixedAmount) || 0,
      is_active: true,
    });
    setNewFixedName('');
    setNewFixedAmount('');
  };

  const handleAddVariable = async () => {
    if (!newVarName.trim()) return;
    await upsertVariable.mutateAsync({
      name: newVarName.trim(),
      percentage: parseFloat(newVarPct) || 0,
      is_active: true,
    });
    setNewVarName('');
    setNewVarPct('');
  };

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Faturamento e Lucro
        </CardTitle>
        <CardDescription>
          Informe o faturamento médio mensal e os percentuais de lucro e investimento aplicados na precificação automática.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="revenue">Faturamento Médio Mensal (R$)</Label>
              <Input
                id="revenue"
                type="number"
                step="0.01"
                min="0"
                value={monthlyRevenue}
                onChange={(e) => setMonthlyRevenue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Base usada para calcular o percentual dos custos fixos.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
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

            {/* Resumo */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Custos Fixos (R$)</p>
                <p className="text-base font-bold">{formatBRL(totalFixedAmount)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">DF% (Custo Fixo)</p>
                <p className="text-base font-bold">{computedFixedPct.toFixed(2)}%</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">DV% (Custo Variável)</p>
                <p className="text-base font-bold">{computedVariablePct.toFixed(2)}%</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Total Operacional</p>
                <p className="text-base font-bold">
                  {(computedFixedPct + computedVariablePct).toFixed(2)}%
                </p>
              </div>
            </div>

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
                <span className="text-sm font-medium">Total (DF+DV+L+I):</span>
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
              Os custos fixos cadastrados serão divididos pelo faturamento médio para gerar o DF%.
              Os custos variáveis ativos serão somados para gerar o DV%. A fórmula final é{' '}
              <strong>PV = CVU ÷ (1 - DV% - DF% - L% - I%)</strong>.
            </AlertDescription>
          </Alert>

          <Button type="submit" disabled={hasError || updateConfig.isPending} className="w-full">
            {updateConfig.isPending ? 'Salvando...' : 'Salvar configuração'}
          </Button>
          {config.updated_at && (
            <p className="text-xs text-muted-foreground text-center">
              Última atualização: {new Date(config.updated_at).toLocaleString('pt-BR')}
            </p>
          )}
        </form>
      </CardContent>
    </Card>

    {/* Custos Fixos */}
    <Card>
      <CardHeader>
        <CardTitle>Custos Fixos (R$)</CardTitle>
        <CardDescription>
          Cadastre aluguel, salários, contas e outros custos mensais fixos. O percentual sobre o faturamento é calculado automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[1fr_140px_auto] gap-2">
          <Input
            placeholder="Nome (ex.: Aluguel)"
            value={newFixedName}
            onChange={(e) => setNewFixedName(e.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="Valor R$"
            value={newFixedAmount}
            onChange={(e) => setNewFixedAmount(e.target.value)}
          />
          <Button type="button" onClick={handleAddFixed} disabled={upsertFixed.isPending}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {fixedCosts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum custo fixo cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="w-[160px]">Valor (R$)</TableHead>
                <TableHead className="w-[100px]">Ativo</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fixedCosts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Input
                      defaultValue={c.name}
                      onBlur={(e) => {
                        if (e.target.value !== c.name) {
                          upsertFixed.mutate({ id: c.id, name: e.target.value, amount: c.amount, is_active: c.is_active });
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={c.amount}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        if (v !== Number(c.amount)) {
                          upsertFixed.mutate({ id: c.id, name: c.name, amount: v, is_active: c.is_active });
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={c.is_active}
                      onCheckedChange={(v) =>
                        upsertFixed.mutate({ id: c.id, name: c.name, amount: c.amount, is_active: v })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteFixed.mutate(c.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex justify-between text-sm pt-2 border-t">
          <span className="text-muted-foreground">Total ativo:</span>
          <span className="font-semibold">{formatBRL(totalFixedAmount)} · {computedFixedPct.toFixed(2)}%</span>
        </div>
      </CardContent>
    </Card>

    {/* Custos Variáveis */}
    <Card>
      <CardHeader>
        <CardTitle>Custos Variáveis (%)</CardTitle>
        <CardDescription>
          Cadastre percentuais como taxa de cartão, iFood, impostos e comissões. A soma dos ativos é usada como DV%.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[1fr_140px_auto] gap-2">
          <Input
            placeholder="Nome (ex.: Taxa cartão)"
            value={newVarName}
            onChange={(e) => setNewVarName(e.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="%"
            value={newVarPct}
            onChange={(e) => setNewVarPct(e.target.value)}
          />
          <Button type="button" onClick={handleAddVariable} disabled={upsertVariable.isPending}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {variableCosts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum custo variável cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="w-[120px]">%</TableHead>
                <TableHead className="w-[100px]">Ativo</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {variableCosts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Input
                      defaultValue={c.name}
                      onBlur={(e) => {
                        if (e.target.value !== c.name) {
                          upsertVariable.mutate({ id: c.id, name: e.target.value, percentage: c.percentage, is_active: c.is_active });
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={c.percentage}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        if (v !== Number(c.percentage)) {
                          upsertVariable.mutate({ id: c.id, name: c.name, percentage: v, is_active: c.is_active });
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={c.is_active}
                      onCheckedChange={(v) =>
                        upsertVariable.mutate({ id: c.id, name: c.name, percentage: c.percentage, is_active: v })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteVariable.mutate(c.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex justify-between text-sm pt-2 border-t">
          <span className="text-muted-foreground">Total ativo:</span>
          <span className="font-semibold">{computedVariablePct.toFixed(2)}%</span>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
