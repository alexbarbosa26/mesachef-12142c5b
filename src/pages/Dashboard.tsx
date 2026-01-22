import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useStockData } from '@/hooks/useStockData';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  Plus,
  Trash2,
  Edit,
  Settings,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const UNITS = ['kg', 'g', 'L', 'ml', 'unidades', 'caixas', 'pacotes'];

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const {
    categories,
    stockItems,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    addStockItem,
    updateStockItem,
    deleteStockItem,
    getItemsByCategory,
  } = useStockData();
  const { settings, updateSetting } = useSettings();

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editingItem, setEditingItem] = useState<{
    id: string;
    name: string;
    unit: string;
    value: string;
    minimum_stock: string;
    category_id: string;
  } | null>(null);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItem, setNewItem] = useState({
    name: '',
    unit: 'kg',
    value: '',
    minimum_stock: '0',
    category_id: '',
  });
  const [expiryAlertDays, setExpiryAlertDays] = useState(
    settings.expiry_alert_days.toString()
  );

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    await addCategory(newCategoryName.trim());
    setNewCategoryName('');
    setCategoryDialogOpen(false);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) return;
    await updateCategory(editingCategory.id, editingCategory.name.trim());
    setEditingCategory(null);
  };

  const handleAddItem = async () => {
    if (!newItem.name.trim() || !newItem.category_id) return;
    await addStockItem({
      name: newItem.name.trim(),
      unit: newItem.unit,
      value: newItem.value ? parseFloat(newItem.value) : null,
      minimum_stock: parseFloat(newItem.minimum_stock) || 0,
      category_id: newItem.category_id,
      current_quantity: 0,
    });
    setNewItem({
      name: '',
      unit: 'kg',
      value: '',
      minimum_stock: '0',
      category_id: '',
    });
    setItemDialogOpen(false);
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editingItem.name.trim()) return;
    await updateStockItem(editingItem.id, {
      name: editingItem.name.trim(),
      unit: editingItem.unit,
      value: editingItem.value ? parseFloat(editingItem.value) : null,
      minimum_stock: parseFloat(editingItem.minimum_stock) || 0,
      category_id: editingItem.category_id,
    });
    setEditingItem(null);
  };

  const handleUpdateExpiryAlert = async () => {
    await updateSetting('expiry_alert_days', expiryAlertDays);
    setSettingsDialogOpen(false);
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const days = differenceInDays(parseISO(expiryDate), new Date());
    return days <= settings.expiry_alert_days && days >= 0;
  };

  const isLowStock = (current: number, minimum: number) => {
    return current < minimum;
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Gestão de Estoque
            </h1>
            <p className="text-muted-foreground">
              {isAdmin
                ? 'Gerencie categorias e itens do estoque'
                : 'Visualize o estoque atual'}
            </p>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <Dialog
                open={categoryDialogOpen}
                onOpenChange={setCategoryDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Categoria
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Categoria</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="category-name">Nome da Categoria</Label>
                      <Input
                        id="category-name"
                        placeholder="Ex: Proteínas"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleAddCategory} className="w-full">
                      Adicionar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select
                        value={newItem.category_id}
                        onValueChange={(v) =>
                          setNewItem({ ...newItem, category_id: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nome do Item</Label>
                      <Input
                        placeholder="Ex: Carne de Sol"
                        value={newItem.name}
                        onChange={(e) =>
                          setNewItem({ ...newItem, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Unidade</Label>
                        <Select
                          value={newItem.unit}
                          onValueChange={(v) =>
                            setNewItem({ ...newItem, unit: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNITS.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Valor (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={newItem.value}
                          onChange={(e) =>
                            setNewItem({ ...newItem, value: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Estoque Mínimo</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newItem.minimum_stock}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            minimum_stock: e.target.value,
                          })
                        }
                      />
                    </div>
                    <Button onClick={handleAddItem} className="w-full">
                      Adicionar Item
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog
                open={settingsDialogOpen}
                onOpenChange={setSettingsDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configurações de Alerta</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Dias para alerta de validade</Label>
                      <Input
                        type="number"
                        min="1"
                        value={expiryAlertDays}
                        onChange={(e) => setExpiryAlertDays(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Itens com validade dentro deste período serão destacados
                        em vermelho
                      </p>
                    </div>
                    <Button onClick={handleUpdateExpiryAlert} className="w-full">
                      Salvar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Empty state */}
        {categories.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Nenhuma categoria cadastrada
              </h3>
              <p className="text-muted-foreground mb-4">
                {isAdmin
                  ? 'Comece adicionando uma categoria para organizar seu estoque.'
                  : 'Aguarde o administrador cadastrar as categorias.'}
              </p>
              {isAdmin && (
                <Button onClick={() => setCategoryDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Categoria
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Categories and items */}
        {categories.map((category) => {
          const items = getItemsByCategory(category.id);

          return (
            <Card key={category.id} className="overflow-hidden">
              <CardHeader className="category-header flex flex-row items-center justify-between py-3">
                <CardTitle className="text-lg font-bold uppercase tracking-wide text-primary-foreground">
                  {category.name}
                </CardTitle>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                          onClick={() =>
                            setEditingCategory({
                              id: category.id,
                              name: category.name,
                            })
                          }
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Categoria</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>Nome da Categoria</Label>
                            <Input
                              value={editingCategory?.name || ''}
                              onChange={(e) =>
                                setEditingCategory((prev) =>
                                  prev
                                    ? { ...prev, name: e.target.value }
                                    : null
                                )
                              }
                            />
                          </div>
                          <Button
                            onClick={handleUpdateCategory}
                            className="w-full"
                          >
                            Salvar
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary-foreground/70 hover:text-destructive hover:bg-primary-foreground/10"
                      onClick={() => deleteCategory(category.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {items.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Nenhum item nesta categoria
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-table-header">
                          <TableHead className="font-semibold">
                            Produto
                          </TableHead>
                          <TableHead className="font-semibold">
                            Unidade
                          </TableHead>
                          <TableHead className="font-semibold">
                            Valor
                          </TableHead>
                          <TableHead className="font-semibold">
                            Est. Mínimo
                          </TableHead>
                          <TableHead className="font-semibold">
                            Qtd. Atual
                          </TableHead>
                          <TableHead className="font-semibold">
                            Contagem
                          </TableHead>
                          <TableHead className="font-semibold">
                            Validade
                          </TableHead>
                          {isAdmin && (
                            <TableHead className="font-semibold w-20">
                              Ações
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => {
                          const expiringSoon = isExpiringSoon(item.expiry_date);
                          const lowStock = isLowStock(
                            item.current_quantity,
                            item.minimum_stock
                          );

                          return (
                            <TableRow
                              key={item.id}
                              className={cn(
                                index % 2 === 1 && 'bg-table-row-alt',
                                expiringSoon && 'row-expiry-alert'
                              )}
                            >
                              <TableCell className="font-medium">
                                {item.name}
                              </TableCell>
                              <TableCell>{item.unit}</TableCell>
                              <TableCell>
                                {item.value
                                  ? `R$ ${item.value.toFixed(2)}`
                                  : '-'}
                              </TableCell>
                              <TableCell>{item.minimum_stock}</TableCell>
                              <TableCell
                                className={cn(lowStock && 'cell-low-stock')}
                              >
                                {item.current_quantity}
                              </TableCell>
                              <TableCell>
                                {item.count_date
                                  ? format(
                                      parseISO(item.count_date),
                                      'dd/MM/yyyy',
                                      { locale: ptBR }
                                    )
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                {item.expiry_date
                                  ? format(
                                      parseISO(item.expiry_date),
                                      'dd/MM/yyyy',
                                      { locale: ptBR }
                                    )
                                  : '-'}
                              </TableCell>
                              {isAdmin && (
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() =>
                                            setEditingItem({
                                              id: item.id,
                                              name: item.name,
                                              unit: item.unit,
                                              value: item.value?.toString() || '',
                                              minimum_stock:
                                                item.minimum_stock.toString(),
                                              category_id: item.category_id,
                                            })
                                          }
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Editar Item</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 pt-4">
                                          <div className="space-y-2">
                                            <Label>Categoria</Label>
                                            <Select
                                              value={
                                                editingItem?.category_id || ''
                                              }
                                              onValueChange={(v) =>
                                                setEditingItem((prev) =>
                                                  prev
                                                    ? { ...prev, category_id: v }
                                                    : null
                                                )
                                              }
                                            >
                                              <SelectTrigger>
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {categories.map((cat) => (
                                                  <SelectItem
                                                    key={cat.id}
                                                    value={cat.id}
                                                  >
                                                    {cat.name}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className="space-y-2">
                                            <Label>Nome</Label>
                                            <Input
                                              value={editingItem?.name || ''}
                                              onChange={(e) =>
                                                setEditingItem((prev) =>
                                                  prev
                                                    ? {
                                                        ...prev,
                                                        name: e.target.value,
                                                      }
                                                    : null
                                                )
                                              }
                                            />
                                          </div>
                                          <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                              <Label>Unidade</Label>
                                              <Select
                                                value={editingItem?.unit || 'kg'}
                                                onValueChange={(v) =>
                                                  setEditingItem((prev) =>
                                                    prev
                                                      ? { ...prev, unit: v }
                                                      : null
                                                  )
                                                }
                                              >
                                                <SelectTrigger>
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {UNITS.map((unit) => (
                                                    <SelectItem
                                                      key={unit}
                                                      value={unit}
                                                    >
                                                      {unit}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="space-y-2">
                                              <Label>Valor (R$)</Label>
                                              <Input
                                                type="number"
                                                step="0.01"
                                                value={editingItem?.value || ''}
                                                onChange={(e) =>
                                                  setEditingItem((prev) =>
                                                    prev
                                                      ? {
                                                          ...prev,
                                                          value: e.target.value,
                                                        }
                                                      : null
                                                  )
                                                }
                                              />
                                            </div>
                                          </div>
                                          <div className="space-y-2">
                                            <Label>Estoque Mínimo</Label>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              value={
                                                editingItem?.minimum_stock || ''
                                              }
                                              onChange={(e) =>
                                                setEditingItem((prev) =>
                                                  prev
                                                    ? {
                                                        ...prev,
                                                        minimum_stock:
                                                          e.target.value,
                                                      }
                                                    : null
                                                )
                                              }
                                            />
                                          </div>
                                          <Button
                                            onClick={handleUpdateItem}
                                            className="w-full"
                                          >
                                            Salvar
                                          </Button>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:text-destructive"
                                      onClick={() => deleteStockItem(item.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;