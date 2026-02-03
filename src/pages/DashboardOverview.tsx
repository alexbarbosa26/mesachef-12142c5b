import { useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStockData } from '@/hooks/useStockData';
import { useSettings } from '@/hooks/useSettings';
import { useStockHistory } from '@/hooks/useStockHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package,
  AlertCircle,
  Clock,
  PackageX,
  TrendingDown,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getExpiryStatus, ExpiryBadge } from '@/components/ExpiryBadge';
import { StockVariationBadge } from '@/components/StockVariationBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageLoader } from '@/components/ui/page-loader';
import PasswordExpiryAlert from '@/components/PasswordExpiryAlert';
import { exportToCSV, formatDateForExport } from '@/utils/exportUtils';
import { format } from 'date-fns';

const DashboardOverview = () => {
  const { categories, stockItems, loading } = useStockData();
  const { settings } = useSettings();
  const { getVariation } = useStockHistory();

  const stats = useMemo(() => {
    const totalItems = stockItems.length;
    
    const outOfStockItems = stockItems.filter(
      (item) => item.current_quantity === 0
    );
    
    const lowStockThreshold = settings.low_stock_percentage || 20;
    const lowStockItems = stockItems.filter((item) => {
      if (item.current_quantity === 0) return false; // Already counted as out of stock
      const threshold = item.minimum_stock * (1 + lowStockThreshold / 100);
      return item.current_quantity > 0 && item.current_quantity <= threshold;
    });
    
    const expiringItems = stockItems.filter((item) => {
      const { status } = getExpiryStatus(item.expiry_date, settings.expiry_alert_days);
      return status === 'expired' || status === 'expiring';
    });

    return {
      total: totalItems,
      outOfStock: outOfStockItems,
      lowStock: lowStockItems,
      expiring: expiringItems,
    };
  }, [stockItems, settings]);

  const getItemsByCategory = (items: typeof stockItems) => {
    const grouped: Record<string, typeof stockItems> = {};
    items.forEach((item) => {
      const category = categories.find((c) => c.id === item.category_id);
      const categoryName = category?.name || 'Sem Categoria';
      if (!grouped[categoryName]) {
        grouped[categoryName] = [];
      }
      grouped[categoryName].push(item);
    });
    return grouped;
  };

  const getCategoryStats = useMemo(() => {
    return categories.map((category) => {
      const items = stockItems.filter((item) => item.category_id === category.id);
      const totalValue = items.reduce((sum, item) => {
        return sum + (item.value || 0) * item.current_quantity;
      }, 0);
      const totalQuantity = items.reduce((sum, item) => sum + item.current_quantity, 0);
      
      return {
        id: category.id,
        name: category.name,
        itemCount: items.length,
        totalValue,
        totalQuantity,
      };
    });
  }, [categories, stockItems]);

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoader message="Carregando dashboard..." />
      </DashboardLayout>
    );
  }

  const handleExportStock = () => {
    const exportData = stockItems.map((item) => {
      const category = categories.find((c) => c.id === item.category_id);
      return {
        name: item.name,
        category: category?.name || 'Sem Categoria',
        current_quantity: item.current_quantity,
        unit: item.unit,
        minimum_stock: item.minimum_stock,
        value: item.value || 0,
        expiry_date: formatDateForExport(item.expiry_date),
        count_date: formatDateForExport(item.count_date),
      };
    });

    exportToCSV(exportData, `estoque_${format(new Date(), 'yyyy-MM-dd')}`, [
      { key: 'name', label: 'Produto' },
      { key: 'category', label: 'Categoria' },
      { key: 'current_quantity', label: 'Qtd. Atual' },
      { key: 'unit', label: 'Unidade' },
      { key: 'minimum_stock', label: 'Est. Mínimo' },
      { key: 'value', label: 'Valor (R$)' },
      { key: 'expiry_date', label: 'Validade' },
      { key: 'count_date', label: 'Data Contagem' },
    ]);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Password Expiry Alert */}
        <PasswordExpiryAlert />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral do estoque
            </p>
          </div>
          <Button onClick={handleExportStock} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar Estoque
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Itens</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(stats.outOfStock.length > 0 && 'border-destructive/50')}>
            <CardContent className="flex items-center gap-4 p-6">
              <div
                className={cn(
                  'flex items-center justify-center w-12 h-12 rounded-full',
                  stats.outOfStock.length > 0 ? 'bg-destructive/10' : 'bg-muted'
                )}
              >
                <PackageX
                  className={cn(
                    'w-6 h-6',
                    stats.outOfStock.length > 0
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  )}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sem Estoque</p>
                <p
                  className={cn(
                    'text-2xl font-bold',
                    stats.outOfStock.length > 0 && 'text-destructive'
                  )}
                >
                  {stats.outOfStock.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(stats.lowStock.length > 0 && 'border-warning/50')}>
            <CardContent className="flex items-center gap-4 p-6">
              <div
                className={cn(
                  'flex items-center justify-center w-12 h-12 rounded-full',
                  stats.lowStock.length > 0 ? 'bg-warning/10' : 'bg-muted'
                )}
              >
                <TrendingDown
                  className={cn(
                    'w-6 h-6',
                    stats.lowStock.length > 0
                      ? 'text-warning'
                      : 'text-muted-foreground'
                  )}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                <p
                  className={cn(
                    'text-2xl font-bold',
                    stats.lowStock.length > 0 && 'text-warning'
                  )}
                >
                  {stats.lowStock.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(stats.expiring.length > 0 && 'border-destructive/50')}>
            <CardContent className="flex items-center gap-4 p-6">
              <div
                className={cn(
                  'flex items-center justify-center w-12 h-12 rounded-full',
                  stats.expiring.length > 0 ? 'bg-destructive/10' : 'bg-muted'
                )}
              >
                <Clock
                  className={cn(
                    'w-6 h-6',
                    stats.expiring.length > 0
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  )}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Próx. Validade</p>
                <p
                  className={cn(
                    'text-2xl font-bold',
                    stats.expiring.length > 0 && 'text-destructive'
                  )}
                >
                  {stats.expiring.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs with detailed views */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1 w-full">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="out-of-stock">
              Sem Estoque
              {stats.outOfStock.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stats.outOfStock.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="low-stock">
              Estoque Baixo
              {stats.lowStock.length > 0 && (
                <Badge className="ml-2 bg-warning text-warning-foreground">
                  {stats.lowStock.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="expiring">
              Vencimentos
              {stats.expiring.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stats.expiring.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumo por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getCategoryStats.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">{cat.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {cat.itemCount} itens
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">
                            R$ {cat.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Alertas Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.outOfStock.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10"
                      >
                        <PackageX className="w-5 h-5 text-destructive" />
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">Sem estoque</p>
                        </div>
                      </div>
                    ))}
                    {stats.lowStock.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-warning/10"
                      >
                        <AlertCircle className="w-5 h-5 text-warning" />
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.current_quantity} {item.unit} restantes
                          </p>
                        </div>
                      </div>
                    ))}
                    {stats.expiring.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10"
                      >
                        <Clock className="w-5 h-5 text-destructive" />
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <ExpiryBadge
                            expiryDate={item.expiry_date}
                            alertDays={settings.expiry_alert_days}
                          />
                        </div>
                      </div>
                    ))}
                    {stats.outOfStock.length === 0 &&
                      stats.lowStock.length === 0 &&
                      stats.expiring.length === 0 && (
                        <p className="text-center text-muted-foreground py-6">
                          Nenhum alerta no momento
                        </p>
                      )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Out of Stock Tab */}
          <TabsContent value="out-of-stock">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PackageX className="w-5 h-5 text-destructive" />
                  Itens Sem Estoque
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.outOfStock.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Todos os itens estão em estoque
                  </p>
                ) : (
                  Object.entries(getItemsByCategory(stats.outOfStock)).map(
                    ([categoryName, items]) => (
                      <div key={categoryName} className="mb-6 last:mb-0">
                        <h3 className="font-semibold text-primary mb-3">
                          {categoryName}
                        </h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produto</TableHead>
                              <TableHead>Unidade</TableHead>
                              <TableHead>Est. Mínimo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                  {item.name}
                                </TableCell>
                                <TableCell>{item.unit}</TableCell>
                                <TableCell>{item.minimum_stock}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )
                  )
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Low Stock Tab */}
          <TabsContent value="low-stock">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-warning" />
                  Itens com Estoque Baixo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.lowStock.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum item com estoque baixo
                  </p>
                ) : (
                  Object.entries(getItemsByCategory(stats.lowStock)).map(
                    ([categoryName, items]) => (
                      <div key={categoryName} className="mb-6 last:mb-0">
                        <h3 className="font-semibold text-primary mb-3">
                          {categoryName}
                        </h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produto</TableHead>
                              <TableHead>Qtd. Atual</TableHead>
                              <TableHead>Est. Mínimo</TableHead>
                              <TableHead>Variação</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item) => {
                              const variation = getVariation(item.id);
                            
                              return (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">
                                    {item.name}
                                  </TableCell>
                            
                                  <TableCell className="text-warning font-semibold">
                                    {item.current_quantity} {item.unit}
                                  </TableCell>
                            
                                  <TableCell>
                                    {item.minimum_stock} {item.unit}
                                  </TableCell>
                            
                                  <TableCell>
                                    {variation ? (
                                      <StockVariationBadge
                                        previousQuantity={variation.previous_quantity}
                                        currentQuantity={variation.current_quantity}
                                      />
                                    ) : (
                                      <span className="text-muted-foreground text-sm">-</span>
                                    )}
                                  </TableCell>
                            
                                  <TableCell>
                                    <Badge className="bg-warning text-warning-foreground">
                                      Baixo
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}

                          </TableBody>
                        </Table>
                      </div>
                    )
                  )
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expiring Tab */}
          <TabsContent value="expiring">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-destructive" />
                  Itens Próximos do Vencimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.expiring.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum item próximo do vencimento
                  </p>
                ) : (
                  Object.entries(getItemsByCategory(stats.expiring)).map(
                    ([categoryName, items]) => (
                      <div key={categoryName} className="mb-6 last:mb-0">
                        <h3 className="font-semibold text-primary mb-3">
                          {categoryName}
                        </h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produto</TableHead>
                              <TableHead>Quantidade</TableHead>
                              <TableHead>Validade</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                  {item.name}
                                </TableCell>
                                <TableCell>
                                  {item.current_quantity} {item.unit}
                                </TableCell>
                                <TableCell>
                                  <ExpiryBadge
                                    expiryDate={item.expiry_date}
                                    alertDays={settings.expiry_alert_days}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )
                  )
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estoque por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-center">Qtd. Itens</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getCategoryStats.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell className="text-center">{cat.itemCount}</TableCell>
                        <TableCell className="text-right font-semibold">
                          R$ {cat.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-center">{stats.total}</TableCell>
                      <TableCell className="text-right">
                        R${' '}
                        {getCategoryStats
                          .reduce((sum, cat) => sum + cat.totalValue, 0)
                          .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DashboardOverview;
