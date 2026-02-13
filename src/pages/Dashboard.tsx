import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useStockData } from '@/hooks/useStockData';
import { useSettings } from '@/hooks/useSettings';
import { PageLoader } from '@/components/ui/page-loader';
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
  AlertTriangle,
  Package,
  AlertCircle,
  Clock,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExpiryBadge, getExpiryStatus } from '@/components/ExpiryBadge';
import { Switch } from '@/components/ui/switch';

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
  const [editingCategoryDialogOpen, setEditingCategoryDialogOpen] = useState(false);
  const [editingItemDialogOpen, setEditingItemDialogOpen] = useState(false);
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
  const [lowStockPercentage, setLowStockPercentage] = useState(
    settings.low_stock_percentage?.toString() || '20'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

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
    setEditingCategoryDialogOpen(false);
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
    setEditingItemDialogOpen(false);
  };

  const handleUpdateSettings = async () => {
    await updateSetting('expiry_alert_days', expiryAlertDays);
    await updateSetting('low_stock_percentage', lowStockPercentage);
    setSettingsDialogOpen(false);
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    const { status } = getExpiryStatus(expiryDate, settings.expiry_alert_days);
    return status === 'expired' || status === 'expiring';
  };

  const isLowStock = (current: number, minimum: number) => {
    return current <= minimum;
  };

  // Filter items based on search and category
  const filteredStockItems = useMemo(() => {
    let items = stockItems;
    
    if (filterCategory !== 'all') {
      items = items.filter((item) => item.category_id === filterCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(query));
    }
    
    return items;
  }, [stockItems, filterCategory, searchQuery]);

  // Filter categories that have matching items
  const filteredCategories = useMemo(() => {
    if (filterCategory === 'all' && !searchQuery) {
      return categories;
    }
    
    const itemCategoryIds = new Set(filteredStockItems.map((item) => item.category_id));
    return categories.filter((cat) => itemCategoryIds.has(cat.id));
  }, [categories, filteredStockItems, filterCategory, searchQuery]);

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoader message="Carregando gestão de estoque..." />
      </DashboardLayout>
    );
  }

  // Calculate summary stats
  const totalItems = filteredStockItems.length;
  const lowStockItems = filteredStockItems.filter((item) =>
    isLowStock(item.current_quantity, item.minimum_stock)
  ).length;
  const expiringItems = filteredStockItems.filter((item) =>
    isExpiringSoon(item.expiry_date)
  ).length;

  // Get items by category for filtered items
  const getFilteredItemsByCategory = (categoryId: string) => {
    return filteredStockItems.filter((item) => item.category_id === categoryId);
  };

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
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Percentual para alerta de estoque baixo (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={lowStockPercentage}
                        onChange={(e) => setLowStockPercentage(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Itens com quantidade até este percentual acima do mínimo serão alertados (padrão: 20%)
                      </p>
                    </div>
                    <Button onClick={handleUpdateSettings} className="w-full">
                      Salvar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Itens</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={cn(lowStockItems > 0 && "border-warning/50")}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-full",
                lowStockItems > 0 ? "bg-warning/10" : "bg-muted"
              )}>
                <AlertCircle className={cn(
                  "w-6 h-6",
                  lowStockItems > 0 ? "text-warning" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                <p className={cn(
                  "text-2xl font-bold",
                  lowStockItems > 0 && "text-warning"
                )}>{lowStockItems}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={cn(expiringItems > 0 && "border-destructive/50")}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-full",
                expiringItems > 0 ? "bg-destructive/10" : "bg-muted"
              )}>
                <Clock className={cn(
                  "w-6 h-6",
                  expiringItems > 0 ? "text-destructive" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Próx. Validade</p>
                <p className={cn(
                  "text-2xl font-bold",
                  expiringItems > 0 && "text-destructive"
                )}>{expiringItems}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
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

        {/* No results state */}
        {filteredStockItems.length === 0 && categories.length > 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Nenhum item encontrado
              </h3>
              <p className="text-muted-foreground">
                Tente ajustar os filtros de busca.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Categories and items */}
        {filteredCategories.map((category) => {
          const items = getFilteredItemsByCategory(category.id);

          return (
            <Card key={category.id} className="overflow-hidden">
              <CardHeader className="category-header flex flex-row items-center justify-between py-3">
                <CardTitle className="text-lg font-bold uppercase tracking-wide text-primary-foreground">
                  {category.name}
                </CardTitle>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Dialog open={editingCategoryDialogOpen && editingCategory?.id === category.id} onOpenChange={setEditingCategoryDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                          onClick={() => {
                            setEditingCategory({
                              id: category.id,
                              name: category.name,
                            });
                            setEditingCategoryDialogOpen(true);
                          }}
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
                            <TableHead className="font-semibold w-16 text-center">
                              Ativo
                            </TableHead>
                          )}
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
                                expiringSoon && 'row-expiry-alert',
                                !item.is_active && 'opacity-50'
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
                                <div className="flex items-center gap-2">
                                  <span>
                                    {item.expiry_date
                                      ? format(
                                          parseISO(item.expiry_date),
                                          'dd/MM/yyyy',
                                          { locale: ptBR }
                                        )
                                      : '-'}
                                  </span>
                                  <ExpiryBadge
                                    expiryDate={item.expiry_date}
                                    alertDays={settings.expiry_alert_days}
                                    showIcon={true}
                                  />
                                </div>
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-center">
                                  <Switch
                                    checked={item.is_active}
                                    onCheckedChange={(checked) =>
                                      updateStockItem(item.id, { is_active: checked } as any)
                                    }
                                  />
                                </TableCell>
                              )}
                              {isAdmin && (
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Dialog open={editingItemDialogOpen && editingItem?.id === item.id} onOpenChange={setEditingItemDialogOpen}>
                                      <DialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => {
                                            setEditingItem({
                                              id: item.id,
                                              name: item.name,
                                              unit: item.unit,
                                              value: item.value?.toString() || '',
                                              minimum_stock:
                                                item.minimum_stock.toString(),
                                              category_id: item.category_id,
                                            });
                                            setEditingItemDialogOpen(true);
                                          }}
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