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
  CATEGORY_LABELS,
  UNIT_LABELS,
  useCreatePricingProduct,
  useUpdatePricingProduct,
} from '@/hooks/usePricingData';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: PricingProduct | null;
}

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [ProductCategory, string][];
const UNITS = Object.entries(UNIT_LABELS) as [SaleUnit, string][];

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('outro');
  const [saleUnit, setSaleUnit] = useState<SaleUnit>('unidade');
  const [isActive, setIsActive] = useState(true);

  const createProduct = useCreatePricingProduct();
  const updateProduct = useUpdatePricingProduct();

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategory(product.category);
      setSaleUnit(product.sale_unit);
      setIsActive(product.is_active);
    } else {
      setName('');
      setCategory('outro');
      setSaleUnit('unidade');
      setIsActive(true);
    }
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (name.trim().length < 2) return;

    const data = {
      name: name.trim(),
      category,
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
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ProductCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
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
            <Button type="submit" disabled={isLoading || name.trim().length < 2}>
              {isLoading ? 'Salvando...' : product ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
