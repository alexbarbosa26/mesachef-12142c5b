import { useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStockData } from '@/hooks/useStockData';
import { useSettings } from '@/hooks/useSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign,
  TrendingDown,
  Clock,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getExpiryStatus } from '@/components/ExpiryBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageLoader } from '@/components/ui/page-loader';

const StockValuation = () => {
  const { categories, stockItems, loading } = useStockData();
  const { settings } = useSettings();

  const valuations = useMemo(() => {
    // Total value
    const totalValue = stockItems.reduce((sum, item) => {
      return sum + (item.value || 0) * item.current_quantity;
    }, 0);

    // Value by status
    const lowStockThreshold = settings.low_stock_percentage || 20;
    
    let lowStockValue = 0;
    let expiringValue = 0;
    let expiredValue = 0;
    let healthyValue = 0;

    stockItems.forEach((item) => {
      const itemValue = (item.value || 0) * item.current_quantity;
      const { status } = getExpiryStatus(item.expiry_date, settings.expiry_alert_days);
      
      // Check expiry first
      if (status === 'expired') {
        expiredValue += itemValue;
        return;
      }
      
      if (status === 'expiring') {
        expiringValue += itemValue;
        return;
      }
      
      // Then check stock level
      const threshold = item.minimum_stock * (1 + lowStockThreshold / 100);
      if (item.current_quantity <= threshold && item.current_quantity > 0) {
        lowStockValue += itemValue;
        return;
      }
      
      healthyValue += itemValue;
    });

    // Value by category
    const byCategory = categories.map((category) => {
      const items = stockItems.filter((item) => item.category_id === category.id);
      const value = items.reduce((sum, item) => {
        return sum + (item.value || 0) * item.current_quantity;
      }, 0);
      const itemCount = items.length;
      const totalQuantity = items.reduce((sum, item) => sum + item.current_quantity, 0);
      
      return {
        id: category.id,
        name: category.name,
        value,
        itemCount,
        totalQuantity,
      };
    });

    return {
      total: totalValue,
      lowStock: lowStockValue,
      expiring: expiringValue,
      expired: expiredValue,
      healthy: healthyValue,
      byCategory,
    };
  }, [stockItems, categories, settings]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoader message="Carregando valoração..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Valoração de Estoque
          </h1>
          <p className="text-muted-foreground">
            Análise financeira do estoque atual
          </p>
        </div>

        {/* Main Value Card */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="flex items-center justify-center gap-6 p-8">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/20">
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">
                Valor Total do Estoque
              </p>
              <p className="text-4xl font-bold text-primary">
                {formatCurrency(valuations.total)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Status Value Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-success/10">
                  <Package className="w-5 h-5 text-success" />
                </div>
                <p className="text-sm text-muted-foreground">Estoque Saudável</p>
              </div>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(valuations.healthy)}
              </p>
            </CardContent>
          </Card>

          <Card className={cn(valuations.lowStock > 0 && 'border-yellow-500/50')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full',
                    valuations.lowStock > 0 ? 'bg-yellow-500/10' : 'bg-muted'
                  )}
                >
                  <TrendingDown
                    className={cn(
                      'w-5 h-5',
                      valuations.lowStock > 0
                        ? 'text-yellow-500'
                        : 'text-muted-foreground'
                    )}
                  />
                </div>
                <p className="text-sm text-muted-foreground">Estoque Baixo</p>
              </div>
              <p
                className={cn(
                  'text-2xl font-bold',
                  valuations.lowStock > 0 ? 'text-yellow-500' : 'text-foreground'
                )}
              >
                {formatCurrency(valuations.lowStock)}
              </p>
            </CardContent>
          </Card>

          <Card className={cn(valuations.expiring > 0 && 'border-orange-500/50')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full',
                    valuations.expiring > 0 ? 'bg-orange-500/10' : 'bg-muted'
                  )}
                >
                  <Clock
                    className={cn(
                      'w-5 h-5',
                      valuations.expiring > 0
                        ? 'text-orange-500'
                        : 'text-muted-foreground'
                    )}
                  />
                </div>
                <p className="text-sm text-muted-foreground">Próx. Vencimento</p>
              </div>
              <p
                className={cn(
                  'text-2xl font-bold',
                  valuations.expiring > 0 ? 'text-orange-500' : 'text-foreground'
                )}
              >
                {formatCurrency(valuations.expiring)}
              </p>
            </CardContent>
          </Card>

          <Card className={cn(valuations.expired > 0 && 'border-destructive/50')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full',
                    valuations.expired > 0 ? 'bg-destructive/10' : 'bg-muted'
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      'w-5 h-5',
                      valuations.expired > 0
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    )}
                  />
                </div>
                <p className="text-sm text-muted-foreground">Vencido</p>
              </div>
              <p
                className={cn(
                  'text-2xl font-bold',
                  valuations.expired > 0 ? 'text-destructive' : 'text-foreground'
                )}
              >
                {formatCurrency(valuations.expired)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Valor por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Qtd. Itens</TableHead>
                  <TableHead className="text-center">Qtd. Total</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">% do Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {valuations.byCategory.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-center">{cat.itemCount}</TableCell>
                    <TableCell className="text-center">
                      {cat.totalQuantity.toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(cat.value)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {valuations.total > 0
                        ? ((cat.value / valuations.total) * 100).toFixed(1)
                        : 0}
                      %
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">{stockItems.length}</TableCell>
                  <TableCell className="text-center">
                    {stockItems
                      .reduce((sum, item) => sum + item.current_quantity, 0)
                      .toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(valuations.total)}
                  </TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Summary Info */}
        <Card className="bg-muted/30">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Os valores são calculados multiplicando o valor unitário
              de cada item pela quantidade atual em estoque, independente da unidade de medida.
              O valor total representa a soma de todos os itens cadastrados com valor definido.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StockValuation;
