import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, UtensilsCrossed } from 'lucide-react';

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

const dayOfWeek = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'long' });
};

export default function SelfService() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [markup, setMarkup] = useState<number>(2.5);
  const [pricePracticed, setPricePracticed] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [plannedMeals, setPlannedMeals] = useState<number>(0);
  const [avgPerPersonPlanned, setAvgPerPersonPlanned] = useState<number>(0.4);
  const [actualMeals, setActualMeals] = useState<number>(0);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const addRecipe = () => {
    setRecipes((r) => [
      ...r,
      { id: crypto.randomUUID(), name: '', category: '', cost_per_kg: 0, produced_kg: 0, leftover_kg: 0 },
    ]);
  };

  const updateRecipe = (id: string, patch: Partial<Recipe>) => {
    setRecipes((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRecipe = (id: string) => setRecipes((rs) => rs.filter((r) => r.id !== id));

  const totals = useMemo(() => {
    const totalProduced = recipes.reduce((s, r) => s + (r.produced_kg || 0), 0);
    const totalCost = recipes.reduce((s, r) => s + (r.cost_per_kg || 0) * (r.produced_kg || 0), 0);
    const totalLeftoverKg = recipes.reduce((s, r) => s + (r.leftover_kg || 0), 0);
    const totalLeftoverCost = recipes.reduce((s, r) => s + (r.cost_per_kg || 0) * (r.leftover_kg || 0), 0);
    const totalConsumedKg = recipes.reduce(
      (s, r) => s + Math.max(0, (r.produced_kg || 0) - (r.leftover_kg || 0)),
      0,
    );
    const totalConsumedCost = recipes.reduce(
      (s, r) => s + (r.cost_per_kg || 0) * Math.max(0, (r.produced_kg || 0) - (r.leftover_kg || 0)),
      0,
    );
    const totalSales = totalConsumedKg * (pricePracticed || 0);
    const avgCostPerKg = totalProduced > 0 ? totalCost / totalProduced : 0;
    const suggestedPricePerKg = avgCostPerKg * (markup || 0);
    const cmv = totalSales > 0 ? (totalConsumedCost / totalSales) * 100 : 0;
    const result = totalSales - totalCost;
    const avgConsumptionPerPerson = actualMeals > 0 ? totalConsumedKg / actualMeals : 0;
    return {
      totalProduced, totalCost, totalLeftoverKg, totalLeftoverCost,
      totalConsumedKg, totalConsumedCost, totalSales, avgCostPerKg,
      suggestedPricePerKg, cmv, result, avgConsumptionPerPerson,
    };
  }, [recipes, pricePracticed, markup, actualMeals]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6" />
            Controle de Self-Service
          </h1>
          <p className="text-muted-foreground">Planejamento, produção, sobra, consumo e resultado do buffet</p>
        </div>

        {/* Cabeçalho */}
        <Card>
          <CardHeader><CardTitle>Cabeçalho do dia</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Dia da semana</Label>
              <Input value={dayOfWeek(date)} readOnly />
            </div>
            <div>
              <Label>Markup</Label>
              <Input type="number" step="0.01" value={markup}
                onChange={(e) => setMarkup(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Valor Kg/Buffet sugerido</Label>
              <Input value={fmt(totals.suggestedPricePerKg)} readOnly />
            </div>
            <div>
              <Label>Valor Kg/Buffet praticado</Label>
              <Input type="number" step="0.01" value={pricePracticed}
                onChange={(e) => setPricePracticed(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="md:col-span-3">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Planejamento + Executado */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Planejamento</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Total de receitas do cardápio</Label>
                <Input value={recipes.length} readOnly />
              </div>
              <div>
                <Label>Expectativa de refeições no dia</Label>
                <Input type="number" value={plannedMeals}
                  onChange={(e) => setPlannedMeals(parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Média de consumo por pessoa (Kg)</Label>
                <Input type="number" step="0.001" value={avgPerPersonPlanned}
                  onChange={(e) => setAvgPerPersonPlanned(parseFloat(e.target.value) || 0)} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Executado</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Refeições no dia</Label>
                <Input type="number" value={actualMeals}
                  onChange={(e) => setActualMeals(parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Média de consumo por pessoa (Kg)</Label>
                <Input value={totals.avgConsumptionPerPerson.toFixed(3)} readOnly />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Receitas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Receitas do Buffet</CardTitle>
            <Button onClick={addRecipe} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Adicionar receita
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Receita</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Custo/Kg (R$)</TableHead>
                    <TableHead className="text-right">Produzido (Kg)</TableHead>
                    <TableHead className="text-right">Custo produção</TableHead>
                    <TableHead className="text-right">Sobra (Kg)</TableHead>
                    <TableHead className="text-right">Sobra (R$)</TableHead>
                    <TableHead className="text-right">Consumido (Kg)</TableHead>
                    <TableHead className="text-right">Vendas (R$)</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                        Nenhuma receita adicionada
                      </TableCell>
                    </TableRow>
                  ) : recipes.map((r) => {
                    const prodCost = r.cost_per_kg * r.produced_kg;
                    const leftoverCost = r.cost_per_kg * r.leftover_kg;
                    const consumed = Math.max(0, r.produced_kg - r.leftover_kg);
                    const sales = consumed * pricePracticed;
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Input value={r.name} onChange={(e) => updateRecipe(r.id, { name: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Input value={r.category} onChange={(e) => updateRecipe(r.id, { category: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Input className="text-right" type="number" step="0.001" value={r.cost_per_kg}
                            onChange={(e) => updateRecipe(r.id, { cost_per_kg: parseFloat(e.target.value) || 0 })} />
                        </TableCell>
                        <TableCell>
                          <Input className="text-right" type="number" step="0.001" value={r.produced_kg}
                            onChange={(e) => updateRecipe(r.id, { produced_kg: parseFloat(e.target.value) || 0 })} />
                        </TableCell>
                        <TableCell className="text-right">{fmt(prodCost)}</TableCell>
                        <TableCell>
                          <Input className="text-right" type="number" step="0.001" value={r.leftover_kg}
                            onChange={(e) => updateRecipe(r.id, { leftover_kg: parseFloat(e.target.value) || 0 })} />
                        </TableCell>
                        <TableCell className="text-right">{fmt(leftoverCost)}</TableCell>
                        <TableCell className="text-right">{consumed.toFixed(3)}</TableCell>
                        <TableCell className="text-right">{fmt(sales)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeRecipe(r.id)}>
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

        {/* Resumo */}
        <Card>
          <CardHeader><CardTitle>Resumo do dia</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Summary label="Custo médio por Kg" value={fmt(totals.avgCostPerKg)} />
            <Summary label="Total produzido (Kg)" value={totals.totalProduced.toFixed(3)} />
            <Summary label="Total custo de produção" value={fmt(totals.totalCost)} />
            <Summary label="Total sobra (Kg)" value={totals.totalLeftoverKg.toFixed(3)} />
            <Summary label="Total sobra (R$)" value={fmt(totals.totalLeftoverCost)} />
            <Summary label="Total consumido (Kg)" value={totals.totalConsumedKg.toFixed(3)} />
            <Summary label="Total de vendas" value={fmt(totals.totalSales)} />
            <Summary label="CMV estimado" value={`${totals.cmv.toFixed(1)}%`} />
            <Summary label="Resultado estimado"
              value={fmt(totals.result)}
              tone={totals.result >= 0 ? 'positive' : 'negative'} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={
        'text-lg font-semibold ' +
        (tone === 'positive' ? 'text-green-600' : tone === 'negative' ? 'text-red-600' : '')
      }>{value}</p>
    </div>
  );
}