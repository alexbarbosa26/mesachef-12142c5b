import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  TechnicalSheet,
  PricingConfigGlobal,
  PricingConfigProduct,
  useUpsertTechnicalSheet,
  calculatePricing,
} from '@/hooks/usePricingData';
import { PricingResultCards } from './PricingResultCards';
import { FileText, Calculator } from 'lucide-react';

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
  const [cmv, setCmv] = useState('0');
  const [laborCostPerHour, setLaborCostPerHour] = useState('0');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState('0');
  const [packagingCost, setPackagingCost] = useState('0');
  const [notes, setNotes] = useState('');

  const upsertSheet = useUpsertTechnicalSheet();

  useEffect(() => {
    if (sheet) {
      setCmv(sheet.cmv.toString());
      setLaborCostPerHour(sheet.labor_cost_per_hour.toString());
      setPrepTimeMinutes(sheet.prep_time_minutes.toString());
      setPackagingCost(sheet.packaging_cost.toString());
      setNotes(sheet.notes || '');
    } else {
      setCmv('0');
      setLaborCostPerHour('0');
      setPrepTimeMinutes('0');
      setPackagingCost('0');
      setNotes('');
    }
  }, [sheet]);

  // Cálculo em tempo real
  const liveSheet: TechnicalSheet | undefined = useMemo(() => {
    const cmvNum = parseFloat(cmv) || 0;
    const laborNum = parseFloat(laborCostPerHour) || 0;
    const prepNum = parseInt(prepTimeMinutes) || 0;
    const packNum = parseFloat(packagingCost) || 0;

    return {
      id: sheet?.id || '',
      product_id: productId,
      cmv: cmvNum,
      labor_cost_per_hour: laborNum,
      prep_time_minutes: prepNum,
      packaging_cost: packNum,
      notes: notes,
      created_by: null,
      created_at: '',
      updated_at: '',
    };
  }, [cmv, laborCostPerHour, prepTimeMinutes, packagingCost, notes, productId, sheet?.id]);

  const pricing = useMemo(() => {
    return calculatePricing(liveSheet, globalConfig, productConfig);
  }, [liveSheet, globalConfig, productConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await upsertSheet.mutateAsync({
      product_id: productId,
      cmv: parseFloat(cmv) || 0,
      labor_cost_per_hour: parseFloat(laborCostPerHour) || 0,
      prep_time_minutes: parseInt(prepTimeMinutes) || 0,
      packaging_cost: parseFloat(packagingCost) || 0,
      notes: notes || null,
    });

    onClose?.();
  };

  const formatCurrencyInput = (value: string) => {
    // Remove non-numeric except dots
    return value.replace(/[^\d.]/g, '');
  };

  return (
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
            <div className="space-y-2">
              <Label htmlFor="cmv">CMV - Custo dos Ingredientes (R$)</Label>
              <Input
                id="cmv"
                type="number"
                step="0.01"
                min="0"
                value={cmv}
                onChange={(e) => setCmv(formatCurrencyInput(e.target.value))}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Soma do custo de todos os ingredientes para produzir 1 unidade
              </p>
            </div>

            <Separator />

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
              <Button type="submit" disabled={upsertSheet.isPending} className="flex-1">
                {upsertSheet.isPending ? 'Salvando...' : 'Salvar Ficha Técnica'}
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
  );
}
