import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStockPurchases } from '@/hooks/useStockPurchases';
import { useStockData } from '@/hooks/useStockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2, ShoppingCart, Package } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageLoader } from '@/components/ui/page-loader';
import { formatCurrency } from '@/utils/cmvCalculations';
import { useAuth } from '@/contexts/AuthContext';

const StockPurchases = () => {
  const { purchases, loading, addPurchase, deletePurchase } = useStockPurchases();
  const { stockItems, categories } = useStockData();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [formData, setFormData] = useState({
    stock_item_id: '',
    quantity: '',
    unit_cost: '',
    supplier_name: '',
    purchase_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const activeItems = stockItems.filter((i) => i.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.stock_item_id || !formData.quantity || !formData.unit_cost) return;

    await addPurchase({
      stock_item_id: formData.stock_item_id,
      quantity: parseFloat(formData.quantity),
      unit_cost: parseFloat(formData.unit_cost),
      supplier_name: formData.supplier_name || null,
      purchase_date: formData.purchase_date,
      notes: formData.notes || null,
      created_by: user?.id || null,
    });

    setFormData({
      stock_item_id: '',
      quantity: '',
      unit_cost: '',
      supplier_name: '',
      purchase_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
    setDialogOpen(false);
  };

  const selectedItem = activeItems.find((i) => i.id === formData.stock_item_id);
  const totalCostPreview =
    parseFloat(formData.quantity || '0') * parseFloat(formData.unit_cost || '0');

  const filteredPurchases = filterCategory === 'all'
    ? purchases
    : purchases.filter((p) => {
        const item = stockItems.find((i) => i.id === p.stock_item_id);
        return item?.category_id === filterCategory;
      });

  const totalValue = filteredPurchases.reduce((sum, p) => sum + p.total_cost, 0);

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoader message="Carregando compras..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Registro de Compras</h1>
            <p className="text-muted-foreground">
              Controle de entradas de mercadorias e custos
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Compra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Registrar Compra</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Item de Estoque *</Label>
                  <Select
                    value={formData.stock_item_id}
                    onValueChange={(v) =>
                      setFormData({ ...formData, stock_item_id: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o item" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} ({item.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantidade *{selectedItem ? ` (${selectedItem.unit})` : ''}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: e.target.value })
                      }
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <Label>Custo Unitário (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.unit_cost}
                      onChange={(e) =>
                        setFormData({ ...formData, unit_cost: e.target.value })
                      }
                      placeholder="0,00"
                    />
                  </div>
                </div>

                {totalCostPreview > 0 && (
                  <div className="p-3 bg-accent rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Custo Total</p>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(totalCostPreview)}
                    </p>
                  </div>
                )}

                <div>
                  <Label>Fornecedor</Label>
                  <Input
                    value={formData.supplier_name}
                    onChange={(e) =>
                      setFormData({ ...formData, supplier_name: e.target.value })
                    }
                    placeholder="Nome do fornecedor"
                  />
                </div>

                <div>
                  <Label>Data da Compra</Label>
                  <Input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) =>
                      setFormData({ ...formData, purchase_date: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Observações</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Observações (opcional)"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={!formData.stock_item_id || !formData.quantity || !formData.unit_cost}>
                  Registrar Compra
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Compras</p>
                  <p className="text-2xl font-bold text-foreground">{filteredPurchases.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Package className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
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
                  <p className="text-sm text-muted-foreground">Itens Distintos</p>
                  <p className="text-2xl font-bold text-foreground">
                    {new Set(filteredPurchases.map((p) => p.stock_item_id)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por categoria" />
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
            </div>
          </CardContent>
        </Card>

        {/* Purchases Table */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Compras</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPurchases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma compra registrada
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Custo Unit.</TableHead>
                      <TableHead>Custo Total</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPurchases.map((purchase) => {
                      const item = stockItems.find(
                        (i) => i.id === purchase.stock_item_id
                      );
                      return (
                        <TableRow key={purchase.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(purchase.purchase_date), 'dd/MM/yyyy', {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item?.name || 'Item removido'}
                          </TableCell>
                          <TableCell>
                            {purchase.quantity} {item?.unit || ''}
                          </TableCell>
                          <TableCell>{formatCurrency(purchase.unit_cost)}</TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(purchase.total_cost)}
                          </TableCell>
                          <TableCell>{purchase.supplier_name || '-'}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deletePurchase(purchase.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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

export default StockPurchases;