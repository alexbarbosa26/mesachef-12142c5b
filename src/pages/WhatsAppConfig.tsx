import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { AdminOnlyGuard } from '@/components/pricing/AdminOnlyGuard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageCircle, Save, Send, Plus, X, ShieldCheck, AlertCircle } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';

interface WhatsAppConfig {
  id?: string;
  enabled: boolean;
  recipients: string[];
  schedule_time: string;
  frequency: string;
  only_low_stock: boolean;
  include_all_monitored: boolean;
  send_when_healthy: boolean;
  interval_minutes: number | null;
  days_of_week: number[];
  day_of_month: number | null;
}

const DEFAULT_CONFIG: WhatsAppConfig = {
  enabled: false,
  recipients: [],
  schedule_time: '08:00',
  frequency: 'daily',
  only_low_stock: true,
  include_all_monitored: false,
  send_when_healthy: false,
  interval_minutes: 60,
  days_of_week: [1, 2, 3, 4, 5],
  day_of_month: 1,
};

const WEEKDAYS = [
  { v: 0, l: 'Dom' },
  { v: 1, l: 'Seg' },
  { v: 2, l: 'Ter' },
  { v: 3, l: 'Qua' },
  { v: 4, l: 'Qui' },
  { v: 5, l: 'Sex' },
  { v: 6, l: 'Sáb' },
];

export default function WhatsAppConfigPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<WhatsAppConfig>(DEFAULT_CONFIG);
  const [globalEnabled, setGlobalEnabled] = useState(false);
  const [globalConfigured, setGlobalConfigured] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  const [testNumber, setTestNumber] = useState('');
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('whatsapp_config')
      .select('*')
      .maybeSingle();
    if (error) {
      console.error(error);
    }
    if (data) {
      setConfig({
        id: data.id,
        enabled: data.enabled,
        recipients: data.recipients ?? [],
        schedule_time: (data.schedule_time ?? '08:00').slice(0, 5),
        frequency: data.frequency ?? 'daily',
        only_low_stock: data.only_low_stock,
        include_all_monitored: data.include_all_monitored,
        send_when_healthy: data.send_when_healthy,
        interval_minutes: data.interval_minutes ?? 60,
        days_of_week: data.days_of_week ?? [1, 2, 3, 4, 5],
        day_of_month: data.day_of_month ?? 1,
      });
    }
    const { data: status } = await supabase.functions.invoke('whatsapp-manager', {
      body: { action: 'get_status' },
    });
    setGlobalEnabled(!!(status as any)?.global_enabled);
    setGlobalConfigured(!!(status as any)?.global_configured);
    setLoading(false);
  }

  async function saveConfig() {
    setSaving(true);
    const payload = {
      enabled: config.enabled,
      recipients: config.recipients,
      schedule_time: config.schedule_time,
      frequency: config.frequency,
      only_low_stock: config.only_low_stock,
      include_all_monitored: config.include_all_monitored,
      send_when_healthy: config.send_when_healthy,
      interval_minutes: config.frequency === 'interval' ? config.interval_minutes : null,
      days_of_week: config.frequency === 'weekly' ? config.days_of_week : [],
      day_of_month: config.frequency === 'monthly' ? config.day_of_month : null,
    };
    let error;
    if (config.id) {
      ({ error } = await (supabase as any)
        .from('whatsapp_config')
        .update(payload)
        .eq('id', config.id)
        .select());
    } else {
      const res = await (supabase as any)
        .from('whatsapp_config')
        .insert(payload)
        .select()
        .single();
      error = res.error;
      if (res.data) setConfig((c) => ({ ...c, id: res.data.id }));
    }
    setSaving(false);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar configuração.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Configuração salva' });
  }

  async function testSend() {
    if (!testNumber.trim()) {
      toast({ title: 'Informe um número', variant: 'destructive' });
      return;
    }
    setTesting(true);
    const { data, error } = await supabase.functions.invoke('whatsapp-manager', {
      body: { action: 'test_send', test_number: testNumber.trim() },
    });
    setTesting(false);
    if (error || (data as any)?.error) {
      toast({ title: 'Erro', description: (data as any)?.error ?? 'Falha no teste.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Mensagem de teste enviada!' });
  }

  async function sendNow() {
    setSending(true);
    const { data, error } = await supabase.functions.invoke('whatsapp-manager', {
      body: { action: 'send_report' },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast({ title: 'Erro', description: (data as any)?.error ?? 'Falha ao enviar relatório.', variant: 'destructive' });
      return;
    }
    const d = data as any;
    if (d?.skipped) {
      toast({ title: 'Envio ignorado', description: d.reason });
    } else {
      toast({
        title: 'Relatório enviado',
        description: `Enviados: ${d?.sent ?? 0} | Falhas: ${d?.failures ?? 0}`,
      });
    }
  }

  function addRecipient() {
    const n = newRecipient.replace(/\D/g, '');
    if (n.length < 8) {
      toast({ title: 'Número inválido', variant: 'destructive' });
      return;
    }
    if (config.recipients.includes(n)) return;
    setConfig((c) => ({ ...c, recipients: [...c.recipients, n] }));
    setNewRecipient('');
  }

  function removeRecipient(n: string) {
    setConfig((c) => ({ ...c, recipients: c.recipients.filter((r) => r !== n) }));
  }

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AdminOnlyGuard>
        <div className="max-w-4xl mx-auto space-y-6 p-4">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">WhatsApp - Alertas de Estoque</h1>
              <p className="text-sm text-muted-foreground">
                Preferências de envio dos alertas. A integração Evolution GO é gerenciada globalmente pelo superadmin.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> Integração Evolution GO
              </CardTitle>
              <CardDescription>
                URL, instância e API Key são configuradas pelo superadmin e usadas por todas as empresas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                {globalEnabled && globalConfigured ? (
                  <Badge variant="default" className="gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Integração ativa
                  </Badge>
                ) : globalConfigured ? (
                  <Badge variant="secondary" className="gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Configurada mas desativada
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Não configurada pelo superadmin
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Suas preferências abaixo (destinatários, horários, frequência) só serão enviadas quando a integração global estiver ativa.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurações da Integração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Alertas por WhatsApp</Label>
                  <p className="text-xs text-muted-foreground">Ativar/desativar envio de alertas.</p>
                </div>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(v) => setConfig((c) => ({ ...c, enabled: v }))}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Frequência</Label>
                  <Select
                    value={config.frequency}
                    onValueChange={(v) => setConfig((c) => ({ ...c, frequency: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interval">A cada X minutos</SelectItem>
                      <SelectItem value="hourly">A cada hora</SelectItem>
                      <SelectItem value="daily">Diariamente</SelectItem>
                      <SelectItem value="weekly">Semanal (dias da semana)</SelectItem>
                      <SelectItem value="monthly">Mensal (dia do mês)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.frequency === 'interval' && (
                  <div>
                    <Label>Intervalo (minutos)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={10080}
                      step={5}
                      value={config.interval_minutes ?? 60}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, interval_minutes: Math.max(5, parseInt(e.target.value || '0')) }))
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">Mínimo 5 minutos. O cron roda a cada 5 min.</p>
                  </div>
                )}

                {config.frequency === 'hourly' && (
                  <div>
                    <Label>Minuto da hora (00-59)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      value={parseInt((config.schedule_time || '08:00').split(':')[1] || '0')}
                      onChange={(e) => {
                        const m = Math.min(59, Math.max(0, parseInt(e.target.value || '0')));
                        setConfig((c) => ({ ...c, schedule_time: `00:${String(m).padStart(2, '0')}` }));
                      }}
                    />
                  </div>
                )}

                {(config.frequency === 'daily' ||
                  config.frequency === 'weekly' ||
                  config.frequency === 'monthly') && (
                  <div>
                    <Label>Horário do envio</Label>
                    <Input
                      type="time"
                      value={config.schedule_time}
                      onChange={(e) => setConfig((c) => ({ ...c, schedule_time: e.target.value }))}
                    />
                  </div>
                )}

                {config.frequency === 'monthly' && (
                  <div>
                    <Label>Dia do mês (1-31)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={config.day_of_month ?? 1}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          day_of_month: Math.min(31, Math.max(1, parseInt(e.target.value || '1'))),
                        }))
                      }
                    />
                  </div>
                )}
              </div>

              {config.frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label>Dias da semana</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((d) => {
                      const active = config.days_of_week.includes(d.v);
                      return (
                        <button
                          type="button"
                          key={d.v}
                          onClick={() =>
                            setConfig((c) => ({
                              ...c,
                              days_of_week: active
                                ? c.days_of_week.filter((x) => x !== d.v)
                                : [...c.days_of_week, d.v].sort(),
                            }))
                          }
                          className={`px-3 py-1.5 rounded-md border text-sm transition ${
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-muted'
                          }`}
                        >
                          {d.l}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Números que receberão o alerta</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: 5511999998888 (com DDI e DDD)"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
                  />
                  <Button type="button" onClick={addRecipient}>
                    <Plus className="w-4 h-4 mr-1" /> Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {config.recipients.length === 0 && (
                    <span className="text-xs text-muted-foreground">Nenhum número adicionado.</span>
                  )}
                  {config.recipients.map((n) => (
                    <Badge key={n} variant="secondary" className="gap-1">
                      {n}
                      <button
                        type="button"
                        onClick={() => removeRecipient(n)}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enviar apenas itens baixos/zerados</Label>
                    <p className="text-xs text-muted-foreground">Recomendado.</p>
                  </div>
                  <Switch
                    checked={config.only_low_stock}
                    onCheckedChange={(v) =>
                      setConfig((c) => ({ ...c, only_low_stock: v, include_all_monitored: v ? false : c.include_all_monitored }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Incluir todos os itens monitorados</Label>
                    <p className="text-xs text-muted-foreground">Relatório completo.</p>
                  </div>
                  <Switch
                    checked={config.include_all_monitored}
                    onCheckedChange={(v) =>
                      setConfig((c) => ({ ...c, include_all_monitored: v, only_low_stock: v ? false : c.only_low_stock }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enviar mesmo sem alertas</Label>
                    <p className="text-xs text-muted-foreground">Mensagem de "estoque saudável".</p>
                  </div>
                  <Switch
                    checked={config.send_when_healthy}
                    onCheckedChange={(v) => setConfig((c) => ({ ...c, send_when_healthy: v }))}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveConfig} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar configuração
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Testes e envio manual</CardTitle>
              <CardDescription>
                Requer que o superadmin tenha ativado a integração global da Evolution GO.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-[1fr_auto] gap-2 items-end">
                <div>
                  <Label>Número para teste</Label>
                  <Input
                    placeholder="5511999998888"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                  />
                </div>
                <Button onClick={testSend} disabled={testing || !globalEnabled || !globalConfigured} variant="outline">
                  {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Enviar teste
                </Button>
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  Gerar relatório de estoque agora e enviar para todos os destinatários cadastrados.
                </p>
                <Button onClick={sendNow} disabled={sending || !globalEnabled || !globalConfigured || config.recipients.length === 0}>
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Enviar relatório agora
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminOnlyGuard>
    </DashboardLayout>
  );
}