import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  TechnicalSheet,
  PricingConfigGlobal,
  PricingConfigProduct,
  PricingBasis,
  useUpsertTechnicalSheet,
  useTechnicalSheets,
  usePricingProducts,
  calculatePricing,
} from '@/hooks/usePricingData';
import { useStockData } from '@/hooks/useStockData';
import {
  useTechnicalSheetIngredients,
  useSaveIngredients,
  IngredientUnit,
  calculateIngredientCost,
} from '@/hooks/useTechnicalSheetIngredients';
import { PricingResultCards } from './PricingResultCards';
import { IngredientsList, SheetOption, calculateSheetComponentCost } from './IngredientsList';
import { ProductConfigSection } from './ProductConfigSection';
import { FileText, Calculator } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface LocalIngredient {
  id: string;
  component_type: 'stock' | 'sheet';
  stock_item_id: string | null;
  linked_sheet_id: string | null;
  quantity: number;
  unit_type: IngredientUnit;
  calculated_cost: number;
}

interface TechnicalSheetFormProps {
  productId: string;
  productName: string;
  sheet?: TechnicalSheet;
  globalConfig: PricingConfigGlobal;
  productConfig?: PricingConfigProduct;
  onClose?: () => void;
}

export function TechnicalSheetForm({
  productId,
  productName,
  sheet,
  globalConfig,
  productConfig,
  onClose,
}: TechnicalSheetFormProps) {
  const [useIngredients, setUseIngredients] = useState(false);
  const [manualCmv, setManualCmv] = useState('0');
  const [laborCostPerHour, setLaborCostPerHour] = useState('0');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState('0');
  const [packagingCost, setPackagingCost] = useState('0');
  const [notes, setNotes] = useState('');
  const [salePrice, setSalePrice] = useState('0');
  const [yieldKg, setYieldKg] = useState('0');
  const [yieldPortions, setYieldPortions] = useState('0');
  const [pricingBasis, setPricingBasis] = useState<PricingBasis>('unit');
  const [ingredients, setIngredients] = useState<LocalIngredient[]>([]);

  const { stockItems } = useStockData();
  const { data: existingIngredients } = useTechnicalSheetIngredients(sheet?.id);
  const { data: allSheets = [] } = useTechnicalSheets();
  const { data: pricingProducts = [] } = usePricingProducts();
  const upsertSheet = useUpsertTechnicalSheet();
  const saveIngredients = useSaveIngredients();

  // Outras fichas técnicas disponíveis como componentes (exclui a atual)
  const availableSheets: SheetOption[] = useMemo(() => {
    return allSheets
      .filter((s) => s.id !== sheet?.id && s.product_id !== productId)
      .map((s) => {
        const labor = (Number(s.labor_cost_per_hour) || 0) * (Number(s.prep_time_minutes) || 0) / 60;
        const cvu = Number(s.cmv || 0) + labor + Number(s.packaging_cost || 0);
        const prod = pricingProducts.find((p) => p.id === s.product_id);
        return {
          id: s.id,
          name: prod?.name || 'Ficha sem nome',
          cvu,
          yield_kg: Number(s.yield_kg) || 0,
          yield_portions: Number(s.yield_portions) || 0,
        };
      });
  }, [allSheets, pricingProducts, sheet?.id, productId]);

  const sheetsMap = useMemo(() => {
    const m = new Map<string, SheetOption>();
    availableSheets.forEach((s) => m.set(s.id, s));
    return m;
  }, [availableSheets]);

  // Carrega dados existentes da ficha
  useEffect(() => {
    if (sheet) {
      setManualCmv(sheet.cmv.toString());
      setLaborCostPerHour(sheet.labor_cost_per_hour.toString());
      setPrepTimeMinutes(sheet.prep_time_minutes.toString());
      setPackagingCost(sheet.packaging_cost.toString());
      setYieldKg(sheet.yield_kg.toString());
      setYieldPortions(sheet.yield_portions.toString());
      setSalePrice(sheet.sale_price?.toString() || '0');
      setPricingBasis(sheet.pricing_basis ?? 'unit');
      setNotes(sheet.notes || '');
    } else {
      setManualCmv('0');
      setLaborCostPerHour('0');
      setPrepTimeMinutes('0');
      setPackagingCost('0');
      setYieldKg('0');
      setYieldPortions('0');
      setSalePrice('0');
      setPricingBasis('unit');
      setNotes('');
    }
  }, [sheet]);

  // Carrega ingredientes existentes
  useEffect(() => {
    // Espera a query carregar (undefined = ainda carregando ou ficha nova sem id)
    if (!sheet?.id || existingIngredients === undefined) return;

    if (existingIngredients.length > 0) {
      setUseIngredients(true);
      const itemMap = new Map(stockItems.map((s) => [s.id, s]));
      setIngredients(
        existingIngredients.map((ing) => {
          const qty = Number(ing.quantity);
          const unit = ing.unit_type as IngredientUnit;
          const isSheet = ing.component_type === 'sheet' || (!!ing.linked_sheet_id && !ing.stock_item_id);
          let liveCost = Number(ing.calculated_cost) || 0;
          if (isSheet && ing.linked_sheet_id) {
            const sh = sheetsMap.get(ing.linked_sheet_id);
            if (sh) liveCost = calculateSheetComponentCost(sh, qty, unit);
          } else if (ing.stock_item_id) {
            const stockItem = itemMap.get(ing.stock_item_id);
            if (stockItem) liveCost = calculateIngredientCost(stockItem, qty, unit);
          }
          return {
            id: ing.id,
            component_type: isSheet ? 'sheet' : 'stock',
            stock_item_id: ing.stock_item_id,
            linked_sheet_id: ing.linked_sheet_id,
            quantity: qty,
            unit_type: unit,
            calculated_cost: liveCost,
          };
        })
      );
    } else {
      // Ficha sem ingredientes: sincroniza estado local
      setUseIngredients(false);
      setIngredients([]);
    }
  }, [existingIngredients, stockItems, sheetsMap, sheet?.id]);

  // Calcula CMV baseado nos ingredientes ou valor manual
  const calculatedCmv = useMemo(() => {
    if (useIngredients && ingredients.length > 0) {
      return ingredients.reduce((sum, ing) => sum + ing.calculated_cost, 0);
    }
    return parseFloat(manualCmv) || 0;
  }, [useIngredients, ingredients, manualCmv]);

  // Cálculo em tempo real da ficha técnica
  const liveSheet: TechnicalSheet = useMemo(() => {
    const laborNum = parseFloat(laborCostPerHour) || 0;
    const prepNum = parseInt(prepTimeMinutes) || 0;
    const packNum = parseFloat(packagingCost) || 0;
    const yieldKgNum = parseFloat(yieldKg) || 0;
    const yieldPortionsNum = parseFloat(yieldPortions) || 0;
    const salePriceNum = parseFloat(salePrice) || 0;

    return {
      id: sheet?.id || '',
      product_id: productId,
      cmv: calculatedCmv,
      labor_cost_per_hour: laborNum,
      prep_time_minutes: prepNum,
      packaging_cost: packNum,
      yield_kg: yieldKgNum,
      yield_portions: yieldPortionsNum,
      sale_price: salePriceNum,
      pricing_basis: pricingBasis,
      notes: notes,
      created_by: null,
      created_at: '',
      updated_at: '',
    };
  }, [calculatedCmv, laborCostPerHour, prepTimeMinutes, packagingCost, yieldKg, yieldPortions, salePrice, pricingBasis, notes, productId, sheet?.id]);

  const pricing = useMemo(() => {
    return calculatePricing(liveSheet, globalConfig, productConfig);
  }, [liveSheet, globalConfig, productConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Salva a ficha técnica
      const savedSheet = await upsertSheet.mutateAsync({
        product_id: productId,
        cmv: calculatedCmv,
        labor_cost_per_hour: parseFloat(laborCostPerHour) || 0,
        prep_time_minutes: parseInt(prepTimeMinutes) || 0,
        packaging_cost: parseFloat(packagingCost) || 0,
        yield_kg: parseFloat(yieldKg) || 0,
        yield_portions: parseFloat(yieldPortions) || 0,
        sale_price: parseFloat(salePrice) || 0,
        pricing_basis: pricingBasis,
        notes: notes || null,
      });

      // Se usar ingredientes, salva os ingredientes também
      if (savedSheet) {
        // Se o toggle está ligado salva os ingredientes; se está desligado limpa qualquer
        // ingrediente anterior para evitar que reapareçam ao reabrir a ficha.
        await saveIngredients.mutateAsync({
          technicalSheetId: savedSheet.id,
          ingredients: useIngredients
            ? ingredients.map(ing => ({
                component_type: ing.component_type,
                stock_item_id: ing.stock_item_id,
                linked_sheet_id: ing.linked_sheet_id,
                quantity: ing.quantity,
                unit_type: ing.unit_type,
                calculated_cost: ing.calculated_cost,
              }))
            : [],
        });
      }

      toast({ title: 'Ficha técnica salva com sucesso!' });
      onClose?.();
    } catch (error) {
      console.error('Error saving technical sheet:', error);
    }
  };

  const formatCurrencyInput = (value: string) => {
    return value.replace(/[^\d.]/g, '');
  };

  return (
    <div className="space-y-6">
      {/* Toggle para usar ingredientes */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="use-ingredients" className="text-base font-medium">
                Calcular CMV a partir dos insumos do estoque
              </Label>
              <p className="text-sm text-muted-foreground">
                Vincule ingredientes cadastrados no estoque para calcular o custo automaticamente
              </p>
            </div>
            <Switch
              id="use-ingredients"
              checked={useIngredients}
              onCheckedChange={setUseIngredients}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de ingredientes (se ativado) */}
      {useIngredients && (
        <IngredientsList
          stockItems={stockItems}
          availableSheets={availableSheets}
          ingredients={ingredients}
          onChange={setIngredients}
        />
      )}

      {/* Configuração individual de percentuais */}
      <ProductConfigSection
        productId={productId}
        productName={productName}
        globalConfig={globalConfig}
        productConfig={productConfig}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Formulário de Custos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Ficha Técnica
            </CardTitle>
            <CardDescription>{productName}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* CMV Manual (só aparece se não usar ingredientes) */}
              {!useIngredients && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="cmv">CMV - Custo dos Ingredientes (R$)</Label>
                    <Input
                      id="cmv"
                      type="number"
                      step="0.01"
                      min="0"
                      value={manualCmv}
                      onChange={(e) => setManualCmv(formatCurrencyInput(e.target.value))}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Soma do custo de todos os ingredientes para produzir 1 unidade
                    </p>
                  </div>
                  <Separator />
                </>
              )}

              {/* CMV Calculado (se usar ingredientes) */}
              {useIngredients && (
                <>
                  <div className="p-4 bg-muted rounded-lg">
                    <Label className="text-sm text-muted-foreground">CMV Calculado</Label>
                    <p className="text-2xl font-bold text-primary">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculatedCmv)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Baseado em {ingredients.length} ingrediente{ingredients.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Separator />
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="laborCost">Custo Mão de Obra/Hora (R$)</Label>
                  <Input
                    id="laborCost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={laborCostPerHour}
                    onChange={(e) => setLaborCostPerHour(formatCurrencyInput(e.target.value))}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prepTime">Tempo de Preparo (min)</Label>
                  <Input
                    id="prepTime"
                    type="number"
                    step="1"
                    min="0"
                    value={prepTimeMinutes}
                    onChange={(e) => setPrepTimeMinutes(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Custo MO unitário = (Custo/hora × Tempo) / 60
              </p>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="packaging">Custo Embalagem (R$)</Label>
                <Input
                  id="packaging"
                  type="number"
                  step="0.01"
                  min="0"
                  value={packagingCost}
                  onChange={(e) => setPackagingCost(formatCurrencyInput(e.target.value))}
                  placeholder="0.00"
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yieldKg">Rendimento (KG)</Label>
                  <Input
                    id="yieldKg"
                    type="number"
                    step="0.001"
                    min="0"
                    value={yieldKg}
                    onChange={(e) => setYieldKg(formatCurrencyInput(e.target.value))}
                    placeholder="0.000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yieldPortions">Rendimento (Porções)</Label>
                  <Input
                    id="yieldPortions"
                    type="number"
                    step="1"
                    min="0"
                    value={yieldPortions}
                    onChange={(e) => setYieldPortions(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Informe o rendimento da receita para calcular custo e preço por KG e por porção
              </p>

              <Separator />

              <div className="space-y-2">
                <Label>Base do Preço Praticado</Label>
                <RadioGroup
                  value={pricingBasis}
                  onValueChange={(v) => setPricingBasis(v as PricingBasis)}
                  className="grid grid-cols-3 gap-2"
                >
                  <label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer">
                    <RadioGroupItem value="unit" id="basis-unit" />
                    <span className="text-sm">Por Unidade</span>
                  </label>
                  <label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer">
                    <RadioGroupItem value="kg" id="basis-kg" />
                    <span className="text-sm">Por Kg</span>
                  </label>
                  <label className="flex items-center gap-2 border rounded-md p-2 cursor-pointer">
                    <RadioGroupItem value="portion" id="basis-portion" />
                    <span className="text-sm">Por Porção</span>
                  </label>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  Escolha a base de comparação: por unidade, por kg ou por porção.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="salePrice">
                  Preço de Venda Praticado (R$){pricingBasis === 'kg' ? ' / Kg' : pricingBasis === 'portion' ? ' / Porção' : ''}
                </Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(formatCurrencyInput(e.target.value))}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Informe o preço real cobrado na base selecionada. Será comparado com o preço sugerido correspondente.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anotações sobre a produção..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                {onClose && (
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                )}
                <Button 
                  type="submit" 
                  disabled={upsertSheet.isPending || saveIngredients.isPending} 
                  className="flex-1"
                >
                  {upsertSheet.isPending || saveIngredients.isPending ? 'Salvando...' : 'Salvar Ficha Técnica'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Resultados Calculados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Cálculo de Preço (SEBRAE)
            </CardTitle>
            <CardDescription>
              Atualiza automaticamente conforme você digita
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PricingResultCards pricing={pricing} showDetailed />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
