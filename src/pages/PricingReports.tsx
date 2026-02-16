import { useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { AdminOnlyGuard } from '@/components/pricing/AdminOnlyGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PricingStatusBadge } from '@/components/pricing/PricingStatusBadge';
import {
  usePricingProducts,
  useTechnicalSheets,
  usePricingConfigGlobal,
  usePricingConfigProducts,
  calculatePricing,
  CATEGORY_LABELS,
  ProductCategory,
  CalculatedPricing,
} from '@/hooks/usePricingData';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
} from 'lucide-react';

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'];

export default function PricingReports() {
  const { data: products, isLoading: productsLoading } = usePricingProducts();
  const { data: sheets, isLoading: sheetsLoading } = useTechnicalSheets();
  const { data: globalConfig, isLoading: configLoading } = usePricingConfigGlobal();
  const { data: productConfigs } = usePricingConfigProducts();

  const isLoading = productsLoading || sheetsLoading || configLoading;

  // Calcula dados para relatórios
  const reportData = useMemo(() => {
    if (!products || !sheets || !globalConfig) return null;

    const sheetsMap = new Map(sheets.map(s => [s.product_id, s]));
    const configsMap = new Map((productConfigs || []).map(c => [c.product_id, c]));

    // Produtos com cálculos
    const productsWithPricing = products
      .filter(p => p.is_active)
      .map(product => {
        const sheet = sheetsMap.get(product.id);
        const config = configsMap.get(product.id);
        const pricing = sheet ? calculatePricing(sheet, globalConfig, config) : undefined;
        
        return {
          ...product,
          sheet,
          pricing,
        };
      })
      .filter(p => p.pricing);

    // Estatísticas gerais
    const totalProducts = productsWithPricing.length;
    const productsWithSheet = productsWithPricing.filter(p => p.sheet).length;
    
    // Métricas de preço e margem
    const avgCVU = productsWithPricing.reduce((sum, p) => sum + (p.pricing?.cvu || 0), 0) / totalProducts || 0;
    const avgPV = productsWithPricing.reduce((sum, p) => sum + (p.pricing?.pv || 0), 0) / totalProducts || 0;
    const avgMargin = productsWithPricing.reduce((sum, p) => sum + (p.pricing?.contribution_margin_pct || 0), 0) / totalProducts || 0;
    const avgProfit = productsWithPricing.reduce((sum, p) => sum + (p.pricing?.profit_per_unit || 0), 0) / totalProducts || 0;

    // Status distribution
    const statusCounts = {
      saudavel: productsWithPricing.filter(p => p.pricing?.status === 'saudavel').length,
      atencao: productsWithPricing.filter(p => p.pricing?.status === 'atencao').length,
      inviavel: productsWithPricing.filter(p => p.pricing?.status === 'inviavel').length,
    };

    // Por categoria
    const byCategory = Object.entries(CATEGORY_LABELS).map(([key, label]) => {
      const categoryProducts = productsWithPricing.filter(p => p.category === key);
      const count = categoryProducts.length;
      const avgMarginCat = count > 0 
        ? categoryProducts.reduce((sum, p) => sum + (p.pricing?.contribution_margin_pct || 0), 0) / count 
        : 0;
      const totalRevenue = categoryProducts.reduce((sum, p) => sum + (p.pricing?.pv || 0), 0);
      
      return {
        category: key as ProductCategory,
        label,
        count,
        avgMargin: avgMarginCat,
        totalRevenue,
      };
    }).filter(c => c.count > 0);

    // Ranking de produtos (mais rentáveis)
    const topProfitable = [...productsWithPricing]
      .sort((a, b) => (b.pricing?.contribution_margin_pct || 0) - (a.pricing?.contribution_margin_pct || 0))
      .slice(0, 10);

    // Produtos em atenção/inviáveis
    const problematicProducts = productsWithPricing
      .filter(p => p.pricing?.status !== 'saudavel')
      .sort((a, b) => {
        // Inviáveis primeiro
        if (a.pricing?.status === 'inviavel' && b.pricing?.status !== 'inviavel') return -1;
        if (a.pricing?.status !== 'inviavel' && b.pricing?.status === 'inviavel') return 1;
        return (a.pricing?.contribution_margin_pct || 0) - (b.pricing?.contribution_margin_pct || 0);
      });

    // Dados para gráfico de barras (margens por produto)
    const marginChartData = productsWithPricing.map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + '…' : p.name,
      'Margem (%)': Number((p.pricing?.contribution_margin_pct || 0).toFixed(1)),
    }));

    // Dados para gráfico de pizza (status)
    const statusChartData = [
      { name: 'Saudável', value: statusCounts.saudavel, color: '#10b981' },
      { name: 'Atenção', value: statusCounts.atencao, color: '#f59e0b' },
      { name: 'Inviável', value: statusCounts.inviavel, color: '#ef4444' },
    ].filter(d => d.value > 0);

    return {
      totalProducts,
      productsWithSheet,
      avgCVU,
      avgPV,
      avgMargin,
      avgProfit,
      statusCounts,
      byCategory,
      topProfitable,
      problematicProducts,
      marginChartData,
      statusChartData,
    };
  }, [products, sheets, globalConfig, productConfigs]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AdminOnlyGuard>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="w-8 h-8" />
              Relatórios de Precificação
            </h1>
            <p className="text-muted-foreground mt-1">
              Análise de margens, custos e rentabilidade dos produtos
            </p>
          </div>

          {reportData && (
            <>
              {/* Cards de Resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Margem Média</CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{reportData.avgMargin.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">
                      Margem de contribuição média
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Custo Médio</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(reportData.avgCVU)}</div>
                    <p className="text-xs text-muted-foreground">
                      CVU médio por produto
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Preço Médio</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(reportData.avgPV)}</div>
                    <p className="text-xs text-muted-foreground">
                      Preço de venda médio
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Lucro Médio</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(reportData.avgProfit)}</div>
                    <p className="text-xs text-muted-foreground">
                      Lucro médio por unidade
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Cards de Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Produtos Saudáveis</CardTitle>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">{reportData.statusCounts.saudavel}</div>
                    <p className="text-xs text-muted-foreground">
                      Margem adequada e viáveis
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Produtos em Atenção</CardTitle>
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-yellow-600">{reportData.statusCounts.atencao}</div>
                    <p className="text-xs text-muted-foreground">
                      Margem baixa ou próximo do mínimo
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Produtos Inviáveis</CardTitle>
                    <XCircle className="h-5 w-5 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-600">{reportData.statusCounts.inviavel}</div>
                    <p className="text-xs text-muted-foreground">
                      Preço abaixo do mínimo aceitável
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de Barras - Margem por Categoria */}
                <Card>
                  <CardHeader>
                    <CardTitle>Margem por Produto</CardTitle>
                    <CardDescription>Margem de contribuição por produto</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {reportData.marginChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportData.marginChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-35} textAnchor="end" height={80} fontSize={11} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Margem (%)" fill="hsl(var(--primary))" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        Sem dados para exibir
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Gráfico de Pizza - Distribuição de Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição de Viabilidade</CardTitle>
                    <CardDescription>Status dos produtos precificados</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {reportData.statusChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={reportData.statusChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {reportData.statusChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        Sem dados para exibir
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Tabelas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Produtos Rentáveis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-500" />
                      Top 10 Produtos Mais Rentáveis
                    </CardTitle>
                    <CardDescription>Ordenados por margem de contribuição</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {reportData.topProfitable.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-right">Margem</TableHead>
                            <TableHead className="text-right">PV</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.topProfitable.map((product, index) => (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell>
                                <div>
                                  <span className="font-medium">{product.name}</span>
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {CATEGORY_LABELS[product.category]}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium text-green-600">
                                {product.pricing?.contribution_margin_pct.toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(product.pricing?.pv || 0)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum produto precificado ainda
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Produtos Problemáticos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      Produtos que Precisam de Atenção
                    </CardTitle>
                    <CardDescription>Produtos com margem baixa ou inviáveis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {reportData.problematicProducts.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Margem</TableHead>
                            <TableHead className="text-right">Gap PM</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.problematicProducts.map(product => (
                            <TableRow key={product.id}>
                              <TableCell>
                                <span className="font-medium">{product.name}</span>
                              </TableCell>
                              <TableCell>
                                <PricingStatusBadge status={product.pricing?.status || 'inviavel'} />
                              </TableCell>
                              <TableCell className="text-right">
                                {product.pricing?.contribution_margin_pct.toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-right text-red-600">
                                {formatCurrency((product.pricing?.pv || 0) - (product.pricing?.pm || 0))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-green-600">
                        <CheckCircle className="w-10 h-10 mx-auto mb-2" />
                        Todos os produtos estão saudáveis!
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Composição por Categoria */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Composição por Categoria
                  </CardTitle>
                  <CardDescription>Detalhamento de produtos por categoria</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-center">Qtd. Produtos</TableHead>
                        <TableHead className="text-right">Margem Média</TableHead>
                        <TableHead className="text-right">Receita Total Potencial</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.byCategory.map(cat => (
                        <TableRow key={cat.category}>
                          <TableCell>
                            <Badge variant="outline">{cat.label}</Badge>
                          </TableCell>
                          <TableCell className="text-center">{cat.count}</TableCell>
                          <TableCell className="text-right">
                            <span className={cat.avgMargin >= 50 ? 'text-green-600' : cat.avgMargin >= 30 ? 'text-yellow-600' : 'text-red-600'}>
                              {cat.avgMargin.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(cat.totalRevenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </AdminOnlyGuard>
    </DashboardLayout>
  );
}
