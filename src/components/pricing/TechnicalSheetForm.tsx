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
  useUpsertTechnicalSheet,
  calculatePricing,
} from '@/hooks/usePricingData';
import { useStockData } from '@/hooks/useStockData';
import {
  useTechnicalSheetIngredients,
  useSaveIngredients,
  IngredientUnit,
} from '@/hooks/useTechnicalSheetIngredients';
import { PricingResultCards } from './PricingResultCards';
import { IngredientsList } from './IngredientsList';
import { ProductConfigSection } from './ProductConfigSection';
import { FileText, Calculator } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LocalIngredient {
  id: string;
  stock_item_id: string;
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
  const [ingredients, setIngredients] = useState<LocalIngredient[]>([]);

  const { stockItems } = useStockData();
  const { data: existingIngredients } = useTechnicalSheetIngredients(sheet?.id);
  const upsertSheet = useUpsertTechnicalSheet();
  const saveIngredients = useSaveIngredients();

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
      setNotes(sheet.notes || '');
    } else {
      setManualCmv('0');
      setLaborCostPerHour('0');
      setPrepTimeMinutes('0');
      setPackagingCost('0');
      setYieldKg('0');
      setYieldPortions('0');
      setSalePrice('0');
      setNotes('');
    }
  }, [sheet]);

  // Carrega ingredientes existentes
  useEffect(() => {
    if (existingIngredients && existingIngredients.length > 0) {
      setUseIngredients(true);
      setIngredients(
        existingIngredients.map(ing => ({
          id: ing.id,
          stock_item_id: ing.stock_item_id,
          quantity: Number(ing.quantity),
          unit_type: ing.unit_type as IngredientUnit,
          calculated_cost: Number(ing.calculated_cost),
        }))
      );
    }
  }, [existingIngredients]);

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
      notes: notes,
      created_by: null,
      created_at: '',
      updated_at: '',
    };
  }, [calculatedCmv, laborCostPerHour, prepTimeMinutes, packagingCost, yieldKg, yieldPortions, salePrice, notes, productId, sheet?.id]);

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
        notes: notes || null,
      });

      // Se usar ingredientes, salva os ingredientes também
      if (useIngredients && savedSheet) {
        await saveIngredients.mutateAsync({
          technicalSheetId: savedSheet.id,
          ingredients: ingredients.map(ing => ({
            stock_item_id: ing.stock_item_id,
            quantity: ing.quantity,
            unit_type: ing.unit_type,
            calculated_cost: ing.calculated_cost,
          })),
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
                    step="0.01"
                    min="0"
                    value={yieldKg}
                    onChange={(e) => setYieldKg(formatCurrencyInput(e.target.value))}
                    placeholder="0.00"
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
                <Label htmlFor="salePrice">Preço de Venda Praticado (R$)</Label>
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
                  Informe o preço real que você cobra. Será comparado com o preço sugerido para definir a viabilidade.
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
