import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStockAdjustments } from '@/hooks/useStockAdjustments';
import { useStockData } from '@/hooks/useStockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import { formatCurrency } from '@/utils/cmvCalculations';
import { normalizeQuantityToBaseUnit } from '@/utils/stockValuation';
import { format } from 'date-fns';
import { Plus, Trash2, AlertTriangle, Package, Wrench } from 'lucide-react';

const typeConfig = {
  perda: { label: 'Perda', variant: 'destructive' as const, icon: AlertTriangle },
  quebra: { label: 'Quebra', variant: 'secondary' as const, icon: Package },
  erro_operacional: { label: 'Erro Operacional', variant: 'outline' as const, icon: Wrench },
};

const StockAdjustments = () => {
  const { adjustments, loading: adjLoading, createAdjustment, deleteAdjustment } = useStockAdjustments();
  const { stockItems, categories, loading: stockLoading } = useStockData();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [physicalQty, setPhysicalQty] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'perda' | 'quebra' | 'erro_operacional'>('perda');
  const [adjNotes, setAdjNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loading = adjLoading || stockLoading;

  const selectedItem = useMemo(
    () => stockItems.find((i) => i.id === selectedItemId),
    [stockItems, selectedItemId]
  );

  const difference = useMemo(() => {
    if (!selectedItem || !physicalQty) return 0;
    return Number(physicalQty) - selectedItem.current_quantity;
  }, [selectedItem, physicalQty]);

  const valueImpact = useMemo(() => {
    if (!selectedItem) return 0;
    const unitValue = selectedItem.value || 0;
    return normalizeQuantityToBaseUnit(Math.abs(difference), selectedItem.unit) * unitValue;
  }, [selectedItem, difference]);

  const handleCreate = async () => {
    if (!selectedItem) return;
    setSaving(true);
    await createAdjustment({
      stock_item_id: selectedItem.id,
      theoretical_quantity: selectedItem.current_quantity,
      physical_quantity: Number(physicalQty),
      adjustment_type: adjustmentType,
      value_impact: valueImpact,
      notes: adjNotes,
    });
    setSaving(false);
    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedItemId('');
    setPhysicalQty('');
    setAdjustmentType('perda');
    setAdjNotes('');
  };

  // Stats
  const totalLosses = adjustments.reduce((sum, a) => sum + a.value_impact, 0);
  const countByType = {
    perda: adjustments.filter((a) => a.adjustment_type === 'perda').length,
    quebra: adjustments.filter((a) => a.adjustment_type === 'quebra').length,
    erro_operacional: adjustments.filter((a) => a.adjustment_type === 'erro_operacional').length,
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoader message="Carregando ajustes..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ajustes de Estoque</h1>
            <p className="text-muted-foreground">
              Divergências entre estoque teórico e contagem física
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Registrar Ajuste
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Divergência</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Produto</Label>
                  <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {stockItems.filter((i) => i.is_active).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} ({item.current_quantity} {item.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedItem && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Qtd. Teórica (sistema)</Label>
                        <Input value={`${selectedItem.current_quantity} ${selectedItem.unit}`} disabled />
                      </div>
                      <div>
                        <Label>Qtd. Física (contagem)</Label>
                        <Input
                          type="number"
                          value={physicalQty}
                          onChange={(e) => setPhysicalQty(e.target.value)}
                          placeholder="Quantidade real"
                        />
                      </div>
                    </div>

                    {physicalQty && (
                      <Card className={difference < 0 ? 'border-destructive/50' : 'border-green-500/50'}>
                        <CardContent className="pt-4 pb-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Divergência:</span>
                            <span className={`font-bold ${difference < 0 ? 'text-destructive' : 'text-green-500'}`}>
                              {difference > 0 ? '+' : ''}{difference} {selectedItem.unit}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-sm text-muted-foreground">Impacto financeiro:</span>
                            <span className="font-bold text-destructive">{formatCurrency(valueImpact)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div>
                      <Label>Tipo de Ajuste</Label>
                      <Select value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="perda">Perda</SelectItem>
                          <SelectItem value="quebra">Quebra</SelectItem>
                          <SelectItem value="erro_operacional">Erro Operacional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Observações</Label>
                      <Textarea value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)} placeholder="Descreva a causa da divergência..." />
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={saving || !selectedItemId || !physicalQty}>
                  {saving ? 'Salvando...' : 'Registrar Ajuste'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(typeConfig).map(([key, cfg]) => {
            const TypeIcon = cfg.icon;
            const count = countByType[key as keyof typeof countByType];
            return (
              <Card key={key}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <TypeIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{cfg.label}</p>
                      <p className="text-xl font-bold text-foreground">{count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Histórico de Ajustes</span>
              <Badge variant="secondary">
                Total: {formatCurrency(totalLosses)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {adjustments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum ajuste registrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Teórico</TableHead>
                      <TableHead>Físico</TableHead>
                      <TableHead>Divergência</TableHead>
                      <TableHead>Impacto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Obs.</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustments.map((adj) => {
                      const item = stockItems.find((i) => i.id === adj.stock_item_id);
                      const cfg = typeConfig[adj.adjustment_type];
                      return (
                        <TableRow key={adj.id}>
                          <TableCell className="text-sm">
                            {format(new Date(adj.created_at), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="font-medium">{item?.name || '—'}</TableCell>
                          <TableCell>{adj.theoretical_quantity} {item?.unit}</TableCell>
                          <TableCell>{adj.physical_quantity} {item?.unit}</TableCell>
                          <TableCell>
                            <span className={adj.difference < 0 ? 'text-destructive font-semibold' : 'text-green-500 font-semibold'}>
                              {adj.difference > 0 ? '+' : ''}{adj.difference}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold text-destructive">
                            {formatCurrency(adj.value_impact)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={cfg.variant}>{cfg.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                            {adj.notes || '—'}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => deleteAdjustment(adj.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StockAdjustments;