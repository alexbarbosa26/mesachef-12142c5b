import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  usePricingProducts,
  useTechnicalSheets,
  usePricingConfigGlobal,
  usePricingConfigProducts,
  useDeletePricingProduct,
  calculatePricing,
  PricingProduct,
  CATEGORY_LABELS,
  UNIT_LABELS,
} from '@/hooks/usePricingData';
import { useAuth } from '@/contexts/AuthContext';
import { ProductFormDialog } from '@/components/pricing/ProductFormDialog';
import { PricingStatusBadge } from '@/components/pricing/PricingStatusBadge';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  Settings,
  Package,
  DollarSign,
  Lock,
} from 'lucide-react';

export default function PricingProducts() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PricingProduct | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<PricingProduct | null>(null);

  const { data: products = [], isLoading: loadingProducts } = usePricingProducts();
  const { data: sheets = [] } = useTechnicalSheets();
  const { data: globalConfig } = usePricingConfigGlobal();
  const { data: productConfigs = [] } = usePricingConfigProducts();
  const deleteMutation = useDeletePricingProduct();

  // Combinar dados com cálculos
  const enrichedProducts = useMemo(() => {
    return products.map((product) => {
      const sheet = sheets.find((s) => s.product_id === product.id);
      const productConfig = productConfigs.find((c) => c.product_id === product.id);
      const calculated = globalConfig ? calculatePricing(sheet, globalConfig, productConfig) : undefined;

      return {
        ...product,
        technical_sheet: sheet,
        config: productConfig,
        calculated,
      };
    });
  }, [products, sheets, globalConfig, productConfigs]);

  // Filtrar produtos
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return enrichedProducts;
    const term = search.toLowerCase();
    return enrichedProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        CATEGORY_LABELS[p.category].toLowerCase().includes(term)
    );
  }, [enrichedProducts, search]);

  const handleEdit = (product: PricingProduct) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteProduct) {
      await deleteMutation.mutateAsync(deleteProduct.id);
      setDeleteProduct(null);
    }
  };

  const handleOpenSheet = (productId: string) => {
    navigate(`/pricing/sheet/${productId}`);
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Precificação de Produtos</h1>
            <p className="text-muted-foreground">
              Gerencie produtos e calcule preços com metodologia SEBRAE
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <Button variant="outline" onClick={() => navigate('/pricing/config')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Configuração
                </Button>
                <Button onClick={() => { setEditingProduct(null); setFormOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Produto
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Lista de Produtos ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingProducts ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {search ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    {isAdmin && (
                      <>
                        <TableHead className="text-right">Preço Sugerido</TableHead>
                        <TableHead className="text-right">Preço Venda</TableHead>
                        <TableHead className="text-center">Viabilidade</TableHead>
                      </>
                    )}
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{CATEGORY_LABELS[product.category]}</Badge>
                      </TableCell>
                      <TableCell>{UNIT_LABELS[product.sale_unit]}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={product.is_active ? 'default' : 'outline'}>
                          {product.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <>
                          <TableCell className="text-right font-medium">
                            {product.calculated ? (
                              <span className="flex items-center justify-end gap-1">
                                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                                {formatCurrency(product.calculated.pv)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">Sem ficha</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {product.calculated && product.calculated.sale_price > 0 ? (
                              <span className="flex items-center justify-end gap-1">
                                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                                {formatCurrency(product.calculated.sale_price)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {product.calculated ? (
                              <PricingStatusBadge status={product.calculated.status} />
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <FileText className="w-3 h-3" />
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        {isAdmin ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenSheet(product.id)}>
                                <FileText className="w-4 h-4 mr-2" />
                                Ficha Técnica
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(product)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteProduct(product)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Info for non-admins */}
        {!isAdmin && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-4">
              <p className="text-sm text-amber-700 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Acesso restrito: somente Administrador pode gerenciar fichas técnicas e precificação.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Product Form Dialog */}
      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteProduct?.name}"? Esta ação também removerá a
              ficha técnica associada e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
