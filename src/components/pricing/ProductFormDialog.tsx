import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import {
  PricingProduct,
  ProductCategory,
  SaleUnit,
  UNIT_LABELS,
  useCreatePricingProduct,
  useUpdatePricingProduct,
} from '@/hooks/usePricingData';
import { useProductCategories } from '@/hooks/useProductCategories';
import { CategoriesManagerDialog } from './CategoriesManagerDialog';
import { Settings2 } from 'lucide-react';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: PricingProduct | null;
}

const UNITS = Object.entries(UNIT_LABELS) as [SaleUnit, string][];

// Mapeia o nome da categoria personalizada para o enum legado (back-compat)
function nameToEnum(name: string | undefined): ProductCategory {
  const n = (name ?? '').trim().toLowerCase();
  if (n === 'café' || n === 'cafe') return 'cafe';
  if (n === 'doce') return 'doce';
  if (n === 'bolo') return 'bolo';
  if (n === 'combo') return 'combo';
  if (n === 'salgado') return 'salgado';
  if (n === 'bebida') return 'bebida';
  return 'outro';
}

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [saleUnit, setSaleUnit] = useState<SaleUnit>('unidade');
  const [isActive, setIsActive] = useState(true);
  const [showCatManager, setShowCatManager] = useState(false);

  const { data: categories = [] } = useProductCategories({ activeOnly: true });
  const createProduct = useCreatePricingProduct();
  const updateProduct = useUpdatePricingProduct();

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategoryId(product.category_id ?? '');
      setSaleUnit(product.sale_unit);
      setIsActive(product.is_active);
    } else {
      setName('');
      setCategoryId('');
      setSaleUnit('unidade');
      setIsActive(true);
    }
  }, [product, open]);

  // Pré-seleciona a primeira categoria disponível ao criar
  useEffect(() => {
    if (!product && !categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, product, categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (name.trim().length < 2 || !categoryId) return;

    const selected = categories.find((c) => c.id === categoryId);

    const data = {
      name: name.trim(),
      category: nameToEnum(selected?.name),
      category_id: categoryId,
      sale_unit: saleUnit,
      is_active: isActive,
    };

    if (product) {
      await updateProduct.mutateAsync({ id: product.id, ...data });
    } else {
      await createProduct.mutateAsync(data);
    }

    onOpenChange(false);
  };

  const isLoading = createProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Produto *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Cappuccino Grande"
              required
              minLength={2}
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="category">Categoria</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-1 text-xs"
                  onClick={() => setShowCatManager(true)}
                >
                  <Settings2 className="w-3 h-3 mr-1" />
                  Gerenciar
                </Button>
              </div>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
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
              <Label htmlFor="unit">Unidade de Venda</Label>
              <Select value={saleUnit} onValueChange={(v) => setSaleUnit(v as SaleUnit)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Produto Ativo</Label>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || name.trim().length < 2 || !categoryId}>
              {isLoading ? 'Salvando...' : product ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <CategoriesManagerDialog open={showCatManager} onOpenChange={setShowCatManager} />
    </Dialog>
  );
}
