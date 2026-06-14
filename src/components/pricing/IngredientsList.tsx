import { useState, useMemo } from 'react';
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
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Package, FileText, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StockItem } from '@/hooks/useStockData';
import {
  IngredientUnit,
  INGREDIENT_UNIT_LABELS,
  INGREDIENT_UNIT_SHORT,
  calculateIngredientCost,
} from '@/hooks/useTechnicalSheetIngredients';
import { cn } from '@/lib/utils';

export interface SheetOption {
  id: string;
  name: string;
  cvu: number;
  yield_kg: number;
  yield_portions: number;
}

interface LocalIngredient {
  id: string;
  component_type: 'stock' | 'sheet';
  stock_item_id: string | null;
  linked_sheet_id: string | null;
  quantity: number;
  unit_type: IngredientUnit;
  calculated_cost: number;
}

export function calculateSheetComponentCost(
  sheet: SheetOption,
  quantity: number,
  unitType: IngredientUnit
): number {
  const cvu = Number(sheet.cvu) || 0;
  if (cvu <= 0 || quantity <= 0) return 0;
  if ((unitType === 'kg' || unitType === 'g') && sheet.yield_kg > 0) {
    const q = unitType === 'g' ? quantity / 1000 : quantity;
    return (cvu * q) / sheet.yield_kg;
  }
  if (unitType === 'porcao' && sheet.yield_portions > 0) {
    return (cvu * quantity) / sheet.yield_portions;
  }
  // unidade (ou fallback): trata a ficha inteira como 1 unidade
  return cvu * quantity;
}

interface IngredientsListProps {
  stockItems: StockItem[];
  availableSheets?: SheetOption[];
  ingredients: LocalIngredient[];
  onChange: (ingredients: LocalIngredient[]) => void;
  disabled?: boolean;
}

export function IngredientsList({
  stockItems,
  availableSheets = [],
  ingredients,
  onChange,
  disabled = false,
}: IngredientsListProps) {
  const [componentType, setComponentType] = useState<'stock' | 'sheet'>('stock');
  const [selectedStockId, setSelectedStockId] = useState<string>('');
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [stockOpen, setStockOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [sheetSearch, setSheetSearch] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [unitType, setUnitType] = useState<IngredientUnit>('g');

  // Mapa de stock items para acesso rápido
  const stockItemsMap = useMemo(() => {
    const map = new Map<string, StockItem>();
    stockItems.forEach(item => map.set(item.id, item));
    return map;
  }, [stockItems]);

  const sheetsMap = useMemo(() => {
    const map = new Map<string, SheetOption>();
    availableSheets.forEach(s => map.set(s.id, s));
    return map;
  }, [availableSheets]);

  // Itens disponíveis (não adicionados ainda)
  const availableItems = useMemo(() => {
    const addedIds = new Set(ingredients.filter(i => i.component_type === 'stock').map(i => i.stock_item_id));
    return stockItems.filter(item => !addedIds.has(item.id));
  }, [stockItems, ingredients]);

  const availableSheetOptions = useMemo(() => {
    const addedIds = new Set(ingredients.filter(i => i.component_type === 'sheet').map(i => i.linked_sheet_id));
    return availableSheets.filter(s => !addedIds.has(s.id));
  }, [availableSheets, ingredients]);

  // Filtros de busca
  const filteredItems = useMemo(() => {
    if (!stockSearch.trim()) return availableItems;
    const term = stockSearch.toLowerCase();
    return availableItems.filter(item => item.name.toLowerCase().includes(term));
  }, [availableItems, stockSearch]);

  const filteredSheets = useMemo(() => {
    if (!sheetSearch.trim()) return availableSheetOptions;
    const term = sheetSearch.toLowerCase();
    return availableSheetOptions.filter(s => s.name.toLowerCase().includes(term));
  }, [availableSheetOptions, sheetSearch]);

  // Custo total dos ingredientes (CMV calculado)
  const totalCMV = useMemo(() => {
    return ingredients.reduce((sum, ing) => sum + ing.calculated_cost, 0);
  }, [ingredients]);

  const handleAddIngredient = () => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) return;

    if (componentType === 'stock') {
      if (!selectedStockId) return;
      const stockItem = stockItemsMap.get(selectedStockId);
      if (!stockItem) return;
      const cost = calculateIngredientCost(stockItem, qty, unitType);
      onChange([
        ...ingredients,
        {
          id: `temp-${Date.now()}`,
          component_type: 'stock',
          stock_item_id: selectedStockId,
          linked_sheet_id: null,
          quantity: qty,
          unit_type: unitType,
          calculated_cost: cost,
        },
      ]);
    } else {
      if (!selectedSheetId) return;
      const sheet = sheetsMap.get(selectedSheetId);
      if (!sheet) return;
      const cost = calculateSheetComponentCost(sheet, qty, unitType);
      onChange([
        ...ingredients,
        {
          id: `temp-${Date.now()}`,
          component_type: 'sheet',
          stock_item_id: null,
          linked_sheet_id: selectedSheetId,
          quantity: qty,
          unit_type: unitType,
          calculated_cost: cost,
        },
      ]);
    }

    setSelectedStockId('');
    setSelectedSheetId('');
    setStockSearch('');
    setSheetSearch('');
    setQuantity('');
    setUnitType(componentType === 'sheet' ? 'kg' : 'g');
  };

  const handleRemoveIngredient = (id: string) => {
    onChange(ingredients.filter(i => i.id !== id));
  };

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    onChange(
      ingredients.map(ing => {
        if (ing.id === id) {
          let cost = 0;
          if (ing.component_type === 'stock' && ing.stock_item_id) {
            const stockItem = stockItemsMap.get(ing.stock_item_id);
            cost = stockItem ? calculateIngredientCost(stockItem, newQuantity, ing.unit_type) : 0;
          } else if (ing.component_type === 'sheet' && ing.linked_sheet_id) {
            const sh = sheetsMap.get(ing.linked_sheet_id);
            cost = sh ? calculateSheetComponentCost(sh, newQuantity, ing.unit_type) : 0;
          }
          return { ...ing, quantity: newQuantity, calculated_cost: cost };
        }
        return ing;
      })
    );
  };

  const handleUpdateUnit = (id: string, newUnit: IngredientUnit) => {
    onChange(
      ingredients.map(ing => {
        if (ing.id === id) {
          let cost = 0;
          if (ing.component_type === 'stock' && ing.stock_item_id) {
            const stockItem = stockItemsMap.get(ing.stock_item_id);
            cost = stockItem ? calculateIngredientCost(stockItem, ing.quantity, newUnit) : 0;
          } else if (ing.component_type === 'sheet' && ing.linked_sheet_id) {
            const sh = sheetsMap.get(ing.linked_sheet_id);
            cost = sh ? calculateSheetComponentCost(sh, ing.quantity, newUnit) : 0;
          }
          return { ...ing, unit_type: newUnit, calculated_cost: cost };
        }
        return ing;
      })
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const selectedStockItem = selectedStockId ? stockItemsMap.get(selectedStockId) : undefined;
  const selectedSheetItem = selectedSheetId ? sheetsMap.get(selectedSheetId) : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Ingredientes (Insumos e Fichas Técnicas)
        </CardTitle>
        <CardDescription>
          Adicione insumos do estoque ou outras fichas técnicas como componentes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulário para adicionar ingrediente */}
        {!disabled && (
          <div className="flex flex-wrap gap-3 items-end p-4 bg-muted/50 rounded-lg">
            <div className="w-40">
              <Label htmlFor="component-type">Tipo</Label>
              <Select
                value={componentType}
                onValueChange={(v) => {
                  setComponentType(v as 'stock' | 'sheet');
                  setSelectedStockId('');
                  setSelectedSheetId('');
                  setStockSearch('');
                  setSheetSearch('');
                  setUnitType(v === 'sheet' ? 'kg' : 'g');
                }}
              >
                <SelectTrigger id="component-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Insumo</SelectItem>
                  <SelectItem value="sheet">Ficha técnica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="ingredient-select">
                {componentType === 'stock' ? 'Insumo' : 'Ficha técnica'}
              </Label>
              {componentType === 'stock' ? (
                <Popover open={stockOpen} onOpenChange={setStockOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={stockOpen}
                      className="w-full justify-between"
                    >
                      {selectedStockItem
                        ? `${selectedStockItem.name} (${selectedStockItem.unit})`
                        : 'Selecione um insumo...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar insumo..."
                        value={stockSearch}
                        onValueChange={setStockSearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {availableItems.length === 0
                            ? 'Todos os insumos já foram adicionados'
                            : 'Nenhum insumo encontrado'}
                        </CommandEmpty>
                        {filteredItems.map(item => (
                          <CommandItem
                            key={item.id}
                            value={item.id}
                            onSelect={() => {
                              setSelectedStockId(item.id);
                              setStockOpen(false);
                              setStockSearch('');
                            }}
                            className={cn(
                              selectedStockId === item.id && 'bg-accent text-accent-foreground'
                            )}
                          >
                            <Package className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <span className="flex-1">{item.name}</span>
                            <span className="ml-2 text-muted-foreground text-xs">
                              {item.unit} — {formatCurrency(item.value || 0)}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <Popover open={sheetOpen} onOpenChange={setSheetOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={sheetOpen}
                      className="w-full justify-between"
                    >
                      {selectedSheetItem
                        ? selectedSheetItem.name
                        : 'Selecione uma ficha técnica...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar ficha técnica..."
                        value={sheetSearch}
                        onValueChange={setSheetSearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {availableSheetOptions.length === 0
                            ? 'Nenhuma ficha técnica disponível'
                            : 'Nenhuma ficha encontrada'}
                        </CommandEmpty>
                        {filteredSheets.map(s => {
                          const perKg = s.yield_kg > 0 ? s.cvu / s.yield_kg : 0;
                          return (
                            <CommandItem
                              key={s.id}
                              value={s.id}
                              onSelect={() => {
                                setSelectedSheetId(s.id);
                                setSheetOpen(false);
                                setSheetSearch('');
                              }}
                              className={cn(
                                selectedSheetId === s.id && 'bg-accent text-accent-foreground'
                              )}
                            >
                              <FileText className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                              <span className="flex-1">{s.name}</span>
                              {perKg > 0 && (
                                <span className="ml-2 text-muted-foreground text-xs">
                                  {formatCurrency(perKg)}/kg
                                </span>
                              )}
                            </CommandItem>
                          );
                        })}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div className="w-24">
              <Label htmlFor="ingredient-quantity">Quantidade</Label>
              <Input
                id="ingredient-quantity"
                type="number"
                step="0.001"
                min="0"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0.000"
              />
            </div>

            <div className="w-32">
              <Label htmlFor="ingredient-unit">Unidade</Label>
              <Select value={unitType} onValueChange={(v) => setUnitType(v as IngredientUnit)}>
                <SelectTrigger id="ingredient-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INGREDIENT_UNIT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              onClick={handleAddIngredient}
              disabled={
                (componentType === 'stock' ? !selectedStockId : !selectedSheetId) ||
                !quantity ||
                parseFloat(quantity) <= 0
              }
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
        )}

        {/* Lista de ingredientes */}
        {ingredients.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Tipo</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-32">Quantidade</TableHead>
                  <TableHead className="w-32">Unidade</TableHead>
                  <TableHead className="w-32 text-right">Custo</TableHead>
                  {!disabled && <TableHead className="w-16" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredients.map(ing => {
                  const isSheet = ing.component_type === 'sheet';
                  const stockItem = !isSheet && ing.stock_item_id ? stockItemsMap.get(ing.stock_item_id) : undefined;
                  const linkedSheet = isSheet && ing.linked_sheet_id ? sheetsMap.get(ing.linked_sheet_id) : undefined;
                  const perKg = linkedSheet && linkedSheet.yield_kg > 0 ? linkedSheet.cvu / linkedSheet.yield_kg : 0;
                  return (
                    <TableRow key={ing.id}>
                      <TableCell>
                        <Badge variant={isSheet ? 'default' : 'secondary'} className="gap-1">
                          {isSheet ? <FileText className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                          {isSheet ? 'Ficha' : 'Insumo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">
                            {isSheet
                              ? linkedSheet?.name || 'Ficha não encontrada'
                              : stockItem?.name || 'Item não encontrado'}
                          </span>
                          {!isSheet && stockItem && (
                            <span className="text-sm text-muted-foreground ml-2">
                              ({formatCurrency(stockItem.value || 0)}/{stockItem.unit})
                            </span>
                          )}
                          {isSheet && linkedSheet && perKg > 0 && (
                            <span className="text-sm text-muted-foreground ml-2">
                              ({formatCurrency(perKg)}/kg)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {disabled ? (
                          <span>{ing.quantity}</span>
                        ) : (
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            value={ing.quantity}
                            onChange={e => handleUpdateQuantity(ing.id, parseFloat(e.target.value) || 0)}
                            className="w-24"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {disabled ? (
                          <span>{INGREDIENT_UNIT_SHORT[ing.unit_type]}</span>
                        ) : (
                          <Select
                            value={ing.unit_type}
                            onValueChange={(v) => handleUpdateUnit(ing.id, v as IngredientUnit)}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(INGREDIENT_UNIT_SHORT).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(ing.calculated_cost)}
                      </TableCell>
                      {!disabled && (
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveIngredient(ing.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Nenhum ingrediente adicionado</p>
            <p className="text-sm">Adicione insumos do estoque para calcular o CMV automaticamente</p>
          </div>
        )}

        {/* Resumo do CMV */}
        {ingredients.length > 0 && (
          <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
            <span className="font-medium">CMV Total (Custo dos Ingredientes)</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(totalCMV)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
