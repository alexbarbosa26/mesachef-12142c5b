import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, Database, AlertCircle, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  computeCooking,
  formatBRL,
  formatNumber,
  formatPct,
  parseDecimal,
  WeightUnit,
} from './calculatorMath';
import { ApplyToStockDialog } from './ApplyToStockDialog';
import { useProductionCalculations } from '@/hooks/useProductionCalculations';
import { FieldHelp } from './FieldHelp';

interface Props {
  prefillFromCorrection?: { costPerKgNet: number; foodName: string } | null;
}

export function CookingFactorCalculator({ prefillFromCorrection }: Props) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { saveCalculation } = useProductionCalculations();

  const [foodName, setFoodName] = useState('');
  const [beforeWeight, setBeforeWeight] = useState('');
  const [beforeUnit, setBeforeUnit] = useState<WeightUnit>('g');
  const [afterWeight, setAfterWeight] = useState('');
  const [afterUnit, setAfterUnit] = useState<WeightUnit>('g');
  const [costPerKg, setCostPerKg] = useState('');
  const [notes, setNotes] = useState('');
  const [applyOpen, setApplyOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const result = useMemo(() => {
    const bw = parseDecimal(beforeWeight);
    const aw = parseDecimal(afterWeight);
    const c = parseDecimal(costPerKg);
    if (!isFinite(bw) || !isFinite(aw) || bw <= 0 || aw <= 0) return null;
    return computeCooking({
      beforeWeight: bw,
      beforeUnit,
      afterWeight: aw,
      afterUnit,
      costPerKgBefore: isFinite(c) ? c : 0,
    });
  }, [beforeWeight, beforeUnit, afterWeight, afterUnit, costPerKg]);

  const gained = result ? result.afterG > result.beforeG : false;

  const applyCorrectionPrefill = () => {
    if (!prefillFromCorrection) return;
    setCostPerKg(
      String(prefillFromCorrection.costPerKgNet.toFixed(4)).replace('.', ',')
    );
    if (!foodName && prefillFromCorrection.foodName) {
      setFoodName(`${prefillFromCorrection.foodName} preparado`);
    }
    toast({ title: 'Custo importado', description: 'Usando custo do alimento limpo.' });
  };

  const persist = async (
    action: 'updated_item' | 'created_item' | 'saved_only',
    linkedItemId: string | null = null
  ) => {
    if (!result) return;
    setSaving(true);
    const saved = await saveCalculation({
      calculation_type: 'cooking',
      food_name: foodName || 'Sem nome',
      gross_weight_g: result.beforeG,
      net_weight_g: result.afterG,
      loss_g: result.lossG,
      loss_pct: result.lossPct,
      yield_pct: result.yieldPct,
      correction_factor: null,
      cooking_factor: result.cookingFactor,
      total_cost: result.totalCostUsed,
      cost_per_kg_gross: result.costPerKgBefore,
      cost_per_kg_net: result.costPerKgAfter,
      cost_per_g_net: result.costPerGAfter,
      action_taken: action,
      linked_item_id: linkedItemId,
      source_calculation_id: null,
      notes: notes || null,
    });
    setSaving(false);
    if (saved && action === 'saved_only') {
      toast({ title: 'Cálculo salvo', description: 'Disponível no histórico.' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fator de cocção (pós-preparo)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="ck-name" className="flex items-center gap-1.5 mb-1.5">
              Nome do alimento / preparo
              <FieldHelp text="Identifique o item após a cocção (ex.: Salmão grelhado, Arroz cozido, Frango assado)." />
            </Label>
            <Input
              id="ck-name"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="Ex.: Salmão grelhado, Frango cozido..."
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="flex items-center gap-1.5 mb-1.5">
                Peso antes da cocção
                <FieldHelp text="Peso do alimento já limpo, antes de ir ao fogo/forno. Use a mesma unidade selecionada ao lado." />
              </Label>
              <Input
                inputMode="decimal"
                value={beforeWeight}
                onChange={(e) => setBeforeWeight(e.target.value)}
                placeholder="0,000"
              />
            </div>
            <div className="w-24">
              <Label>Unidade</Label>
              <Select value={beforeUnit} onValueChange={(v) => setBeforeUnit(v as WeightUnit)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="flex items-center gap-1.5 mb-1.5">
                Peso depois da cocção
                <FieldHelp text="Peso final, já cozido. Pode ser menor (perda de água, ex.: carnes) ou maior (ganho por hidratação, ex.: arroz, feijão, massas)." />
              </Label>
              <Input
                inputMode="decimal"
                value={afterWeight}
                onChange={(e) => setAfterWeight(e.target.value)}
                placeholder="0,000"
              />
            </div>
            <div className="w-24">
              <Label>Unidade</Label>
              <Select value={afterUnit} onValueChange={(v) => setAfterUnit(v as WeightUnit)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="md:col-span-2 flex items-end gap-2">
            <div className="flex-1">
              <Label className="flex items-center gap-1.5 mb-1.5">
                Custo por Kg antes da cocção (R$)
                <FieldHelp text="Custo de 1 Kg do alimento já limpo (após pré-preparo). Use 'Usar resultado da correção' para importar automaticamente." />
              </Label>
              <Input
                inputMode="decimal"
                value={costPerKg}
                onChange={(e) => setCostPerKg(e.target.value)}
                placeholder="0,00"
              />
            </div>
            {prefillFromCorrection && (
              <Button type="button" variant="outline" onClick={applyCorrectionPrefill}>
                <Wand2 className="w-4 h-4 mr-2" />
                Usar resultado da correção
              </Button>
            )}
          </div>

          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional"
              rows={2}
            />
          </div>
        </div>

        {result ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t">
            <Cell
              label={gained ? 'Ganho na cocção' : 'Perda na cocção'}
              value={`${formatNumber(Math.abs(result.lossG), 0)} g`}
              sub={formatPct(Math.abs(result.lossPct))}
            />
            <Cell label="Rendimento" value={formatPct(result.yieldPct)} />
            <Cell label="Fator de cocção" value={formatNumber(result.cookingFactor, 3)} />
            <Cell label="Custo / Kg antes" value={formatBRL(result.costPerKgBefore)} muted={!result.costPerKgBefore} />
            <Cell
              label="Custo / Kg após"
              value={formatBRL(result.costPerKgAfter)}
              highlight={!!result.costPerKgBefore}
              muted={!result.costPerKgBefore}
            />
            <Cell
              label="Custo / g após"
              value={formatBRL(result.costPerGAfter, 5)}
              muted={!result.costPerKgBefore}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-3 border-t">
            <AlertCircle className="w-4 h-4" />
            Informe peso antes e depois da cocção para ver os resultados.
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => persist('saved_only')}
            disabled={!result || saving}
          >
            <Save className="w-4 h-4 mr-2" />
            Apenas salvar cálculo
          </Button>
          {isAdmin && (
            <Button
              onClick={() => setApplyOpen(true)}
              disabled={!result || !result.costPerKgBefore || result.costPerKgAfter <= 0}
            >
              <Database className="w-4 h-4 mr-2" />
              Aplicar no estoque
            </Button>
          )}
        </div>

        {result && (
          <ApplyToStockDialog
            open={applyOpen}
            onOpenChange={setApplyOpen}
            costPerKg={result.costPerKgAfter}
            suggestedName={foodName}
            onApplied={(action, linkedItemId) => persist(action, linkedItemId)}
          />
        )}
      </CardContent>
    </Card>
  );
}

function Cell({
  label,
  value,
  sub,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight ? 'border-primary/50 bg-primary/5' : ''
      } ${muted ? 'opacity-60' : ''}`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-bold ${highlight ? 'text-primary' : ''}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}