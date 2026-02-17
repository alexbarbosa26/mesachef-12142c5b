import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  PricingConfigGlobal,
  PricingConfigProduct,
  useUpsertPricingConfigProduct,
  useDeletePricingConfigProduct,
} from '@/hooks/usePricingData';
import { Settings, Info, Trash2 } from 'lucide-react';

interface ProductConfigSectionProps {
  productId: string;
  productName: string;
  globalConfig: PricingConfigGlobal;
  productConfig?: PricingConfigProduct;
}

export function ProductConfigSection({
  productId,
  productName,
  globalConfig,
  productConfig,
}: ProductConfigSectionProps) {
  const [useCustom, setUseCustom] = useState(false);
  const [dv, setDv] = useState('');
  const [df, setDf] = useState('');
  const [l, setL] = useState('');
  const [i, setI] = useState('');

  const upsertConfig = useUpsertPricingConfigProduct();
  const deleteConfig = useDeletePricingConfigProduct();

  useEffect(() => {
    if (productConfig) {
      setUseCustom(true);
      setDv(productConfig.variable_expenses_pct?.toString() ?? '');
      setDf(productConfig.fixed_expenses_pct?.toString() ?? '');
      setL(productConfig.profit_pct?.toString() ?? '');
      setI(productConfig.investment_pct?.toString() ?? '');
    } else {
      setUseCustom(false);
      setDv('');
      setDf('');
      setL('');
      setI('');
    }
  }, [productConfig]);

  const effectiveDv = dv !== '' ? parseFloat(dv) || 0 : globalConfig.variable_expenses_pct;
  const effectiveDf = df !== '' ? parseFloat(df) || 0 : globalConfig.fixed_expenses_pct;
  const effectiveL = l !== '' ? parseFloat(l) || 0 : globalConfig.profit_pct;
  const effectiveI = i !== '' ? parseFloat(i) || 0 : globalConfig.investment_pct;
  const totalPct = effectiveDv + effectiveDf + effectiveL + effectiveI;
  const hasError = totalPct >= 100;

  const handleSave = async () => {
    if (hasError) return;

    await upsertConfig.mutateAsync({
      product_id: productId,
      variable_expenses_pct: dv !== '' ? parseFloat(dv) : null,
      fixed_expenses_pct: df !== '' ? parseFloat(df) : null,
      profit_pct: l !== '' ? parseFloat(l) : null,
      investment_pct: i !== '' ? parseFloat(i) : null,
    });
  };

  const handleRemoveCustom = async () => {
    await deleteConfig.mutateAsync(productId);
    setUseCustom(false);
    setDv('');
    setDf('');
    setL('');
    setI('');
  };

  const handleToggle = (checked: boolean) => {
    setUseCustom(checked);
    if (checked && !productConfig) {
      // Pre-fill with global values for easier editing
      setDv(globalConfig.variable_expenses_pct.toString());
      setDf(globalConfig.fixed_expenses_pct.toString());
      setL(globalConfig.profit_pct.toString());
      setI(globalConfig.investment_pct.toString());
    }
    if (!checked && productConfig) {
      handleRemoveCustom();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="w-4 h-4" />
              Percentuais Individuais
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Sobrescrever os percentuais globais para este produto
            </CardDescription>
          </div>
          <Switch checked={useCustom} onCheckedChange={handleToggle} />
        </div>
      </CardHeader>

      {useCustom && (
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="prod-dv" className="text-xs">
                DV% - Desp. Variáveis
              </Label>
              <div className="relative">
                <Input
                  id="prod-dv"
                  type="number"
                  step="0.1"
                  min="0"
                  max="99"
                  value={dv}
                  onChange={(e) => setDv(e.target.value)}
                  className="pr-7 h-9 text-sm"
                  placeholder={globalConfig.variable_expenses_pct.toString()}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="prod-df" className="text-xs">
                DF% - Desp. Fixas
              </Label>
              <div className="relative">
                <Input
                  id="prod-df"
                  type="number"
                  step="0.1"
                  min="0"
                  max="99"
                  value={df}
                  onChange={(e) => setDf(e.target.value)}
                  className="pr-7 h-9 text-sm"
                  placeholder={globalConfig.fixed_expenses_pct.toString()}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="prod-l" className="text-xs">
                L% - Lucro
              </Label>
              <div className="relative">
                <Input
                  id="prod-l"
                  type="number"
                  step="0.1"
                  min="0"
                  max="99"
                  value={l}
                  onChange={(e) => setL(e.target.value)}
                  className="pr-7 h-9 text-sm"
                  placeholder={globalConfig.profit_pct.toString()}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="prod-i" className="text-xs">
                I% - Investimento
              </Label>
              <div className="relative">
                <Input
                  id="prod-i"
                  type="number"
                  step="0.1"
                  min="0"
                  max="99"
                  value={i}
                  onChange={(e) => setI(e.target.value)}
                  className="pr-7 h-9 text-sm"
                  placeholder={globalConfig.investment_pct.toString()}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Total */}
          <div
            className={`p-2 rounded-lg text-sm ${
              hasError
                ? 'bg-destructive/10 border border-destructive/30'
                : 'bg-muted'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Total:</span>
              <span className={`font-bold ${hasError ? 'text-destructive' : ''}`}>
                {totalPct.toFixed(1)}%
              </span>
            </div>
            {hasError && (
              <p className="text-xs text-destructive mt-1">
                A soma não pode atingir ou ultrapassar 100%
              </p>
            )}
          </div>

          <Alert className="py-2">
            <Info className="h-3 w-3" />
            <AlertDescription className="text-xs">
              Campos vazios usarão o valor global automaticamente.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={hasError || upsertConfig.isPending}
              className="flex-1"
            >
              {upsertConfig.isPending ? 'Salvando...' : 'Salvar Percentuais'}
            </Button>
            {productConfig && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRemoveCustom}
                disabled={deleteConfig.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
