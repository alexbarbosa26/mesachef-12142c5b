import { useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageLoader } from '@/components/ui/page-loader';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle, BarChart3, Boxes, Calculator, ClipboardList,
  DollarSign, Info, Package, PackageX, ShoppingCart, Tag, TrendingDown, TrendingUp,
} from 'lucide-react';
import { useCentralLucroData } from '@/hooks/useCentralLucroData';
import { Period, formatCurrency, formatPercent } from '@/utils/centralLucroCalculations';
import { calculateItemTotalValue } from '@/utils/stockValuation';
import { ExecutiveCard } from '@/components/central-lucro/ExecutiveCard';
import { SmartAlert, SmartAlertItem } from '@/components/central-lucro/SmartAlert';
import { PeriodSelector } from '@/components/central-lucro/PeriodSelector';
import { SelfServiceSummary } from '@/components/central-lucro/SelfServiceSummary';
import {
  CMVEvolutionChart, PurchasesChart, StockByCategoryChart,
  TopImpactItemsChart, PriceGapChart,
} from '@/components/central-lucro/charts/CentralLucroCharts';
import { calculatePricing } from '@/hooks/usePricingData';
import { getExpiryStatus } from '@/components/ExpiryBadge';

const CentralLucro = () => {
  const [period, setPeriod] = useState<Period>('30d');
  const data = useCentralLucroData(period);

  // ===== KPIs =====
  const kpis = useMemo(() => {
    const active = data.stockItems.filter((i: any) => i.is_active);

    const stockValue = active.reduce(
      (s: number, i: any) => s + calculateItemTotalValue(i), 0
    );
    const purchasesValue = data.purchases.reduce(
      (s: number, p: any) => s + Number(p.total_cost || 0), 0
    );
    const lossesValue = data.adjustments.reduce(
      (s: number, a: any) => s + Math.abs(Number(a.value_impact || 0)), 0
    );

    // CMV: prefer most recent snapshot whose period overlaps the range
    const lastSnap = data.snapshots[data.snapshots.length - 1];
    let cmvReal = 0;
    let cmvSource: 'snapshot' | 'estimated' = 'estimated';
    if (lastSnap) {
      cmvReal = Number(lastSnap.real_cmv || 0);
      cmvSource = 'snapshot';
    } else {
      // Estimativa: compras - variação de estoque (sem inicial confiável => apenas compras como proxy)
      cmvReal = purchasesValue;
    }
    const revenue = Number(data.pricingGlobal?.monthly_revenue || 0);
    const cmvPct = revenue > 0 ? (cmvReal / revenue) * 100 : 0;

    const outOfStock = active.filter((i: any) => Number(i.current_quantity) === 0).length;
    const lowStock = active.filter((i: any) =>
      Number(i.current_quantity) > 0 && Number(i.current_quantity) <= Number(i.minimum_stock)
    ).length;
    const expiring = active.filter((i: any) => {
      const s = getExpiryStatus(i.expiry_date, 7);
      return s.status === 'expired' || s.status === 'expiring';
    }).length;

    // Precificação
    const sheetsByProduct = new Map(
      data.technicalSheets.map((s: any) => [s.product_id, s])
    );
    let pricedBelow = 0;
    let incompleteSheets = 0;
    const priceGap: { name: string; atual: number; sugerido: number; diff: number }[] = [];

    if (data.pricingGlobal) {
      for (const p of data.pricingProducts as any[]) {
        const sheet: any = sheetsByProduct.get(p.id);
        if (!sheet) { incompleteSheets++; continue; }
        const ingCount = sheet.ingredient_count ?? (sheet.technical_sheet_ingredients?.length || 0);
        if (ingCount === 0 || !Number(sheet.cmv)) incompleteSheets++;
        const calc = calculatePricing(sheet, data.pricingGlobal);
        if (!calc) continue;
        const atual = Number(sheet.sale_price || 0);
        const sugerido = Number(calc.reference_suggested_price || 0);
        if (atual > 0 && sugerido > 0 && atual < sugerido) {
          pricedBelow++;
          priceGap.push({
            name: p.name.slice(0, 18),
            atual, sugerido, diff: sugerido - atual,
          });
        }
      }
    }
    priceGap.sort((a, b) => b.diff - a.diff);

    return {
      stockValue, purchasesValue, lossesValue,
      cmvReal, cmvPct, cmvSource,
      outOfStock, lowStock, expiring,
      pricedBelow, incompleteSheets,
      priceGap: priceGap.slice(0, 8),
    };
  }, [data]);

  // ===== Chart data =====
  const cmvSeries = useMemo(() => {
    return data.snapshots.map((s: any) => ({
      label: new Date(s.period_end).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      cmv: Number(s.real_cmv || 0),
    }));
  }, [data.snapshots]);

  const purchasesSeries = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const p of data.purchases as any[]) {
      const d = new Date(p.purchase_date);
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      buckets.set(key, (buckets.get(key) || 0) + Number(p.total_cost || 0));
    }
    return Array.from(buckets.entries()).map(([label, total]) => ({ label, total }));
  }, [data.purchases]);

  const stockByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of data.stockItems as any[]) {
      if (!item.is_active) continue;
      const cat = data.categories.find((c: any) => c.id === item.category_id);
      const name = cat?.name || 'Sem categoria';
      map.set(name, (map.get(name) || 0) + calculateItemTotalValue(item));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data.stockItems, data.categories]);

  const topImpact = useMemo(() => {
    return (data.stockItems as any[])
      .filter((i) => i.is_active)
      .map((i) => ({ name: String(i.name).slice(0, 22), value: calculateItemTotalValue(i) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data.stockItems]);

  // ===== Alertas =====
  const alerts = useMemo<SmartAlertItem[]>(() => {
    const out: SmartAlertItem[] = [];
    const active = data.stockItems.filter((i: any) => i.is_active);

    for (const item of active) {
      if (Number(item.current_quantity) === 0) {
        out.push({
          id: `oos-${item.id}`,
          severity: 'critical',
          title: `${item.name} sem estoque`,
          description: 'Esse insumo está zerado e pode impactar suas receitas.',
          action: 'Reponha o estoque antes do próximo serviço.',
          to: '/stock-entry',
        });
      } else if (Number(item.current_quantity) <= Number(item.minimum_stock) * 0.5) {
        out.push({
          id: `crit-${item.id}`,
          severity: 'critical',
          title: `Estoque crítico: ${item.name}`,
          description: `Restam ${item.current_quantity} ${item.unit} (mínimo ${item.minimum_stock}).`,
          action: 'Programe a compra imediatamente para evitar ruptura.',
          to: '/stock-management',
        });
      }
      const exp = getExpiryStatus(item.expiry_date, 7);
      if (exp.status === 'expiring' || exp.status === 'expired') {
        out.push({
          id: `exp-${item.id}`,
          severity: exp.status === 'expired' ? 'critical' : 'warning',
          title: `${item.name} ${exp.status === 'expired' ? 'vencido' : 'próximo do vencimento'}`,
          description: 'Evite desperdício priorizando receitas que usam esse insumo.',
          action: 'Crie um prato do dia ou promoção usando esse ingrediente.',
          to: '/stock-management',
        });
      }
    }

    // Custo subindo (compras recentes vs valor atual do estoque)
    const purchaseByItem = new Map<string, any[]>();
    for (const p of data.purchases as any[]) {
      const arr = purchaseByItem.get(p.stock_item_id) || [];
      arr.push(p);
      purchaseByItem.set(p.stock_item_id, arr);
    }
    for (const [itemId, list] of purchaseByItem) {
      if (list.length < 2) continue;
      list.sort((a, b) => a.purchase_date.localeCompare(b.purchase_date));
      const first = Number(list[0].unit_cost || 0);
      const last = Number(list[list.length - 1].unit_cost || 0);
      if (first > 0 && last > first * 1.1) {
        const item = (data.stockItems as any[]).find((i) => i.id === itemId);
        if (!item) continue;
        out.push({
          id: `cost-${itemId}`,
          severity: 'warning',
          title: `Custo de ${item.name} subiu ${(((last - first) / first) * 100).toFixed(0)}%`,
          description: `Variação relevante entre compras no período.`,
          action: 'Reavalie fornecedores ou repasse parte do aumento no preço de venda.',
          to: '/stock-purchases',
        });
      }
    }

    // CMV acima da meta
    if (kpis.cmvSource === 'snapshot' && kpis.cmvPct > 35) {
      out.push({
        id: 'cmv-high',
        severity: 'warning',
        title: `CMV em ${formatPercent(kpis.cmvPct)} — acima da meta`,
        description: 'Seu custo da mercadoria vendida está pressionando a margem.',
        action: 'Revise fichas técnicas, fornecedores e gramaturas para reduzir custos.',
        to: '/cmv',
      });
    }

    // Fichas incompletas
    if (kpis.incompleteSheets > 0) {
      out.push({
        id: 'sheets-incomplete',
        severity: 'info',
        title: `${kpis.incompleteSheets} ficha(s) técnica(s) sem custo completo`,
        description: 'Sem ingredientes ou CMV cadastrado, a precificação fica imprecisa.',
        action: 'Complete os ingredientes para calcular o preço sugerido com precisão.',
        to: '/pricing',
      });
    }

    // Divergência CMV real x teórico (último snapshot)
    const last = data.snapshots[data.snapshots.length - 1];
    if (last && Math.abs(Number(last.difference_pct || 0)) > 5) {
      out.push({
        id: 'cmv-divergence',
        severity: 'warning',
        title: 'Divergência entre CMV real e teórico',
        description: `Diferença de ${formatPercent(Number(last.difference_pct))} no último fechamento.`,
        action: 'Realize contagem física e ajuste perdas/quebras para alinhar os números.',
        to: '/cmv/snapshots',
      });
    }

    // Preço defasado
    if (kpis.pricedBelow > 0) {
      out.push({
        id: 'prices-below',
        severity: 'warning',
        title: `${kpis.pricedBelow} produto(s) abaixo do preço sugerido`,
        description: 'Você pode estar deixando margem na mesa.',
        action: 'Revise os preços ou justifique o desconto estrategicamente.',
        to: '/pricing',
      });
    }

    const order = { critical: 0, warning: 1, info: 2 } as const;
    return out.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 10);
  }, [data, kpis]);

  if (data.loading) {
    return (
      <DashboardLayout>
        <PageLoader message="Carregando Central de Lucro..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" /> Central de Lucro
            </h1>
            <p className="text-sm text-muted-foreground">
              Visão executiva de margem, CMV, desperdício e precificação.
            </p>
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>

        {/* CMV source warning */}
        {kpis.cmvSource === 'estimated' && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>CMV estimado</AlertTitle>
            <AlertDescription>
              Não há snapshot de CMV no período. Para um CMV real, realize um fechamento
              de estoque em <a href="/cmv/snapshots" className="underline font-medium">Snapshots CMV</a>.
            </AlertDescription>
          </Alert>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <ExecutiveCard title="Valor em estoque" value={formatCurrency(kpis.stockValue)} icon={Boxes} to="/stock-valuation" />
          <ExecutiveCard title="Compras no período" value={formatCurrency(kpis.purchasesValue)} icon={ShoppingCart} to="/stock-purchases" />
          <ExecutiveCard
            title="CMV do período"
            value={formatCurrency(kpis.cmvReal)}
            hint={kpis.cmvSource === 'estimated' ? 'Estimado — sem snapshot' : 'Baseado em snapshot'}
            icon={TrendingDown}
            tone={kpis.cmvSource === 'estimated' ? 'warning' : 'default'}
            to="/cmv"
          />
          <ExecutiveCard
            title="CMV %"
            value={formatPercent(kpis.cmvPct)}
            hint="Meta saudável: ≤ 35%"
            icon={BarChart3}
            tone={kpis.cmvPct > 35 ? 'warning' : 'success'}
            to="/cmv"
          />
          <ExecutiveCard
            title="Perdas e ajustes"
            value={formatCurrency(kpis.lossesValue)}
            icon={AlertTriangle}
            tone={kpis.lossesValue > 0 ? 'warning' : 'default'}
            to="/stock-adjustments"
          />
          <ExecutiveCard title="Sem estoque" value={kpis.outOfStock} icon={PackageX} tone={kpis.outOfStock > 0 ? 'destructive' : 'success'} to="/stock-management" />
          <ExecutiveCard title="Abaixo do mínimo" value={kpis.lowStock} icon={Package} tone={kpis.lowStock > 0 ? 'warning' : 'success'} to="/stock-management" />
          <ExecutiveCard title="Próx. vencimento" value={kpis.expiring} icon={AlertTriangle} tone={kpis.expiring > 0 ? 'warning' : 'success'} to="/stock-management" />
          <ExecutiveCard title="Preço abaixo do sugerido" value={kpis.pricedBelow} icon={Tag} tone={kpis.pricedBelow > 0 ? 'warning' : 'success'} to="/pricing" />
          <ExecutiveCard title="Fichas incompletas" value={kpis.incompleteSheets} icon={ClipboardList} tone={kpis.incompleteSheets > 0 ? 'info' : 'success'} to="/pricing" />
        </div>

        {/* Alertas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" /> Alertas inteligentes
              {alerts.length > 0 && <Badge variant="secondary">{alerts.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tudo certo por aqui! Sem alertas no momento.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {alerts.map((a) => <SmartAlert key={a.id} alert={a} />)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Evolução do CMV</CardTitle></CardHeader>
            <CardContent><CMVEvolutionChart data={cmvSeries} /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Compras no período</CardTitle></CardHeader>
            <CardContent><PurchasesChart data={purchasesSeries} /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Valor em estoque por categoria</CardTitle></CardHeader>
            <CardContent><StockByCategoryChart data={stockByCategory} /></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Top 10 insumos por valor parado</CardTitle></CardHeader>
            <CardContent><TopImpactItemsChart data={topImpact} /></CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4" /> Maiores diferenças: preço atual x sugerido
              </CardTitle>
            </CardHeader>
            <CardContent><PriceGapChart data={kpis.priceGap} /></CardContent>
          </Card>
        </div>

        {/* Self-service */}
        <SelfServiceSummary records={data.selfServiceRecords as any} />
      </div>
    </DashboardLayout>
  );
};

export default CentralLucro;
