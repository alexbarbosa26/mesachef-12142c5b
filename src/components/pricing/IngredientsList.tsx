import { useState, useEffect, useMemo } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Package } from 'lucide-react';
import { StockItem } from '@/hooks/useStockData';
import {
  IngredientUnit,
  INGREDIENT_UNIT_LABELS,
  INGREDIENT_UNIT_SHORT,
  calculateIngredientCost,
} from '@/hooks/useTechnicalSheetIngredients';

interface LocalIngredient {
  id: string;
  stock_item_id: string;
  quantity: number;
  unit_type: IngredientUnit;
  calculated_cost: number;
}

interface IngredientsListProps {
  stockItems: StockItem[];
  ingredients: LocalIngredient[];
  onChange: (ingredients: LocalIngredient[]) => void;
  disabled?: boolean;
}

export function IngredientsList({
  stockItems,
  ingredients,
  onChange,
  disabled = false,
}: IngredientsListProps) {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [unitType, setUnitType] = useState<IngredientUnit>('g');

  // Mapa de stock items para acesso rápido
  const stockItemsMap = useMemo(() => {
    const map = new Map<string, StockItem>();
    stockItems.forEach(item => map.set(item.id, item));
    return map;
  }, [stockItems]);

  // Itens disponíveis (não adicionados ainda)
  const availableItems = useMemo(() => {
    const addedIds = new Set(ingredients.map(i => i.stock_item_id));
    return stockItems.filter(item => !addedIds.has(item.id));
  }, [stockItems, ingredients]);

  // Custo total dos ingredientes (CMV calculado)
  const totalCMV = useMemo(() => {
    return ingredients.reduce((sum, ing) => sum + ing.calculated_cost, 0);
  }, [ingredients]);

  const handleAddIngredient = () => {
    if (!selectedItemId || !quantity || parseFloat(quantity) <= 0) return;

    const stockItem = stockItemsMap.get(selectedItemId);
    if (!stockItem) return;

    const qty = parseFloat(quantity);
    const cost = calculateIngredientCost(stockItem, qty, unitType);

    const newIngredient: LocalIngredient = {
      id: `temp-${Date.now()}`,
      stock_item_id: selectedItemId,
      quantity: qty,
      unit_type: unitType,
      calculated_cost: cost,
    };

    onChange([...ingredients, newIngredient]);
    
    // Reset form
    setSelectedItemId('');
    setQuantity('');
    setUnitType('g');
  };

  const handleRemoveIngredient = (id: string) => {
    onChange(ingredients.filter(i => i.id !== id));
  };

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    onChange(
      ingredients.map(ing => {
        if (ing.id === id) {
          const stockItem = stockItemsMap.get(ing.stock_item_id);
          const cost = stockItem ? calculateIngredientCost(stockItem, newQuantity, ing.unit_type) : 0;
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
          const stockItem = stockItemsMap.get(ing.stock_item_id);
          const cost = stockItem ? calculateIngredientCost(stockItem, ing.quantity, newUnit) : 0;
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Ingredientes (Insumos do Estoque)
        </CardTitle>
        <CardDescription>
          Adicione os ingredientes para calcular o CMV automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulário para adicionar ingrediente */}
        {!disabled && (
          <div className="flex flex-wrap gap-3 items-end p-4 bg-muted/50 rounded-lg">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="ingredient-select">Ingrediente</Label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger id="ingredient-select">
                  <SelectValue placeholder="Selecione um insumo" />
                </SelectTrigger>
                <SelectContent>
                  {availableItems.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      Todos os insumos já foram adicionados
                    </SelectItem>
                  ) : (
                    availableItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.unit}) - {formatCurrency(item.value || 0)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="w-24">
              <Label htmlFor="ingredient-quantity">Quantidade</Label>
              <Input
                id="ingredient-quantity"
                type="number"
                step="0.01"
                min="0"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0"
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
              disabled={!selectedItemId || !quantity || parseFloat(quantity) <= 0}
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
                  <TableHead>Ingrediente</TableHead>
                  <TableHead className="w-32">Quantidade</TableHead>
                  <TableHead className="w-32">Unidade</TableHead>
                  <TableHead className="w-32 text-right">Custo</TableHead>
                  {!disabled && <TableHead className="w-16" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ingredients.map(ing => {
                  const stockItem = stockItemsMap.get(ing.stock_item_id);
                  return (
                    <TableRow key={ing.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{stockItem?.name || 'Item não encontrado'}</span>
                          {stockItem && (
                            <span className="text-sm text-muted-foreground ml-2">
                              ({formatCurrency(stockItem.value || 0)}/{stockItem.unit})
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
                            step="0.01"
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
