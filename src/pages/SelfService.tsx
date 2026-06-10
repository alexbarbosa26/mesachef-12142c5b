import { useState, useMemo, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, UtensilsCrossed, Save, Eye, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePricingProducts, useTechnicalSheets } from '@/hooks/usePricingData';

interface Recipe {
  id: string;
  name: string;
  category: string;
  cost_per_kg: number;
  produced_kg: number;
  leftover_kg: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(isFinite(v) ? v : 0);
const dayOfWeek = (s: string) => {
  if (!s) return '';
  return new Date(s + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' });
};

function useTotals(recipes: Recipe[], pricePracticed: number, markup: number, actualMeals: number) {
  return useMemo(() => {
    const totalProduced = recipes.reduce((s, r) => s + (r.produced_kg || 0), 0);
    const totalCost = recipes.reduce((s, r) => s + (r.cost_per_kg || 0) * (r.produced_kg || 0), 0);
    const totalLeftoverKg = recipes.reduce((s, r) => s + (r.leftover_kg || 0), 0);
    const totalLeftoverCost = recipes.reduce((s, r) => s + (r.cost_per_kg || 0) * (r.leftover_kg || 0), 0);
    const totalConsumedKg = recipes.reduce((s, r) => s + Math.max(0, (r.produced_kg || 0) - (r.leftover_kg || 0)), 0);
    const totalConsumedCost = recipes.reduce((s, r) => s + (r.cost_per_kg || 0) * Math.max(0, (r.produced_kg || 0) - (r.leftover_kg || 0)), 0);
    const totalSales = totalConsumedKg * (pricePracticed || 0);
    const avgCostPerKg = totalProduced > 0 ? totalCost / totalProduced : 0;
    const suggestedPricePerKg = avgCostPerKg * (markup || 0);
    const cmv = totalSales > 0 ? (totalConsumedCost / totalSales) * 100 : 0;
    const result = totalSales - totalConsumedCost;
    const avgConsumptionPerPerson = actualMeals > 0 ? totalConsumedKg / actualMeals : 0;
    return { totalProduced, totalCost, totalLeftoverKg, totalLeftoverCost, totalConsumedKg, totalConsumedCost, totalSales, avgCostPerKg, suggestedPricePerKg, cmv, result, avgConsumptionPerPerson };
  }, [recipes, pricePracticed, markup, actualMeals]);
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' | 'warning' }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={'text-lg font-semibold ' + (tone === 'positive' ? 'text-green-600' : tone === 'negative' ? 'text-red-600' : tone === 'warning' ? 'text-yellow-600' : '')}>{value}</p>
    </div>
  );
}

export default function SelfService() {
  const today = new Date().toISOString().split('T')[0];
  const [tab, setTab] = useState('today');

  // Fichas técnicas disponíveis (para importar receita com custo/Kg atualizado)
  const { data: pricingProducts = [] } = usePricingProducts();
  const { data: techSheets = [] } = useTechnicalSheets();
  const sheetOptions = useMemo(() => {
    return pricingProducts
      .map((p) => {
        const sheet = techSheets.find((s) => s.product_id === p.id);
        if (!sheet || !sheet.yield_kg || sheet.yield_kg <= 0) return null;
        const cvu =
          Number(sheet.cmv || 0) +
          (Number(sheet.labor_cost_per_hour || 0) * Number(sheet.prep_time_minutes || 0)) / 60 +
          Number(sheet.packaging_cost || 0);
        const cost_per_kg = cvu / Number(sheet.yield_kg);
        return { product_id: p.id, name: p.name, cost_per_kg };
      })
      .filter((x): x is { product_id: string; name: string; cost_per_kg: number } => !!x);
  }, [pricingProducts, techSheets]);

  // ===== Daily form =====
  const [recordId, setRecordId] = useState<string | null>(null);
  const [date, setDate] = useState(today);
  const [markup, setMarkup] = useState(2.5);
  const [pricePracticed, setPricePracticed] = useState(0);
  const [notes, setNotes] = useState('');
  const [plannedMeals, setPlannedMeals] = useState(0);
  const [avgPerPersonPlanned, setAvgPerPersonPlanned] = useState(0.4);
  const [actualMeals, setActualMeals] = useState(0);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [saving, setSaving] = useState(false);

  const totals = useTotals(recipes, pricePracticed, markup, actualMeals);

  const addRecipe = () => setRecipes((r) => [...r, { id: crypto.randomUUID(), name: '', category: '', cost_per_kg: 0, produced_kg: 0, leftover_kg: 0 }]);
  const importFromSheet = (productId: string) => {
    const opt = sheetOptions.find((s) => s.product_id === productId);
    if (!opt) return;
    setRecipes((r) => [
      ...r,
      { id: crypto.randomUUID(), name: opt.name, category: '', cost_per_kg: Number(opt.cost_per_kg.toFixed(4)), produced_kg: 0, leftover_kg: 0 },
    ]);
  };
  const updateRecipe = (id: string, patch: Partial<Recipe>) => setRecipes((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRecipe = (id: string) => setRecipes((rs) => rs.filter((r) => r.id !== id));

  const resetForm = () => {
    setRecordId(null); setDate(today); setMarkup(2.5); setPricePracticed(0); setNotes('');
    setPlannedMeals(0); setAvgPerPersonPlanned(0.4); setActualMeals(0); setRecipes([]);
  };

  const loadRecord = async (id: string) => {
    const { data: rec, error } = await supabase.from('self_service_daily_records').select('*').eq('id', id).maybeSingle();
    if (error || !rec) { toast({ title: 'Erro ao carregar', variant: 'destructive' }); return; }
    const { data: items } = await supabase.from('self_service_daily_items').select('*').eq('daily_record_id', id);
    setRecordId(rec.id);
    setDate(rec.date);
    setMarkup(Number(rec.markup) || 0);
    setPricePracticed(Number(rec.practiced_kg_price) || 0);
    setNotes(rec.observations || '');
    setPlannedMeals(rec.planned_meals || 0);
    setAvgPerPersonPlanned(Number(rec.planned_average_consumption) || 0);
    setActualMeals(rec.actual_meals || 0);
    setRecipes((items || []).map((i: any) => ({
      id: i.id, name: i.recipe_name, category: i.category || '',
      cost_per_kg: Number(i.cost_per_kg) || 0, produced_kg: Number(i.produced_kg) || 0, leftover_kg: Number(i.leftover_kg) || 0,
    })));
    setTab('today');
  };

  const saveDaily = async () => {
    if (!date) { toast({ title: 'Informe a data', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = {
        date, weekday: dayOfWeek(date), markup, suggested_kg_price: totals.suggestedPricePerKg,
        practiced_kg_price: pricePracticed, observations: notes,
        planned_meals: plannedMeals, actual_meals: actualMeals,
        planned_average_consumption: avgPerPersonPlanned, actual_average_consumption: totals.avgConsumptionPerPerson,
        total_recipes: recipes.length, total_produced_kg: totals.totalProduced,
        total_consumed_kg: totals.totalConsumedKg, total_leftover_kg: totals.totalLeftoverKg,
        total_production_cost: totals.totalCost, total_leftover_value: totals.totalLeftoverCost,
        total_sales: totals.totalSales, estimated_cmv: totals.cmv, estimated_result: totals.result,
      };
      let id = recordId;
      if (id) {
        const { error } = await supabase.from('self_service_daily_records').update(payload).eq('id', id).select().maybeSingle();
        if (error) throw error;
        await supabase.from('self_service_daily_items').delete().eq('daily_record_id', id);
      } else {
        const { data, error } = await supabase.from('self_service_daily_records').upsert(payload as any, { onConflict: 'company_id,date' }).select().maybeSingle();
        if (error) throw error;
        id = data!.id;
        setRecordId(id);
      }
      if (recipes.length > 0 && id) {
        const items = recipes.map((r) => {
          const consumed = Math.max(0, r.produced_kg - r.leftover_kg);
          const prodCost = r.cost_per_kg * r.produced_kg;
          const leftCost = r.cost_per_kg * r.leftover_kg;
          const sales = consumed * pricePracticed;
          return {
            daily_record_id: id, recipe_name: r.name || 'Sem nome', category: r.category,
            cost_per_kg: r.cost_per_kg, produced_kg: r.produced_kg, production_total_cost: prodCost,
            leftover_kg: r.leftover_kg, leftover_total_value: leftCost,
            consumed_kg: consumed, total_sales: sales,
            leftover_percentage: r.produced_kg > 0 ? (r.leftover_kg / r.produced_kg) * 100 : 0,
            cost_participation_percentage: totals.totalCost > 0 ? (prodCost / totals.totalCost) * 100 : 0,
            sales_participation_percentage: totals.totalSales > 0 ? (sales / totals.totalSales) * 100 : 0,
          };
        });
        const { error: ie } = await supabase.from('self_service_daily_items').insert(items as any).select();
        if (ie) throw ie;
      }
      toast({ title: 'Fechamento salvo com sucesso' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UtensilsCrossed className="w-6 h-6" />Controle de Self-Service
            </h1>
            <p className="text-muted-foreground">Fechamento diário, histórico e dashboard estratégico</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="today">Fechamento do dia</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6">
            <div className="flex gap-2 justify-end">
              {recordId && <Button variant="outline" onClick={resetForm}>Novo</Button>}
              <Button onClick={saveDaily} disabled={saving}>
                <Save className="w-4 h-4 mr-1" />{saving ? 'Salvando...' : recordId ? 'Atualizar fechamento' : 'Salvar fechamento'}
              </Button>
            </div>

            <Card>
              <CardHeader><CardTitle>Cabeçalho do dia</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div><Label>Data</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                <div><Label>Dia da semana</Label><Input value={dayOfWeek(date)} readOnly /></div>
                <div><Label>Markup</Label><Input type="number" step="0.01" value={markup} onChange={(e) => setMarkup(parseFloat(e.target.value) || 0)} /></div>
                <div><Label>Valor Kg/Buffet sugerido</Label><Input value={fmt(totals.suggestedPricePerKg)} readOnly /></div>
                <div><Label>Valor Kg/Buffet praticado</Label><Input type="number" step="0.01" value={pricePracticed} onChange={(e) => setPricePracticed(parseFloat(e.target.value) || 0)} /></div>
                <div className="md:col-span-3"><Label>Observações</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Planejamento</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label>Total de receitas</Label><Input value={recipes.length} readOnly /></div>
                  <div><Label>Expectativa de refeições</Label><Input type="number" value={plannedMeals} onChange={(e) => setPlannedMeals(parseInt(e.target.value) || 0)} /></div>
                  <div><Label>Média planejada (Kg/pessoa)</Label><Input type="number" step="0.001" value={avgPerPersonPlanned} onChange={(e) => setAvgPerPersonPlanned(parseFloat(e.target.value) || 0)} /></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Executado</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label>Refeições no dia</Label><Input type="number" value={actualMeals} onChange={(e) => setActualMeals(parseInt(e.target.value) || 0)} /></div>
                  <div><Label>Média real (Kg/pessoa)</Label><Input value={totals.avgConsumptionPerPerson.toFixed(3)} readOnly /></div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Receitas do Buffet</CardTitle>
                <div className="flex gap-2 items-center">
                  {sheetOptions.length > 0 && (
                    <Select value="" onValueChange={(v) => importFromSheet(v)}>
                      <SelectTrigger className="w-[240px]">
                        <SelectValue placeholder="Importar de ficha técnica" />
                      </SelectTrigger>
                      <SelectContent>
                        {sheetOptions.map((o) => (
                          <SelectItem key={o.product_id} value={o.product_id}>
                            {o.name} — {fmt(o.cost_per_kg)}/Kg
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button onClick={addRecipe} size="sm"><Plus className="w-4 h-4 mr-1" />Adicionar</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[160px]">Receita</TableHead>
                        <TableHead className="text-right">Custo/Kg</TableHead>
                        <TableHead className="text-right">Produzido (Kg)</TableHead>
                        <TableHead className="text-right">Custo prod.</TableHead>
                        <TableHead className="text-right">Sobra (Kg)</TableHead>
                        <TableHead className="text-right">Sobra (R$)</TableHead>
                        <TableHead className="text-right">Consumido</TableHead>
                        <TableHead className="text-right">Vendas</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipes.length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Nenhuma receita adicionada</TableCell></TableRow>
                      ) : recipes.map((r) => {
                        const prodCost = r.cost_per_kg * r.produced_kg;
                        const leftoverCost = r.cost_per_kg * r.leftover_kg;
                        const consumed = Math.max(0, r.produced_kg - r.leftover_kg);
                        const sales = consumed * pricePracticed;
                        return (
                          <TableRow key={r.id}>
                            <TableCell><Input value={r.name} onChange={(e) => updateRecipe(r.id, { name: e.target.value })} /></TableCell>
                            <TableCell><Input className="text-right" type="number" step="0.001" value={r.cost_per_kg} onChange={(e) => updateRecipe(r.id, { cost_per_kg: parseFloat(e.target.value) || 0 })} /></TableCell>
                            <TableCell><Input className="text-right" type="number" step="0.001" value={r.produced_kg} onChange={(e) => updateRecipe(r.id, { produced_kg: parseFloat(e.target.value) || 0 })} /></TableCell>
                            <TableCell className="text-right">{fmt(prodCost)}</TableCell>
                            <TableCell><Input className="text-right" type="number" step="0.001" value={r.leftover_kg} onChange={(e) => updateRecipe(r.id, { leftover_kg: parseFloat(e.target.value) || 0 })} /></TableCell>
                            <TableCell className="text-right">{fmt(leftoverCost)}</TableCell>
                            <TableCell className="text-right">{consumed.toFixed(3)}</TableCell>
                            <TableCell className="text-right">{fmt(sales)}</TableCell>
                            <TableCell><Button variant="ghost" size="icon" onClick={() => removeRecipe(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Resumo do dia</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <Summary label="Custo médio/Kg" value={fmt(totals.avgCostPerKg)} />
                <Summary label="Produzido (Kg)" value={totals.totalProduced.toFixed(3)} />
                <Summary label="Custo produção" value={fmt(totals.totalCost)} />
                <Summary label="Sobra (Kg)" value={totals.totalLeftoverKg.toFixed(3)} />
                <Summary label="Sobra (R$)" value={fmt(totals.totalLeftoverCost)} />
                <Summary label="Consumido (Kg)" value={totals.totalConsumedKg.toFixed(3)} />
                <Summary label="Vendas" value={fmt(totals.totalSales)} />
                <Summary label="CMV" value={`${totals.cmv.toFixed(1)}%`} tone={totals.cmv > 40 ? 'warning' : undefined} />
                <Summary label="Resultado" value={fmt(totals.result)} tone={totals.result >= 0 ? 'positive' : 'negative'} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history"><HistoryTab onOpen={loadRecord} /></TabsContent>
          <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ============== HISTORY ==============
function HistoryTab({ onOpen }: { onOpen: (id: string) => void }) {
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<{ rec: any; items: any[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('self_service_daily_records').select('*').gte('date', from).lte('date', to).order('date', { ascending: false });
    setRows(data || []); setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id: string) => {
    const { data: rec } = await supabase.from('self_service_daily_records').select('*').eq('id', id).maybeSingle();
    const { data: items } = await supabase.from('self_service_daily_items').select('*').eq('daily_record_id', id);
    setDetail({ rec, items: items || [] });
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir este fechamento?')) return;
    const { error } = await supabase.from('self_service_daily_records').delete().eq('id', id);
    if (error) { toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Excluído' }); load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 flex gap-3 flex-wrap items-end">
          <div><Label>De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <Button onClick={load} disabled={loading}>{loading ? 'Carregando...' : 'Filtrar'}</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead><TableHead>Dia</TableHead><TableHead className="text-right">Refeições</TableHead>
                <TableHead className="text-right">Prod (Kg)</TableHead><TableHead className="text-right">Cons (Kg)</TableHead>
                <TableHead className="text-right">Sobra (Kg)</TableHead><TableHead className="text-right">% Sobra</TableHead>
                <TableHead className="text-right">Kg praticado</TableHead><TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">CMV</TableHead><TableHead className="text-right">Resultado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-6">Sem fechamentos no período</TableCell></TableRow>
              ) : rows.map((r) => {
                const pctLeftover = r.total_produced_kg > 0 ? (r.total_leftover_kg / r.total_produced_kg) * 100 : 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="capitalize">{r.weekday}</TableCell>
                    <TableCell className="text-right">{r.actual_meals}</TableCell>
                    <TableCell className="text-right">{Number(r.total_produced_kg).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(r.total_consumed_kg).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{Number(r.total_leftover_kg).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{pctLeftover.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{fmt(Number(r.practiced_kg_price))}</TableCell>
                    <TableCell className="text-right">{fmt(Number(r.total_sales))}</TableCell>
                    <TableCell className="text-right">{Number(r.estimated_cmv).toFixed(1)}%</TableCell>
                    <TableCell className={'text-right ' + (Number(r.estimated_result) >= 0 ? 'text-green-600' : 'text-red-600')}>{fmt(Number(r.estimated_result))}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openDetail(r.id)}><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onOpen(r.id)} title="Editar"><UtensilsCrossed className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalhes do fechamento — {detail && new Date(detail.rec.date + 'T00:00:00').toLocaleDateString('pt-BR')}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Summary label="Refeições" value={String(detail.rec.actual_meals)} />
                <Summary label="Produzido" value={`${Number(detail.rec.total_produced_kg).toFixed(2)} Kg`} />
                <Summary label="Sobra" value={`${Number(detail.rec.total_leftover_kg).toFixed(2)} Kg`} />
                <Summary label="Vendas" value={fmt(Number(detail.rec.total_sales))} />
                <Summary label="Custo" value={fmt(Number(detail.rec.total_production_cost))} />
                <Summary label="CMV" value={`${Number(detail.rec.estimated_cmv).toFixed(1)}%`} />
                <Summary label="Resultado" value={fmt(Number(detail.rec.estimated_result))} tone={Number(detail.rec.estimated_result) >= 0 ? 'positive' : 'negative'} />
                <Summary label="Kg praticado" value={fmt(Number(detail.rec.practiced_kg_price))} />
              </div>
              {detail.rec.observations && (<div className="text-sm"><strong>Obs:</strong> {detail.rec.observations}</div>)}
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Receita</TableHead><TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Prod</TableHead><TableHead className="text-right">Sobra</TableHead>
                  <TableHead className="text-right">% Sobra</TableHead><TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {detail.items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.recipe_name}</TableCell><TableCell>{i.category}</TableCell>
                      <TableCell className="text-right">{Number(i.produced_kg).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{Number(i.leftover_kg).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{Number(i.leftover_percentage).toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{fmt(Number(i.production_total_cost))}</TableCell>
                      <TableCell className="text-right">{fmt(Number(i.total_sales))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============== DASHBOARD ==============
function DashboardTab() {
  const today = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [records, setRecords] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: recs } = await supabase.from('self_service_daily_records').select('*').gte('date', from).lte('date', to).order('date');
    const ids = (recs || []).map((r: any) => r.id);
    let itemsData: any[] = [];
    if (ids.length > 0) {
      const { data } = await supabase.from('self_service_daily_items').select('*').in('daily_record_id', ids);
      itemsData = data || [];
    }
    setRecords(recs || []); setItems(itemsData); setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const k = useMemo(() => {
    const n = records.length || 1;
    const sum = (key: string) => records.reduce((s, r) => s + Number(r[key] || 0), 0);
    const totalMeals = sum('actual_meals');
    const totalProduced = sum('total_produced_kg');
    const totalConsumed = sum('total_consumed_kg');
    const totalLeftover = sum('total_leftover_kg');
    const totalCost = sum('total_production_cost');
    const totalSales = sum('total_sales');
    const totalResult = sum('estimated_result');
    const avgCMV = records.length ? records.reduce((s, r) => s + Number(r.estimated_cmv || 0), 0) / records.length : 0;
    const avgLeftoverPct = totalProduced > 0 ? (totalLeftover / totalProduced) * 100 : 0;
    const ticket = totalMeals > 0 ? totalSales / totalMeals : 0;
    const consPerPerson = totalMeals > 0 ? totalConsumed / totalMeals : 0;
    const avgKgPracticed = records.length ? records.reduce((s, r) => s + Number(r.practiced_kg_price || 0), 0) / records.length : 0;
    const avgKgSuggested = records.length ? records.reduce((s, r) => s + Number(r.suggested_kg_price || 0), 0) / records.length : 0;
    return { totalMeals, avgMeals: totalMeals / n, totalProduced, totalConsumed, totalLeftover, avgLeftoverPct, totalCost, totalSales, avgCMV, totalResult, ticket, consPerPerson, avgKgPracticed, avgKgSuggested, days: records.length };
  }, [records]);

  // Rankings
  const aggByRecipe = useMemo(() => {
    const map = new Map<string, any>();
    items.forEach((i) => {
      const key = i.recipe_name;
      const cur = map.get(key) || { name: key, leftover_kg: 0, leftover_value: 0, consumed_kg: 0, cost: 0, sales: 0 };
      cur.leftover_kg += Number(i.leftover_kg || 0);
      cur.leftover_value += Number(i.leftover_total_value || 0);
      cur.consumed_kg += Number(i.consumed_kg || 0);
      cur.cost += Number(i.production_total_cost || 0);
      cur.sales += Number(i.total_sales || 0);
      map.set(key, cur);
    });
    return Array.from(map.values());
  }, [items]);

  const top = (key: string, n = 5) => [...aggByRecipe].sort((a, b) => b[key] - a[key]).slice(0, n);
  const bestDay = useMemo(() => records.length ? [...records].sort((a, b) => Number(b.estimated_result) - Number(a.estimated_result))[0] : null, [records]);
  const worstDay = useMemo(() => {
    return records.length ? [...records].sort((a, b) => {
      const pa = Number(a.total_produced_kg) > 0 ? Number(a.total_leftover_kg) / Number(a.total_produced_kg) : 0;
      const pb = Number(b.total_produced_kg) > 0 ? Number(b.total_leftover_kg) / Number(b.total_produced_kg) : 0;
      return pb - pa;
    })[0] : null;
  }, [records]);

  const alerts: { tone: 'warning' | 'negative' | 'positive'; msg: string }[] = [];
  if (k.avgLeftoverPct > 10) alerts.push({ tone: 'warning', msg: `Sobra média do período está alta (${k.avgLeftoverPct.toFixed(1)}%).` });
  if (k.avgCMV > 40) alerts.push({ tone: 'negative', msg: `CMV médio acima do recomendado (${k.avgCMV.toFixed(1)}%).` });
  if (k.avgKgPracticed && k.avgKgSuggested && k.avgKgPracticed < k.avgKgSuggested) alerts.push({ tone: 'warning', msg: `Preço Kg praticado (${fmt(k.avgKgPracticed)}) está abaixo do sugerido (${fmt(k.avgKgSuggested)}).` });
  if (bestDay) alerts.push({ tone: 'positive', msg: `Melhor resultado em ${new Date(bestDay.date + 'T00:00:00').toLocaleDateString('pt-BR')}: ${fmt(Number(bestDay.estimated_result))}.` });
  if (worstDay && Number(worstDay.total_produced_kg) > 0) {
    const pct = (Number(worstDay.total_leftover_kg) / Number(worstDay.total_produced_kg)) * 100;
    if (pct > 5) alerts.push({ tone: 'warning', msg: `Maior desperdício em ${new Date(worstDay.date + 'T00:00:00').toLocaleDateString('pt-BR')}: ${pct.toFixed(1)}% de sobra.` });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 flex gap-3 flex-wrap items-end">
          <div><Label>De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <Button onClick={load} disabled={loading}>{loading ? 'Carregando...' : 'Atualizar'}</Button>
          <div className="ml-auto text-sm text-muted-foreground">{k.days} fechamento(s) no período</div>
        </CardContent>
      </Card>

      {alerts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Alertas e insights</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={'rounded-md border p-3 text-sm ' + (a.tone === 'positive' ? 'border-green-500/40 bg-green-500/5' : a.tone === 'negative' ? 'border-red-500/40 bg-red-500/5' : 'border-yellow-500/40 bg-yellow-500/5')}>
                {a.msg}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Indicadores do período</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Summary label="Refeições" value={String(k.totalMeals)} />
          <Summary label="Média/dia" value={k.avgMeals.toFixed(1)} />
          <Summary label="Produzido" value={`${k.totalProduced.toFixed(2)} Kg`} />
          <Summary label="Consumido" value={`${k.totalConsumed.toFixed(2)} Kg`} />
          <Summary label="Sobra" value={`${k.totalLeftover.toFixed(2)} Kg`} />
          <Summary label="% Sobra média" value={`${k.avgLeftoverPct.toFixed(1)}%`} tone={k.avgLeftoverPct > 10 ? 'warning' : undefined} />
          <Summary label="Custo produção" value={fmt(k.totalCost)} />
          <Summary label="Vendas" value={fmt(k.totalSales)} />
          <Summary label="CMV médio" value={`${k.avgCMV.toFixed(1)}%`} tone={k.avgCMV > 40 ? 'warning' : undefined} />
          <Summary label="Resultado" value={fmt(k.totalResult)} tone={k.totalResult >= 0 ? 'positive' : 'negative'} />
          <Summary label="Ticket médio" value={fmt(k.ticket)} />
          <Summary label="Cons. médio/pessoa" value={`${k.consPerPerson.toFixed(3)} Kg`} />
          <Summary label="Kg praticado médio" value={fmt(k.avgKgPracticed)} />
          <Summary label="Kg sugerido médio" value={fmt(k.avgKgSuggested)} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <RankCard title="Maior sobra (Kg)" icon={<TrendingDown className="w-4 h-4" />} rows={top('leftover_kg')} valueKey="leftover_kg" suffix=" Kg" />
        <RankCard title="Maior sobra (R$)" icon={<TrendingDown className="w-4 h-4" />} rows={top('leftover_value')} valueKey="leftover_value" money />
        <RankCard title="Mais consumidas (Kg)" icon={<TrendingUp className="w-4 h-4" />} rows={top('consumed_kg')} valueKey="consumed_kg" suffix=" Kg" />
        <RankCard title="Maior custo total" icon={<TrendingUp className="w-4 h-4" />} rows={top('cost')} valueKey="cost" money />
        <RankCard title="Maior contribuição em vendas" icon={<TrendingUp className="w-4 h-4" />} rows={top('sales')} valueKey="sales" money />
      </div>
    </div>
  );
}

function RankCard({ title, icon, rows, valueKey, money, suffix }: { title: string; icon: any; rows: any[]; valueKey: string; money?: boolean; suffix?: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2">{icon}{title}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados</p> : (
          <ul className="space-y-1 text-sm">
            {rows.map((r, i) => (
              <li key={i} className="flex justify-between border-b py-1 last:border-0">
                <span>{i + 1}. {r.name || '—'}</span>
                <span className="font-medium">{money ? fmt(r[valueKey]) : `${Number(r[valueKey]).toFixed(2)}${suffix || ''}`}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
