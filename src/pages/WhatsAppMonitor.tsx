import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, MessageCircle, XCircle } from 'lucide-react';

interface LogRow {
  id: string;
  company_id: string;
  send_type: string;
  origin: string;
  status: 'success' | 'failure';
  destination_masked: string | null;
  instance_name: string | null;
  error_code: string | null;
  error_message: string | null;
  attempts: number;
  response_time_ms: number | null;
  attempted_at: string;
}

const DEFAULT_DAYS = 7;

export default function WhatsAppMonitor() {
  const { isSuperadmin, loading } = useAuth() as any;
  const [days, setDays] = useState<number>(DEFAULT_DAYS);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  const since = useMemo(
    () => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
    [days],
  );

  const { data: companies } = useQuery({
    queryKey: ['monitor-companies'],
    enabled: !!isSuperadmin,
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('id, name').order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ['wa-logs', since, statusFilter, typeFilter, originFilter, companyFilter],
    enabled: !!isSuperadmin,
    queryFn: async () => {
      let q = supabase
        .from('whatsapp_send_logs')
        .select('*')
        .gte('attempted_at', since)
        .order('attempted_at', { ascending: false })
        .limit(500);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      if (typeFilter !== 'all') q = q.eq('send_type', typeFilter);
      if (originFilter !== 'all') q = q.eq('origin', originFilter);
      if (companyFilter !== 'all') q = q.eq('company_id', companyFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
  });

  const companyName = useMemo(() => {
    const m = new Map<string, string>();
    (companies ?? []).forEach((c) => m.set(c.id, c.name));
    return (id: string) => m.get(id) ?? id.slice(0, 8);
  }, [companies]);

  const stats = useMemo(() => {
    const rows = logs ?? [];
    const total = rows.length;
    const success = rows.filter((r) => r.status === 'success').length;
    const failure = total - success;
    const successRate = total ? (success / total) * 100 : 0;
    const failureRate = total ? (failure / total) * 100 : 0;
    const failedTenants = new Set(rows.filter((r) => r.status === 'failure').map((r) => r.company_id));
    const lastSend = rows[0];
    const lastFailure = rows.find((r) => r.status === 'failure');

    // Consecutive failures: per company, count from most recent backwards until a success appears
    const byCompany = new Map<string, LogRow[]>();
    rows.forEach((r) => {
      const arr = byCompany.get(r.company_id) ?? [];
      arr.push(r);
      byCompany.set(r.company_id, arr);
    });
    const consecutive: Array<{
      company_id: string;
      count: number;
      last_failure: LogRow;
      status: 'normal' | 'atencao' | 'falha-recorrente' | 'normalizado';
    }> = [];
    byCompany.forEach((rs, cid) => {
      let count = 0;
      let lastFail: LogRow | undefined;
      for (const r of rs) {
        if (r.status === 'failure') {
          count++;
          if (!lastFail) lastFail = r;
        } else break;
      }
      if (lastFail) {
        const status =
          count >= 3 ? 'falha-recorrente' : count >= 2 ? 'atencao' : 'normal';
        consecutive.push({ company_id: cid, count, last_failure: lastFail, status });
      } else if (rs[0]?.status === 'success' && rs.some((r) => r.status === 'failure')) {
        consecutive.push({
          company_id: cid,
          count: 0,
          last_failure: rs.find((r) => r.status === 'failure')!,
          status: 'normalizado',
        });
      }
    });
    consecutive.sort((a, b) => b.count - a.count);

    // Top tenants by failures
    const failCounts = new Map<string, number>();
    rows.filter((r) => r.status === 'failure').forEach((r) =>
      failCounts.set(r.company_id, (failCounts.get(r.company_id) ?? 0) + 1),
    );
    const topFailures = Array.from(failCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      total, success, failure, successRate, failureRate,
      failedTenants: failedTenants.size, lastSend, lastFailure,
      consecutive, topFailures,
      alerts: consecutive.filter((c) => c.status === 'falha-recorrente'),
    };
  }, [logs]);

  if (loading) return null;
  if (!isSuperadmin) return <Navigate to="/dashboard" replace />;

  const fmt = (d: string) =>
    new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const statusBadge = (s: string) => (
    <Badge variant={s === 'success' ? 'default' : 'destructive'} className="text-xs">
      {s === 'success' ? 'Sucesso' : 'Falha'}
    </Badge>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageCircle className="w-7 h-7" />
            Monitoramento WhatsApp
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão técnica dos envios por tenant. Nenhum conteúdo de mensagem é armazenado.
          </p>
        </div>

        {stats.alerts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Falhas consecutivas detectadas</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 space-y-1 text-sm">
                {stats.alerts.map((a) => (
                  <li key={a.company_id}>
                    <strong>{companyName(a.company_id)}</strong>: {a.count} falhas seguidas — última em {fmt(a.last_failure.attempted_at)}
                    {a.last_failure.send_type && <> ({a.last_failure.send_type})</>}
                    {a.last_failure.error_message && <> — {a.last_failure.error_message.slice(0, 120)}</>}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Período (dias)</Label>
              <Input type="number" min={1} max={90} value={days} onChange={(e) => setDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))} />
            </div>
            <div>
              <Label className="text-xs">Tenant</Label>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(companies ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="failure">Falha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="stock_alert">Alerta de estoque</SelectItem>
                  <SelectItem value="healthy_report">Relatório saudável</SelectItem>
                  <SelectItem value="test">Teste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Origem</Label>
              <Select value={originFilter} onValueChange={setOriginFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="schedule">Agendamento</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total enviado</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{stats.total}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" />Sucesso</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-green-600">{stats.success}<span className="text-sm text-muted-foreground ml-2">{stats.successRate.toFixed(1)}%</span></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><XCircle className="w-4 h-4 text-red-500" />Falhas</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold text-red-600">{stats.failure}<span className="text-sm text-muted-foreground ml-2">{stats.failureRate.toFixed(1)}%</span></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Tenants com falha</CardTitle></CardHeader>
            <CardContent className="text-2xl font-bold">{stats.failedTenants}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Último envio</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {stats.lastSend ? (
                <>
                  <div>{fmt(stats.lastSend.attempted_at)}</div>
                  <div className="text-muted-foreground">{companyName(stats.lastSend.company_id)}</div>
                </>
              ) : '—'}
            </CardContent></Card>
        </div>

        {/* Top falhas por tenant */}
        {stats.topFailures.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Tenants com mais falhas</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Tenant</TableHead><TableHead className="text-right">Falhas</TableHead></TableRow></TableHeader>
                <TableBody>
                  {stats.topFailures.map(([cid, n]) => (
                    <TableRow key={cid}>
                      <TableCell>{companyName(cid)}</TableCell>
                      <TableCell className="text-right font-medium text-red-600">{n}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Tabela de detalhes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Últimos envios</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            {isLoading ? (
              <Skeleton className="h-48" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/hora</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Erro</TableHead>
                    <TableHead className="text-right">Tent.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(logs ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">{fmt(r.attempted_at)}</TableCell>
                      <TableCell>{companyName(r.company_id)}</TableCell>
                      <TableCell>{r.send_type}</TableCell>
                      <TableCell>{r.origin}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="font-mono text-xs">{r.destination_masked ?? '—'}</TableCell>
                      <TableCell className="text-xs">
                        {r.error_code && <Badge variant="outline" className="mr-1">{r.error_code}</Badge>}
                        {r.error_message ? <span className="text-muted-foreground">{r.error_message.slice(0, 80)}</span> : '—'}
                      </TableCell>
                      <TableCell className="text-right">{r.attempts}</TableCell>
                    </TableRow>
                  ))}
                  {(logs ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum envio no período.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}