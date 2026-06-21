import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Plus, Save, Trash2, Check, ChevronsUpDown, Lock, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStockData } from '@/hooks/useStockData';
import { usePricingConfigGlobal } from '@/hooks/usePricingData';
import { usePricingVariableCosts } from '@/hooks/usePricingCosts';
import {
  useResaleProducts,
  useUpsertResaleProduct,
  useDeleteResaleProduct,
  calculateResale,
  ResaleProduct,
  ResaleStatus,
} from '@/hooks/usePricingResale';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type DraftRow = {
  id?: string;
  _localId: string;
  stock_item_id: string | null;
  product_name: string;
  acquisition_cost: number;
  packaging_cost: number;
  desired_profit_percentage: number;
  practiced_price: number;
  _dirty?: boolean;
};

const formatBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(isFinite(v) ? v : 0);

const formatPct = (v: number) =>
  `${(isFinite(v) ? v : 0).toFixed(2)}%`;

const STATUS_META: Record<ResaleStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  viavel: { label: 'Dentro da margem', variant: 'default', className: 'bg-emerald-600 hover:bg-emerald-600' },
  ajuste: { label: 'Precisa de ajuste', variant: 'secondary', className: 'bg-amber-500 text-white hover:bg-amber-500' },
  informe_preco: { label: 'Informe preço', variant: 'outline' },
  informe_custo: { label: 'Informe custo', variant: 'outline' },
  config_invalida: { label: 'Configuração inválida', variant: 'destructive' },
};

function toDraft(p: ResaleProduct): DraftRow {
  return {
    id: p.id,
    _localId: p.id,
    stock_item_id: p.stock_item_id,
    product_name: p.product_name,
    acquisition_cost: Number(p.acquisition_cost) || 0,
    packaging_cost: Number(p.packaging_cost) || 0,
    desired_profit_percentage: Number(p.desired_profit_percentage) || 0,
    practiced_price: Number(p.practiced_price) || 0,
  };
}

export default function PricingResale() {
  const { isAdmin } = useAuth();
  const { data: products = [], isLoading } = useResaleProducts();
  const { data: globalConfig } = usePricingConfigGlobal();
  const { stockItems } = useStockData();
  const { data: variableCosts = [] } = usePricingVariableCosts();
  const upsertMutation = useUpsertResaleProduct();
  const deleteMutation = useDeleteResaleProduct();

  // Soma ao vivo dos custos variáveis ativos (mesma lógica do GlobalConfigForm),
  // com fallback no valor salvo em pricing_config_global caso ainda não haja itens cadastrados.
  const liveVariablePct = useMemo(
    () => variableCosts.filter((c) => c.is_active).reduce((s, c) => s + Number(c.percentage || 0), 0),
    [variableCosts],
  );
  const cvPct = liveVariablePct > 0 ? liveVariablePct : (globalConfig?.variable_expenses_pct ?? 0);
  const cfPct = globalConfig?.fixed_expenses_pct ?? 0;
  const defaultProfit = globalConfig?.profit_pct ?? 0;

  const [rows, setRows] = useState<DraftRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState<string | null>(null);

  useEffect(() => {
    setRows((prev) => {
      const localOnly = prev.filter((r) => !r.id);
      return [...products.map(toDraft), ...localOnly];
    });
  }, [products]);

  const activeStockItems = useMemo(
    () => stockItems.filter((i) => i.is_active),
    [stockItems],
  );

  const calcs = useMemo(
    () =>
      rows.map((r) => {
        const linked = r.stock_item_id
          ? stockItems.find((i) => i.id === r.stock_item_id)
          : null;
        const effectiveAcq = linked ? Number(linked.value) || 0 : r.acquisition_cost;
        return calculateResale(
          { ...r, acquisition_cost: effectiveAcq },
          cvPct,
          cfPct,
        );
      }),
    [rows, cvPct, cfPct, stockItems],
  );

  const summary = useMemo(() => {
    const total = rows.length;
    let viable = 0;
    let needAdjust = 0;
    let cmvSum = 0;
    let appliedSum = 0;
    let profitSum = 0;
    let pricedCount = 0;
    calcs.forEach((c) => {
      if (c.status === 'viavel') viable++;
      if (c.status === 'ajuste') needAdjust++;
      if (c.cmvPct > 0) {
        cmvSum += c.cmvPct;
        appliedSum += c.appliedProfitPct;
        profitSum += c.profitValue;
        pricedCount++;
      }
    });
    return {
      total,
      viable,
      needAdjust,
      avgCmv: pricedCount ? cmvSum / pricedCount : 0,
      avgApplied: pricedCount ? appliedSum / pricedCount : 0,
      avgProfit: pricedCount ? profitSum / pricedCount : 0,
    };
  }, [rows, calcs]);

  const updateRow = (localId: string, patch: Partial<DraftRow>) => {
    setRows((prev) =>
      prev.map((r) => (r._localId === localId ? { ...r, ...patch, _dirty: true } : r)),
    );
  };

  const addRow = () => {
    const id = `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setRows((prev) => [
      ...prev,
      {
        _localId: id,
        stock_item_id: null,
        product_name: '',
        acquisition_cost: 0,
        packaging_cost: 0,
        desired_profit_percentage: defaultProfit,
        practiced_price: 0,
        _dirty: true,
      },
    ]);
  };

  const removeRow = async (row: DraftRow) => {
    if (row.id) {
      await deleteMutation.mutateAsync(row.id);
    } else {
      setRows((prev) => prev.filter((r) => r._localId !== row._localId));
    }
  };

  const saveRow = async (row: DraftRow) => {
    if (!row.product_name.trim()) {
      toast({ title: 'Informe o produto', variant: 'destructive' });
      return;
    }
    const linked = row.stock_item_id
      ? stockItems.find((i) => i.id === row.stock_item_id)
      : null;
    const effectiveAcq = linked ? Number(linked.value) || 0 : row.acquisition_cost;
    await upsertMutation.mutateAsync({
      id: row.id,
      stock_item_id: row.stock_item_id,
      product_name: row.product_name.trim(),
      acquisition_cost: effectiveAcq,
      packaging_cost: row.packaging_cost,
      desired_profit_percentage: row.desired_profit_percentage,
      practiced_price: row.practiced_price,
    });
    toast({ title: 'Salvo' });
  };

  const saveAll = async () => {
    const dirty = rows.filter((r) => r._dirty && r.product_name.trim());
    for (const r of dirty) {
      const linked = r.stock_item_id
        ? stockItems.find((i) => i.id === r.stock_item_id)
        : null;
      const effectiveAcq = linked ? Number(linked.value) || 0 : r.acquisition_cost;
      await upsertMutation.mutateAsync({
        id: r.id,
        stock_item_id: r.stock_item_id,
        product_name: r.product_name.trim(),
        acquisition_cost: effectiveAcq,
        packaging_cost: r.packaging_cost,
        desired_profit_percentage: r.desired_profit_percentage,
        practiced_price: r.practiced_price,
      });
    }
    if (dirty.length) toast({ title: `${dirty.length} produto(s) salvos` });
  };

  const selectStockItem = (row: DraftRow, itemId: string | null) => {
    if (!itemId) {
      updateRow(row._localId, { stock_item_id: null });
      setPickerOpen(null);
      return;
    }
    const item = stockItems.find((i) => i.id === itemId);
    if (!item) return;
    updateRow(row._localId, {
      stock_item_id: item.id,
      product_name: item.name,
      acquisition_cost: Number(item.value) || 0,
    });
    setPickerOpen(null);
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-6 flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-700" />
            <p className="text-sm text-amber-700">
              Acesso restrito: somente Administrador pode acessar a Precificação de Revenda.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingBag className="w-6 h-6" />
              Precificação de Revenda
            </h1>
            <p className="text-muted-foreground text-sm">
              Produtos comprados prontos para revenda. Edite na tabela como em uma planilha.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={addRow}>
              <Plus className="w-4 h-4 mr-2" /> Nova linha
            </Button>
            <Button onClick={saveAll} disabled={upsertMutation.isPending}>
              <Save className="w-4 h-4 mr-2" /> Salvar tudo
            </Button>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard label="Produtos" value={String(summary.total)} />
          <SummaryCard label="Dentro da margem" value={String(summary.viable)} tone="success" />
          <SummaryCard label="Precisam ajuste" value={String(summary.needAdjust)} tone="warning" />
          <SummaryCard label="CMV médio" value={formatPct(summary.avgCmv)} />
          <SummaryCard label="Lucro aplicado médio" value={formatPct(summary.avgApplied)} />
          <SummaryCard label="Lucro médio (R$)" value={formatBRL(summary.avgProfit)} />
        </div>

        {!globalConfig && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-3 text-sm text-amber-700">
              Configure os percentuais globais de CF/CV em Precificação → Configuração antes de
              precificar.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Produtos de Revenda — CV {formatPct(cvPct)} · CF {formatPct(cfPct)}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">Produto</TableHead>
                  <TableHead className="text-right">Custo aquisição</TableHead>
                  <TableHead className="text-right">Embalagem</TableHead>
                  <TableHead className="text-right">Lucro desejado %</TableHead>
                  <TableHead className="text-right">Preço sugerido</TableHead>
                  <TableHead className="text-right">Preço praticado</TableHead>
                  <TableHead className="text-right">Lucro aplicado</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Lucro/produto</TableHead>
                  <TableHead className="text-right">CMV</TableHead>
                  <TableHead className="w-[110px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-6">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-6">
                      Nenhum produto. Clique em "Nova linha" para começar.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, idx) => {
                    const c = calcs[idx];
                    const meta = STATUS_META[c.status];
                    const linkedItem = stockItems.find((i) => i.id === row.stock_item_id);
                    return (
                      <TableRow key={row._localId}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Popover
                              open={pickerOpen === row._localId}
                              onOpenChange={(o) => setPickerOpen(o ? row._localId : null)}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  size="sm"
                                  className="w-full justify-between font-normal"
                                >
                                  <span className="truncate">
                                    {row.product_name || 'Selecionar produto...'}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 opacity-50 shrink-0" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 w-[320px]" align="start">
                                <Command>
                                  <CommandInput placeholder="Buscar item de estoque..." />
                                  <CommandList>
                                    <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                                    <CommandGroup>
                                      <CommandItem
                                        value="__manual__"
                                        onSelect={() => {
                                          updateRow(row._localId, { stock_item_id: null });
                                          setPickerOpen(null);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            'mr-2 h-4 w-4',
                                            !row.stock_item_id ? 'opacity-100' : 'opacity-0',
                                          )}
                                        />
                                        Sem vínculo (manual)
                                      </CommandItem>
                                      {activeStockItems.map((item) => (
                                        <CommandItem
                                          key={item.id}
                                          value={item.name}
                                          onSelect={() => selectStockItem(row, item.id)}
                                        >
                                          <Check
                                            className={cn(
                                              'mr-2 h-4 w-4',
                                              row.stock_item_id === item.id
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                            )}
                                          />
                                          <span className="flex-1 truncate">{item.name}</span>
                                          <span className="text-xs text-muted-foreground ml-2">
                                            {formatBRL(Number(item.value) || 0)}/{item.unit}
                                          </span>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            {!row.stock_item_id && (
                              <Input
                                value={row.product_name}
                                onChange={(e) =>
                                  updateRow(row._localId, { product_name: e.target.value })
                                }
                                placeholder="Nome do produto (manual)"
                                className="h-8"
                              />
                            )}
                            {linkedItem && (
                              <span className="text-[10px] text-muted-foreground">
                                Estoque: {linkedItem.name} · {formatBRL(Number(linkedItem.value) || 0)}/{linkedItem.unit}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <NumberCell
                          value={row.acquisition_cost}
                          onChange={(v) => updateRow(row._localId, { acquisition_cost: v })}
                          displayValue={linkedItem ? Number(linkedItem.value) || 0 : undefined}
                          disabled={!!linkedItem}
                          title={linkedItem ? 'Vinculado ao estoque — preço atualizado automaticamente' : undefined}
                        />
                        <NumberCell
                          value={row.packaging_cost}
                          onChange={(v) => updateRow(row._localId, { packaging_cost: v })}
                        />
                        <NumberCell
                          value={row.desired_profit_percentage}
                          step={0.01}
                          onChange={(v) =>
                            updateRow(row._localId, { desired_profit_percentage: v })
                          }
                        />
                        <TableCell className="text-right font-medium">
                          {c.configInvalid ? (
                            <span className="text-destructive text-xs">inválido</span>
                          ) : c.suggestedPrice > 0 ? (
                            formatBRL(c.suggestedPrice)
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <NumberCell
                          value={row.practiced_price}
                          onChange={(v) => updateRow(row._localId, { practiced_price: v })}
                        />
                        <TableCell className="text-right">{formatPct(c.appliedProfitPct)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={meta.variant} className={meta.className}>
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatBRL(c.profitValue)}</TableCell>
                        <TableCell className="text-right">{formatPct(c.cmvPct)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => saveRow(row)}
                              disabled={!row._dirty || upsertMutation.isPending}
                              title="Salvar linha"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeRow(row)}
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success' | 'warning';
}) {
  return (
    <Card>
      <CardContent className="py-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            'text-lg font-semibold',
            tone === 'success' && 'text-emerald-600',
            tone === 'warning' && 'text-amber-600',
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function NumberCell({
  value,
  onChange,
  step = 0.01,
  displayValue,
  disabled,
  title,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  displayValue?: number;
  disabled?: boolean;
  title?: string;
}) {
  const shown = displayValue !== undefined ? displayValue : value;
  const [local, setLocal] = useState<string>(String(shown ?? 0));
  useEffect(() => {
    setLocal(String(shown ?? 0));
  }, [shown]);
  return (
    <TableCell className="text-right">
      <Input
        type="number"
        step={step}
        value={local}
        onChange={(e) => !disabled && setLocal(e.target.value)}
        onBlur={() => {
          if (disabled) return;
          const n = parseFloat(local.replace(',', '.'));
          onChange(isNaN(n) ? 0 : n);
        }}
        disabled={disabled}
        readOnly={disabled}
        title={title}
        className="h-8 text-right disabled:opacity-70 disabled:cursor-not-allowed"
      />
    </TableCell>
  );
}