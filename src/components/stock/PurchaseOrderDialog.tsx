import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Plus, Trash2, Check, ChevronsUpDown, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/cmvCalculations';
import {
  PURCHASE_UNITS,
  BASE_UNITS,
  packageCostToBaseCost,
  toBaseQuantity,
} from '@/utils/unitConversion';
import { useStockData } from '@/hooks/useStockData';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useStockPurchaseOrders, PurchaseOrderItemInput } from '@/hooks/useStockPurchaseOrders';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Row = PurchaseOrderItemInput & { _key: string; _itemPickerOpen?: boolean };

const newRow = (): Row => ({
  _key: Math.random().toString(36).slice(2),
  stock_item_id: null,
  item_name: '',
  purchased_quantity: 1,
  purchase_unit: 'pacote',
  package_size: 1,
  base_unit: 'g',
  package_unit_cost: 0,
  notes: '',
});

const PurchaseOrderDialog = ({ open, onOpenChange }: Props) => {
  const { stockItems } = useStockData();
  const { suppliers, addSupplier } = useSuppliers();
  const { createOrder } = useStockPurchaseOrders();

  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [saving, setSaving] = useState(false);
  const [quickSupplierOpen, setQuickSupplierOpen] = useState(false);
  const [quickSupplierName, setQuickSupplierName] = useState('');

  const activeItems = useMemo(() => stockItems.filter((i) => i.is_active), [stockItems]);
  const activeSuppliers = suppliers.filter((s) => s.is_active);

  const reset = () => {
    setSupplierId('');
    setPurchaseDate(format(new Date(), 'yyyy-MM-dd'));
    setInvoiceNumber('');
    setNotes('');
    setRows([newRow()]);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const updateRow = (key: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key: string) => {
    setRows((prev) => (prev.length === 1 ? [newRow()] : prev.filter((r) => r._key !== key)));
  };

  const linkToStockItem = (key: string, itemId: string) => {
    const item = activeItems.find((i) => i.id === itemId);
    if (!item) return;
    updateRow(key, {
      stock_item_id: item.id,
      item_name: item.name,
      base_unit: (item as any).base_unit || item.unit || 'un',
      purchase_unit: (item as any).count_unit || item.unit || 'pacote',
      package_size: Number((item as any).package_size) || 1,
      _itemPickerOpen: false,
    });
  };

  const handleQuickAddSupplier = async () => {
    if (!quickSupplierName.trim()) return;
    const created = await addSupplier({ name: quickSupplierName, is_active: true });
    if (created) {
      setSupplierId(created.id);
      setQuickSupplierName('');
      setQuickSupplierOpen(false);
    }
  };

  const total = rows.reduce(
    (sum, r) => sum + (r.purchased_quantity || 0) * (r.package_unit_cost || 0),
    0,
  );

  const handleSubmit = async () => {
    if (!supplierId) return;
    const supplier = suppliers.find((s) => s.id === supplierId);
    setSaving(true);
    const id = await createOrder(
      {
        supplier_id: supplierId,
        supplier_name: supplier?.name || null,
        purchase_date: purchaseDate,
        invoice_number: invoiceNumber || null,
        notes: notes || null,
      },
      rows.map(({ _key, _itemPickerOpen, ...rest }) => rest),
    );
    setSaving(false);
    if (id) {
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Compra por Fornecedor</DialogTitle>
          <DialogDescription>
            Registre uma compra única com vários itens. O sistema calcula o custo por
            unidade base (kg, g, ml, etc.) automaticamente.
          </DialogDescription>
        </DialogHeader>

        {/* Cabeçalho */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center justify-between">
              <Label className="mb-1.5">Fornecedor *</Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => setQuickSupplierOpen((v) => !v)}
              >
                {quickSupplierOpen ? 'Cancelar' : '+ Novo'}
              </Button>
            </div>
            {quickSupplierOpen ? (
              <div className="flex gap-2">
                <Input
                  value={quickSupplierName}
                  onChange={(e) => setQuickSupplierName(e.target.value)}
                  placeholder="Nome do fornecedor"
                  autoFocus
                />
                <Button type="button" onClick={handleQuickAddSupplier}>
                  OK
                </Button>
              </div>
            ) : (
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {activeSuppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <Label className="mb-1.5">Data da Compra *</Label>
            <Input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-1.5">Nº Nota / Cupom</Label>
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>

        <div>
          <Label className="mb-1.5">Observações</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        {/* Itens */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
            <div className="text-sm font-semibold">Itens da Compra</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              Custo por unidade base é calculado automaticamente
            </div>
          </div>

          <div className="divide-y">
            {rows.map((row) => {
              const baseQty = toBaseQuantity(row.purchased_quantity, row.package_size);
              const totalItem = row.purchased_quantity * row.package_unit_cost;
              const baseCost = packageCostToBaseCost(row.package_unit_cost, row.package_size);
              return (
                <div key={row._key} className="p-3 space-y-2 hover:bg-muted/20">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end">
                    {/* Insumo */}
                    <div className="lg:col-span-3">
                      <Label className="text-xs mb-1">Insumo</Label>
                      <Popover
                        open={row._itemPickerOpen}
                        onOpenChange={(v) => updateRow(row._key, { _itemPickerOpen: v })}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'w-full justify-between font-normal h-9',
                              !row.item_name && 'text-muted-foreground',
                            )}
                          >
                            <span className="truncate">
                              {row.item_name || 'Selecionar...'}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput placeholder="Buscar insumo..." />
                            <CommandList>
                              <CommandEmpty>
                                Nenhum item. Use o campo livre abaixo.
                              </CommandEmpty>
                              <CommandGroup>
                                {activeItems
                                  .slice(0, 200)
                                  .map((item) => (
                                    <CommandItem
                                      key={item.id}
                                      value={item.name}
                                      onSelect={() => linkToStockItem(row._key, item.id)}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          row.stock_item_id === item.id
                                            ? 'opacity-100'
                                            : 'opacity-0',
                                        )}
                                      />
                                      {item.name}
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Input
                        className="mt-1 h-8 text-xs"
                        placeholder="ou digite um novo nome"
                        value={row.item_name}
                        onChange={(e) =>
                          updateRow(row._key, {
                            item_name: e.target.value,
                            stock_item_id: null,
                          })
                        }
                      />
                    </div>

                    {/* Quantidade comprada */}
                    <div className="lg:col-span-1">
                      <Label className="text-xs mb-1">Qtd</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={row.purchased_quantity}
                        onChange={(e) =>
                          updateRow(row._key, {
                            purchased_quantity: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    {/* Unidade de compra */}
                    <div className="lg:col-span-2">
                      <Label className="text-xs mb-1">Unid. de compra</Label>
                      <Select
                        value={row.purchase_unit}
                        onValueChange={(v) => updateRow(row._key, { purchase_unit: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PURCHASE_UNITS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tamanho por embalagem */}
                    <div className="lg:col-span-2">
                      <Label className="text-xs mb-1">Conteúdo por embalagem</Label>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.001"
                          value={row.package_size}
                          onChange={(e) =>
                            updateRow(row._key, {
                              package_size: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                        <Select
                          value={row.base_unit}
                          onValueChange={(v) => updateRow(row._key, { base_unit: v })}
                        >
                          <SelectTrigger className="h-9 w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BASE_UNITS.map((u) => (
                              <SelectItem key={u} value={u}>
                                {u}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Valor por embalagem */}
                    <div className="lg:col-span-2">
                      <Label className="text-xs mb-1">Valor por embalagem (R$)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={row.package_unit_cost}
                        onChange={(e) =>
                          updateRow(row._key, {
                            package_unit_cost: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    {/* Total + remover */}
                    <div className="lg:col-span-2 flex items-end justify-between gap-2">
                      <div>
                        <Label className="text-xs mb-1">Total</Label>
                        <div className="h-9 px-3 flex items-center bg-muted/40 rounded text-sm font-semibold whitespace-nowrap">
                          {formatCurrency(totalItem)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => removeRow(row._key)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Resumo da conversão */}
                  {row.purchased_quantity > 0 && row.package_size > 0 && (
                    <div className="text-xs text-muted-foreground pl-1">
                      = {baseQty.toLocaleString('pt-BR')} {row.base_unit} •{' '}
                      <span className="font-medium text-foreground">
                        {formatCurrency(baseCost)}/{row.base_unit}
                      </span>
                      {row.base_unit === 'g' && (
                        <>
                          {' '}• {formatCurrency(baseCost * 1000)}/kg
                        </>
                      )}
                      {row.base_unit === 'ml' && (
                        <>
                          {' '}• {formatCurrency(baseCost * 1000)}/L
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 border-t flex items-center justify-between bg-muted/30">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((p) => [...p, newRow()])}
            >
              <Plus className="w-4 h-4 mr-1" /> Adicionar item
            </Button>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total da compra</div>
              <div className="text-xl font-bold">{formatCurrency(total)}</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !supplierId || total <= 0}>
            {saving ? 'Salvando...' : 'Registrar Compra'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseOrderDialog;