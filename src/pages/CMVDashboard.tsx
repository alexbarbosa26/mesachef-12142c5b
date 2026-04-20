import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStockData } from '@/hooks/useStockData';
import { useStockPurchases } from '@/hooks/useStockPurchases';
import { useStockHistory } from '@/hooks/useStockHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Package,
} from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import {
  calculateCMVByProduct,
  formatCurrency,
  formatPercent,
} from '@/utils/cmvCalculations';
import { calculateItemTotalValue, normalizeQuantityToBaseUnit } from '@/utils/stockValuation';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const CMVDashboard = () => {
  const { stockItems, categories, loading: stockLoading } = useStockData();
  const { purchases, loading: purchasesLoading } = useStockPurchases();
  const { history } = useStockHistory();

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [periodStart, setPeriodStart] = useState(
    format(subDays(new Date(), 30), 'yyyy-MM-dd')
  );
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  const loading = stockLoading || purchasesLoading;

  // Filter purchases by period
  const periodPurchases = useMemo(() => {
    return purchases.filter(
      (p) => p.purchase_date >= periodStart && p.purchase_date <= periodEnd
    );
  }, [purchases, periodStart, periodEnd]);

  // Calculate CMV by product
  const cmvByProduct = useMemo(() => {
    const activeItems = stockItems.filter((i) => i.is_active);
    const filtered =
      filterCategory === 'all'
        ? activeItems
        : activeItems.filter((i) => i.category_id === filterCategory);

    const results = filtered.map((item) => {
      // Get initial quantity from history or use current
      const itemHistory = history
        .filter(
          (h) =>
            h.item_id === item.id &&
            h.created_at >= periodStart &&
            h.created_at <= periodEnd
        )
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

      const initialQty =
        itemHistory.length > 0
          ? itemHistory[0].previous_quantity
          : item.current_quantity;

      return calculateCMVByProduct(item, periodPurchases, initialQty);
    });

    const totalCMV = results.reduce((sum, r) => sum + r.cmvValue, 0);

    // Calculate percentages
    return results
      .map((r) => ({
        ...r,
        cmvPct: totalCMV > 0 ? (r.cmvValue / totalCMV) * 100 : 0,
      }))
      .sort((a, b) => b.cmvValue - a.cmvValue);
  }, [stockItems, periodPurchases, history, filterCategory, periodStart, periodEnd]);

  // Summary metrics
  const totalCMV = cmvByProduct.reduce((sum, r) => sum + r.cmvValue, 0);
  const totalPurchases = periodPurchases.reduce((sum, p) => sum + p.total_cost, 0);
  const currentStockValue = stockItems
    .filter((i) => i.is_active)
    .reduce((sum, i) => sum + calculateItemTotalValue(i), 0);

  // Losses (items with negative or zero CMV are excluded)
  const losses = cmvByProduct.filter((r) => r.cmvValue > 0);
  const totalLosses = losses.reduce((sum, r) => sum + r.cmvValue, 0);
  const lossesPct = currentStockValue > 0 ? (totalLosses / (currentStockValue + totalLosses)) * 100 : 0;

  // Weekly trend chart data
  const weeklyTrend = useMemo(() => {
    const weeks: { week: string; cmv: number; compras: number }[] = [];
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    let current = startOfWeek(start, { weekStartsOn: 1 });

    while (current <= end) {
      const weekEnd = endOfWeek(current, { weekStartsOn: 1 });
      const weekStartStr = format(current, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd > end ? end : weekEnd, 'yyyy-MM-dd');

      const weekPurchases = periodPurchases.filter(
        (p) => p.purchase_date >= weekStartStr && p.purchase_date <= weekEndStr
      );
      const weekPurchaseTotal = weekPurchases.reduce(
        (sum, p) => sum + p.total_cost,
        0
      );

      weeks.push({
        week: format(current, 'dd/MM', { locale: ptBR }),
        cmv: weekPurchaseTotal * 0.85, // Estimated CMV as 85% of purchases
        compras: weekPurchaseTotal,
      });

      current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    return weeks;
  }, [periodPurchases, periodStart, periodEnd]);

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoader message="Calculando CMV..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Controle de CMV
          </h1>
          <p className="text-muted-foreground">
            Custo de Mercadoria Vendida — Análise financeira do estoque
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Início</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fim</Label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Categoria</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CMV Total</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(totalCMV)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Compras no Período</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(totalPurchases)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent rounded-lg">
                  <Package className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estoque Atual</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(currentStockValue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${lossesPct > 10 ? 'bg-destructive/10' : 'bg-warning-bg'}`}>
                  <AlertTriangle
                    className={`w-5 h-5 ${lossesPct > 10 ? 'text-destructive' : 'text-warning'}`}
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Perdas Estimadas</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatPercent(lossesPct)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Trend Chart */}
        {weeklyTrend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Evolução Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="week" className="text-xs" />
                    <YAxis
                      className="text-xs"
                      tickFormatter={(v) =>
                        `R$${(v / 1000).toFixed(0)}k`
                      }
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Semana de ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="compras"
                      name="Compras"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.2)"
                    />
                    <Area
                      type="monotone"
                      dataKey="cmv"
                      name="CMV Estimado"
                      stroke="hsl(var(--destructive))"
                      fill="hsl(var(--destructive) / 0.1)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CMV by Product Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              CMV por Produto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cmvByProduct.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado de CMV disponível para o período selecionado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Estoque Inicial</TableHead>
                      <TableHead>Compras</TableHead>
                      <TableHead>Estoque Final</TableHead>
                      <TableHead>Valor Unit.</TableHead>
                      <TableHead>CMV</TableHead>
                      <TableHead>% do Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cmvByProduct.filter(r => r.cmvValue > 0).map((row) => {
                      const category = categories.find(
                        (c) => c.id === row.categoryId
                      );
                      return (
                        <TableRow key={row.itemId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{row.itemName}</p>
                              <p className="text-xs text-muted-foreground">
                                {category?.name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {row.initialQty} {row.unit}
                          </TableCell>
                          <TableCell>
                            {row.purchasesQty} {row.unit}
                          </TableCell>
                          <TableCell>
                            {row.finalQty} {row.unit}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(row.unitValue)}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(row.cmvValue)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                row.cmvPct > 20
                                  ? 'destructive'
                                  : row.cmvPct > 10
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {formatPercent(row.cmvPct)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CMVDashboard;