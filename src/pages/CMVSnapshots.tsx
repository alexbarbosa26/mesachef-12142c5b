import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useCMVSnapshots } from '@/hooks/useCMVSnapshots';
import { useStockData } from '@/hooks/useStockData';
import { useStockPurchases } from '@/hooks/useStockPurchases';
import { calculateItemTotalValue } from '@/utils/stockValuation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import { formatCurrency, formatPercent } from '@/utils/cmvCalculations';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Camera, Trash2, Plus, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

const statusConfig = {
  normal: { label: 'Normal', variant: 'outline' as const, icon: CheckCircle, color: 'text-green-500' },
  alerta: { label: 'Alerta', variant: 'secondary' as const, icon: AlertTriangle, color: 'text-yellow-500' },
  critico: { label: 'Crítico', variant: 'destructive' as const, icon: AlertCircle, color: 'text-destructive' },
};

const CMVSnapshots = () => {
  const { snapshots, loading: snapshotsLoading, generateSnapshot, deleteSnapshot } = useCMVSnapshots();
  const { stockItems, loading: stockLoading } = useStockData();
  const { purchases, loading: purchasesLoading } = useStockPurchases();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [periodStart, setPeriodStart] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);

  const loading = snapshotsLoading || stockLoading || purchasesLoading;

  const currentStockValue = useMemo(
    () => stockItems.filter((i) => i.is_active).reduce((sum, i) => sum + calculateItemTotalValue(i), 0),
    [stockItems]
  );

  const handleGenerate = async () => {
    setGenerating(true);
    // Use the last snapshot's final value as initial, or current stock value
    const lastSnapshot = snapshots.find((s) => s.period_end <= periodStart);
    const initialValue = lastSnapshot ? lastSnapshot.final_stock_value : currentStockValue;

    await generateSnapshot(periodStart, periodEnd, stockItems, purchases, initialValue, undefined, notes);
    setGenerating(false);
    setDialogOpen(false);
    setNotes('');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoader message="Carregando snapshots..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Snapshots CMV</h1>
            <p className="text-muted-foreground">
              Registros semanais de estoque teórico vs. físico
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Gerar Snapshot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Gerar Snapshot CMV
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Início do Período</Label>
                    <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                  </div>
                  <div>
                    <Label>Fim do Período</Label>
                    <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Valor do Estoque Atual</Label>
                  <p className="text-lg font-semibold text-primary">{formatCurrency(currentStockValue)}</p>
                  <p className="text-xs text-muted-foreground">Será usado como estoque final do snapshot</p>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: Contagem física realizada segunda-feira" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? 'Gerando...' : 'Gerar Snapshot'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {snapshots.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Camera className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum snapshot gerado</p>
              <p>Gere seu primeiro snapshot para comparar estoque teórico e físico</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Snapshots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Est. Inicial</TableHead>
                      <TableHead>Compras</TableHead>
                      <TableHead>Est. Final</TableHead>
                      <TableHead>CMV Teórico</TableHead>
                      <TableHead>CMV Real</TableHead>
                      <TableHead>Divergência</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshots.map((snap) => {
                      const cfg = statusConfig[snap.status];
                      const StatusIcon = cfg.icon;
                      return (
                        <TableRow key={snap.id}>
                          <TableCell>
                            <div className="text-sm">
                              <p>{format(new Date(snap.period_start), 'dd/MM/yyyy')}</p>
                              <p className="text-muted-foreground">
                                até {format(new Date(snap.period_end), 'dd/MM/yyyy')}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(snap.initial_stock_value)}</TableCell>
                          <TableCell>{formatCurrency(snap.purchases_value)}</TableCell>
                          <TableCell>{formatCurrency(snap.final_stock_value)}</TableCell>
                          <TableCell>{formatCurrency(snap.theoretical_cmv)}</TableCell>
                          <TableCell>{formatCurrency(snap.real_cmv)}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{formatCurrency(snap.difference_value)}</p>
                              <p className="text-xs text-muted-foreground">{formatPercent(snap.difference_pct)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={cfg.variant} className="gap-1">
                              <StatusIcon className={`w-3 h-3 ${cfg.color}`} />
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => deleteSnapshot(snap.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CMVSnapshots;