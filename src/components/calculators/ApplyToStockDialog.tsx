import { useMemo, useState } from 'react';
import { useStockData, StockItem } from '@/hooks/useStockData';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronsUpDown, Package, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  costPerKgToItemUnitValue,
  formatBRL,
} from './calculatorMath';
import { cn } from '@/lib/utils';

interface ApplyToStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costPerKg: number;
  suggestedName?: string;
  onApplied: (action: 'updated_item' | 'created_item', linkedItemId: string) => void;
}

export function ApplyToStockDialog({
  open,
  onOpenChange,
  costPerKg,
  suggestedName = '',
  onApplied,
}: ApplyToStockDialogProps) {
  const { stockItems, categories, addStockItem, updateStockItem } = useStockData();
  const { toast } = useToast();
  const [tab, setTab] = useState<'update' | 'create'>('update');

  // Update existing
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create new
  const [newName, setNewName] = useState(suggestedName);
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newUnit, setNewUnit] = useState<'kg' | 'g' | 'l' | 'ml' | 'unidade'>('kg');

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    const active = stockItems.filter((i) => i.is_active);
    if (!term) return active;
    return active.filter((i) => i.name.toLowerCase().includes(term));
  }, [stockItems, search]);

  const selectedItem: StockItem | undefined = stockItems.find((i) => i.id === selectedId);
  const newValueForItem =
    selectedItem ? costPerKgToItemUnitValue(costPerKg, selectedItem.unit) : null;
  const newValueForCreated = costPerKgToItemUnitValue(costPerKg, newUnit);

  const resetAndClose = () => {
    setSelectedId('');
    setSearch('');
    setNewName(suggestedName);
    setNewCategoryId('');
    setNewUnit('kg');
    onOpenChange(false);
  };

  const handleUpdate = async () => {
    if (!selectedItem || newValueForItem === null) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('stock_items')
      .update({ value: newValueForItem })
      .eq('id', selectedItem.id)
      .select();
    setSaving(false);
    if (error || !data || data.length === 0) {
      toast({
        title: 'Não foi possível atualizar',
        description:
          error?.message ??
          'Sem permissão para alterar o custo deste insumo. Apenas administradores podem.',
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Custo atualizado', description: `${selectedItem.name} atualizado.` });
    onApplied('updated_item', selectedItem.id);
    resetAndClose();
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newCategoryId || newValueForCreated === null) return;
    setSaving(true);
    const created = await addStockItem({
      name: newName.trim(),
      category_id: newCategoryId,
      unit: newUnit,
      value: newValueForCreated,
      current_quantity: 0,
      minimum_stock: 0,
      is_active: true,
    });
    setSaving(false);
    if (!created) return;
    onApplied('created_item', created.id);
    resetAndClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? resetAndClose() : onOpenChange(o))}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Aplicar custo no estoque</DialogTitle>
          <DialogDescription>
            Custo calculado: <strong>{formatBRL(costPerKg)}/Kg</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="update">Atualizar existente</TabsTrigger>
            <TabsTrigger value="create">Criar insumo derivado</TabsTrigger>
          </TabsList>

          <TabsContent value="update" className="space-y-4 pt-4">
            <div>
              <Label>Insumo do estoque</Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between mt-1"
                  >
                    {selectedItem
                      ? `${selectedItem.name} (${selectedItem.unit})`
                      : 'Selecione um insumo...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                >
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar insumo..."
                      value={search}
                      onValueChange={setSearch}
                    />
                    <CommandList>
                      <CommandEmpty>Nenhum insumo encontrado</CommandEmpty>
                      {filteredItems.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.id}
                          onSelect={() => {
                            setSelectedId(item.id);
                            setPickerOpen(false);
                            setSearch('');
                          }}
                          className={cn(
                            selectedId === item.id && 'bg-accent text-accent-foreground'
                          )}
                        >
                          <Package className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                          <span className="flex-1">{item.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {item.unit} · {formatBRL(item.value || 0)}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedItem && (
              <div className="rounded-lg border p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo atual:</span>
                  <span>{formatBRL(selectedItem.value || 0)} / {selectedItem.unit}</span>
                </div>
                {newValueForItem !== null ? (
                  <div className="flex justify-between font-semibold">
                    <span className="text-muted-foreground">Novo custo:</span>
                    <span className="text-primary">
                      {formatBRL(newValueForItem, newValueForItem < 1 ? 5 : 2)} /{' '}
                      {selectedItem.unit}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-destructive text-xs">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    A unidade "{selectedItem.unit}" não pode ser convertida automaticamente
                    a partir de Kg. Use Kg, g, l ou ml.
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4 pt-4">
            <div>
              <Label htmlFor="new-name">Nome do novo insumo</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex.: Salmão limpo, Frango cozido..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unidade</Label>
                <Select value={newUnit} onValueChange={(v) => setNewUnit(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="l">L</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="unidade">unidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border p-3 text-sm flex justify-between">
              <span className="text-muted-foreground">Custo do novo insumo:</span>
              {newValueForCreated !== null ? (
                <span className="font-semibold text-primary">
                  {formatBRL(newValueForCreated, newValueForCreated < 1 ? 5 : 2)} / {newUnit}
                </span>
              ) : (
                <span className="text-destructive text-xs">
                  Unidade "{newUnit}" não converte de Kg
                </span>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={resetAndClose} disabled={saving}>
            Cancelar
          </Button>
          {tab === 'update' ? (
            <Button
              onClick={handleUpdate}
              disabled={saving || !selectedItem || newValueForItem === null}
            >
              {saving ? 'Atualizando...' : 'Confirmar atualização'}
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={
                saving ||
                !newName.trim() ||
                !newCategoryId ||
                newValueForCreated === null
              }
            >
              {saving ? 'Criando...' : 'Criar insumo'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}