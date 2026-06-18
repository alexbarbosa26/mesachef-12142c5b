import { useEffect, useMemo, useState } from 'react';
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
import { Save, Database, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  computeCorrection,
  formatBRL,
  formatNumber,
  formatPct,
  parseDecimal,
  WeightUnit,
} from './calculatorMath';
import { ApplyToStockDialog } from './ApplyToStockDialog';
import { useProductionCalculations } from '@/hooks/useProductionCalculations';
import { FieldHelp } from './FieldHelp';

type InputMode = 'loss' | 'net';

interface CorrectionCalculatorProps {
  onResultChange?: (result: { costPerKgNet: number; foodName: string } | null) => void;
}

export function CorrectionFactorCalculator({ onResultChange }: CorrectionCalculatorProps) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { saveCalculation } = useProductionCalculations();

  const [foodName, setFoodName] = useState('');
  const [grossWeight, setGrossWeight] = useState('');
  const [grossUnit, setGrossUnit] = useState<WeightUnit>('kg');
  const [mode, setMode] = useState<InputMode>('loss');
  const [lossWeight, setLossWeight] = useState('');
  const [lossUnit, setLossUnit] = useState<WeightUnit>('kg');
  const [netWeight, setNetWeight] = useState('');
  const [netUnit, setNetUnit] = useState<WeightUnit>('kg');
  const [totalCost, setTotalCost] = useState('');
  const [notes, setNotes] = useState('');
  const [applyOpen, setApplyOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const result = useMemo(() => {
    const gw = parseDecimal(grossWeight);
    const tc = parseDecimal(totalCost);
    if (!isFinite(gw) || gw <= 0) return null;
    if (mode === 'loss') {
      const lw = parseDecimal(lossWeight);
      if (!isFinite(lw) || lw <= 0) return null;
      return computeCorrection({
        grossWeight: gw,
        grossUnit,
        lossWeight: lw,
        lossUnit,
        totalCost: isFinite(tc) ? tc : 0,
      });
    } else {
      const nw = parseDecimal(netWeight);
      if (!isFinite(nw) || nw <= 0) return null;
      return computeCorrection({
        grossWeight: gw,
        grossUnit,
        netWeight: nw,
        netUnit,
        totalCost: isFinite(tc) ? tc : 0,
      });
    }
  }, [grossWeight, grossUnit, mode, lossWeight, lossUnit, netWeight, netUnit, totalCost]);

  // Propagate result up for cross-calculator use
  useEffect(() => {
    if (result && result.costPerKgNet > 0) {
      onResultChange?.({ costPerKgNet: result.costPerKgNet, foodName });
    } else {
      onResultChange?.(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.costPerKgNet, foodName]);

  const persist = async (
    action: 'updated_item' | 'created_item' | 'saved_only',
    linkedItemId: string | null = null
  ) => {
    if (!result) return;
    setSaving(true);
    const saved = await saveCalculation({
      calculation_type: 'correction',
      food_name: foodName || 'Sem nome',
      gross_weight_g: result.grossG,
      net_weight_g: result.netG,
      loss_g: result.lossG,
      loss_pct: result.lossPct,
      yield_pct: result.yieldPct,
      correction_factor: result.correctionFactor,
      cooking_factor: null,
      total_cost: result.totalCost,
      cost_per_kg_gross: result.costPerKgGross,
      cost_per_kg_net: result.costPerKgNet,
      cost_per_g_net: result.costPerGNet,
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
        <CardTitle>Fator de correção (pré-preparo)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="cf-name" className="flex items-center gap-1.5">
              Nome do alimento
              <FieldHelp text="Nome do insumo bruto que será limpo/processado (ex.: Salmão inteiro, Tomate, Alface)." />
            </Label>
            <Input
              id="cf-name"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              placeholder="Ex.: Salmão, Tomate, Alface..."
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="flex items-center gap-1.5">
                Peso bruto
                <FieldHelp text="Peso total do alimento como comprado, antes da limpeza (com casca, talos, ossos, etc.)." />
              </Label>
              <Input
                inputMode="decimal"
                value={grossWeight}
                onChange={(e) => setGrossWeight(e.target.value)}
                placeholder="0,000"
              />
            </div>
            <div className="w-24">
              <Label>Unidade</Label>
              <Select value={grossUnit} onValueChange={(v) => setGrossUnit(v as WeightUnit)}>
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

          <div>
            <Label className="flex items-center gap-1.5">
              Informar por
              <FieldHelp text="Escolha se vai digitar quanto foi descartado (perda) ou quanto sobrou utilizável (peso líquido). O outro valor é calculado automaticamente." />
            </Label>
            <Select value={mode} onValueChange={(v) => setMode(v as InputMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="loss">Peso descartado / perda</SelectItem>
                <SelectItem value="net">Peso líquido / aproveitável</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === 'loss' ? (
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="flex items-center gap-1.5">
                  Perda
                  <FieldHelp text="Peso descartado durante a limpeza (cascas, ossos, gordura, talos). Será subtraído do peso bruto." />
                </Label>
                <Input
                  inputMode="decimal"
                  value={lossWeight}
                  onChange={(e) => setLossWeight(e.target.value)}
                  placeholder="0,000"
                />
              </div>
              <div className="w-24">
                <Label>Unidade</Label>
                <Select value={lossUnit} onValueChange={(v) => setLossUnit(v as WeightUnit)}>
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
          ) : (
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="flex items-center gap-1.5">
                  Peso líquido
                  <FieldHelp text="Peso já limpo, pronto para uso na receita." />
                </Label>
                <Input
                  inputMode="decimal"
                  value={netWeight}
                  onChange={(e) => setNetWeight(e.target.value)}
                  placeholder="0,000"
                />
              </div>
              <div className="w-24">
                <Label>Unidade</Label>
                <Select value={netUnit} onValueChange={(v) => setNetUnit(v as WeightUnit)}>
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
          )}

          <div>
            <Label className="flex items-center gap-1.5">
              Custo total da compra (R$)
              <FieldHelp text="Quanto você pagou pelo peso bruto informado. Usado para calcular o custo real por Kg limpo." />
            </Label>
            <Input
              inputMode="decimal"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              placeholder="0,00"
            />
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
            <ResultCell label="Perda" value={`${formatNumber(result.lossG, 0)} g`} sub={formatPct(result.lossPct)} />
            <ResultCell label="Aproveitamento" value={formatPct(result.yieldPct)} />
            <ResultCell label="Fator de correção" value={formatNumber(result.correctionFactor, 3)} />
            <ResultCell
              label="Custo / Kg bruto"
              value={formatBRL(result.costPerKgGross)}
              muted={!result.totalCost}
            />
            <ResultCell
              label="Custo / Kg limpo"
              value={formatBRL(result.costPerKgNet)}
              highlight={!!result.totalCost}
              muted={!result.totalCost}
            />
            <ResultCell
              label="Custo / g limpo"
              value={formatBRL(result.costPerGNet, 5)}
              muted={!result.totalCost}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-3 border-t">
            <AlertCircle className="w-4 h-4" />
            Informe peso bruto e {mode === 'loss' ? 'perda' : 'peso líquido'} para ver os resultados.
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
              disabled={!result || !result.totalCost || result.costPerKgNet <= 0}
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
            costPerKg={result.costPerKgNet}
            suggestedName={foodName ? `${foodName} limpo` : ''}
            onApplied={(action, linkedItemId) => persist(action, linkedItemId)}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ResultCell({
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