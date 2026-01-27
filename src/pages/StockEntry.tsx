import { useState, useMemo, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useStockData } from '@/hooks/useStockData';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Save, X, Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { ExpiryBadge, getExpiryStatus } from '@/components/ExpiryBadge';
import { StockStatusBadge } from '@/components/StockStatusBadge';

interface EditedItem {
  id: string;
  current_quantity: number;
  expiry_date: string | null;
}

const StockEntry = () => {
  const { user } = useAuth();
  const {
    categories,
    stockItems,
    loading,
    bulkUpdateStock,
    getItemsByCategory,
    refetch,
  } = useStockData();
  const { settings } = useSettings();
  const { toast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editedItems, setEditedItems] = useState<Map<string, EditedItem>>(
    new Map()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [saveSummary, setSaveSummary] = useState<{
    updated: number;
    lowStock: number;
    expiring: number;
  } | null>(null);

  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const filteredItems = useMemo(() => {
    let items = stockItems;

    if (selectedCategory !== 'all') {
      items = items.filter((item) => item.category_id === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(query));
    }

    return items;
  }, [stockItems, selectedCategory, searchQuery]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof filteredItems> = {};
    
    filteredItems.forEach((item) => {
      if (!groups[item.category_id]) {
        groups[item.category_id] = [];
      }
      groups[item.category_id].push(item);
    });

    return groups;
  }, [filteredItems]);

  const handleQuantityChange = (id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const item = stockItems.find((i) => i.id === id);
    if (!item) return;

    setEditedItems((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(id);
      newMap.set(id, {
        id,
        current_quantity: numValue,
        expiry_date: existing?.expiry_date ?? item.expiry_date,
      });
      return newMap;
    });
  };

  const handleExpiryChange = (id: string, value: string) => {
    const item = stockItems.find((i) => i.id === id);
    if (!item) return;

    setEditedItems((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(id);
      newMap.set(id, {
        id,
        current_quantity: existing?.current_quantity ?? item.current_quantity,
        expiry_date: value || null,
      });
      return newMap;
    });
  };

  const handleSave = async () => {
    if (editedItems.size === 0) {
      toast({
        title: 'Nada para salvar',
        description: 'Nenhuma alteração foi feita.',
      });
      return;
    }

    setIsSaving(true);

    const updates = Array.from(editedItems.values()).map((edit) => ({
      id: edit.id,
      current_quantity: edit.current_quantity,
      expiry_date: edit.expiry_date,
      count_date: format(new Date(), 'yyyy-MM-dd'),
      responsible_user: user?.id || '',
    }));

    const success = await bulkUpdateStock(updates);

    if (success) {
      // Calculate summary
      let lowStock = 0;
      let expiring = 0;

      updates.forEach((update) => {
        const item = stockItems.find((i) => i.id === update.id);
        if (item) {
          if (update.current_quantity < item.minimum_stock) {
            lowStock++;
          }
          if (
            update.expiry_date &&
            differenceInDays(parseISO(update.expiry_date), new Date()) <=
              settings.expiry_alert_days
          ) {
            expiring++;
          }
        }
      });

      setSaveSummary({
        updated: updates.length,
        lowStock,
        expiring,
      });
      setShowSummary(true);
      setEditedItems(new Map());
      await refetch();
    }

    setIsSaving(false);
  };

  const handleDiscard = () => {
    setEditedItems(new Map());
    toast({
      title: 'Alterações descartadas',
      description: 'Todas as alterações foram descartadas.',
    });
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    const { status } = getExpiryStatus(expiryDate, settings.expiry_alert_days);
    return status === 'expired' || status === 'expiring';
  };

  const isLowStock = (itemId: string) => {
    const item = stockItems.find((i) => i.id === itemId);
    if (!item) return false;

    const edited = editedItems.get(itemId);
    const currentQty = edited?.current_quantity ?? item.current_quantity;
    return currentQty < item.minimum_stock;
  };

  const getDisplayValue = (itemId: string, field: 'quantity' | 'expiry') => {
    const item = stockItems.find((i) => i.id === itemId);
    if (!item) return '';

    const edited = editedItems.get(itemId);

    if (field === 'quantity') {
      return (edited?.current_quantity ?? item.current_quantity).toString();
    } else {
      return edited?.expiry_date ?? item.expiry_date ?? '';
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    itemId: string,
    field: 'quantity' | 'expiry'
  ) => {
    if (e.key === 'Tab' || e.key === 'Enter') {
      // Let default behavior handle it
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background pb-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Preenchimento de Estoque
              </h1>
              <p className="text-muted-foreground">
                Atualize quantidades e validades rapidamente
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDiscard}
                disabled={editedItems.size === 0 || isSaving}
              >
                <X className="w-4 h-4 mr-2" />
                Descartar
              </Button>
              <Button
                onClick={handleSave}
                disabled={editedItems.size === 0 || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar ({editedItems.size})
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Tables by category */}
        {Object.entries(groupedItems).map(([categoryId, items]) => {
          const category = categories.find((c) => c.id === categoryId);
          if (!category) return null;

          return (
            <Card key={categoryId} className="overflow-hidden">
              <CardHeader className="category-header py-3">
                <CardTitle className="text-lg font-bold uppercase tracking-wide text-primary-foreground">
                  {category.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-table-header">
                        <TableHead className="font-semibold min-w-[200px]">
                          Produto
                        </TableHead>
                        <TableHead className="font-semibold w-28">
                          Status
                        </TableHead>
                        <TableHead className="font-semibold w-24">
                          Unidade
                        </TableHead>
                        <TableHead className="font-semibold w-28">
                          Est. Mínimo
                        </TableHead>
                        <TableHead className="font-semibold w-32">
                          Qtd. Atual
                        </TableHead>
                        <TableHead className="font-semibold w-36">
                          Contagem
                        </TableHead>
                        <TableHead className="font-semibold w-40">
                          Validade
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => {
                        const expiringSoon = isExpiringSoon(
                          getDisplayValue(item.id, 'expiry')
                        );
                        const lowStock = isLowStock(item.id);
                        const isEdited = editedItems.has(item.id);

                        return (
                          <TableRow
                            key={item.id}
                            className={cn(
                              index % 2 === 1 && 'bg-table-row-alt',
                              expiringSoon && 'row-expiry-alert',
                              isEdited && 'ring-1 ring-primary/30'
                            )}
                          >
                            <TableCell className="font-medium">
                              {item.name}
                            </TableCell>
                            <TableCell>
                              <StockStatusBadge
                                currentQuantity={parseFloat(getDisplayValue(item.id, 'quantity')) || 0}
                              />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.unit}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.minimum_stock}
                            </TableCell>
                            <TableCell
                              className={cn(
                                'editable-cell',
                                lowStock && 'cell-low-stock'
                              )}
                            >
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={getDisplayValue(item.id, 'quantity')}
                                onChange={(e) =>
                                  handleQuantityChange(item.id, e.target.value)
                                }
                                onKeyDown={(e) =>
                                  handleKeyDown(e, item.id, 'quantity')
                                }
                                className="h-8 w-24"
                              />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}
                            </TableCell>
                            <TableCell className="editable-cell">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="date"
                                  value={getDisplayValue(item.id, 'expiry')}
                                  onChange={(e) =>
                                    handleExpiryChange(item.id, e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    handleKeyDown(e, item.id, 'expiry')
                                  }
                                  className="h-8 w-36"
                                />
                                <ExpiryBadge
                                  expiryDate={getDisplayValue(item.id, 'expiry') || null}
                                  alertDays={settings.expiry_alert_days}
                                  showIcon={true}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredItems.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Nenhum item encontrado
              </h3>
              <p className="text-muted-foreground">
                {stockItems.length === 0
                  ? 'Nenhum item cadastrado ainda. Peça ao administrador para adicionar itens.'
                  : 'Tente ajustar os filtros de busca.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Summary Dialog */}
        <Dialog open={showSummary} onOpenChange={setShowSummary}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-success" />
                Alterações Salvas
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="text-center p-6 bg-success-bg rounded-lg">
                <p className="text-2xl font-bold text-success">
                  {saveSummary?.updated}
                </p>
                <p className="text-sm text-muted-foreground">
                  itens atualizados
                </p>
              </div>

              {(saveSummary?.lowStock || 0) > 0 && (
                <div className="flex items-center gap-3 p-4 bg-warning-bg rounded-lg">
                  <AlertCircle className="w-5 h-5 text-warning" />
                  <div>
                    <p className="font-medium">
                      {saveSummary?.lowStock} itens abaixo do estoque mínimo
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Considere reabastecer em breve
                    </p>
                  </div>
                </div>
              )}

              {(saveSummary?.expiring || 0) > 0 && (
                <div className="flex items-center gap-3 p-4 bg-[hsl(var(--expiry-alert))] rounded-lg">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <div>
                    <p className="font-medium">
                      {saveSummary?.expiring} itens próximos do vencimento
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Verifique a validade desses itens
                    </p>
                  </div>
                </div>
              )}

              <Button onClick={() => setShowSummary(false)} className="w-full">
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default StockEntry;