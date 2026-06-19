import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts';
import { formatCurrency } from '@/utils/centralLucroCalculations';

const PALETTE = ['hsl(var(--primary))', '#22c55e', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7', '#14b8a6', '#eab308'];

const tooltipStyle = {
  backgroundColor: 'hsl(var(--background))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
};

export function CMVEvolutionChart({ data }: { data: { label: string; cmv: number }[] }) {
  if (data.length === 0) {
    return <EmptyState text="Sem snapshots de CMV no período. Gere um fechamento de estoque para visualizar a evolução." />;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
        <Line type="monotone" dataKey="cmv" stroke="hsl(var(--primary))" strokeWidth={2} dot />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PurchasesChart({ data }: { data: { label: string; total: number }[] }) {
  if (data.length === 0) return <EmptyState text="Nenhuma compra no período." />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StockByCategoryChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <EmptyState text="Sem itens em estoque para categorizar." />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TopImpactItemsChart({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return <EmptyState text="Sem dados de impacto financeiro." />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PriceGapChart({ data }: { data: { name: string; atual: number; sugerido: number }[] }) {
  if (data.length === 0) return <EmptyState text="Nenhum produto com preço abaixo do sugerido no momento." />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 100 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v.toFixed(0)}`} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="atual" name="Preço atual" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
        <Bar dataKey="sugerido" name="Preço sugerido" fill="#22c55e" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed text-center text-sm text-muted-foreground p-4">
      {text}
    </div>
  );
}
