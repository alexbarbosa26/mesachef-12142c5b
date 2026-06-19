import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Send, ShieldCheck, AlertCircle, Globe2 } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';

interface GlobalCfg {
  enabled: boolean;
  base_url: string;
  instance: string;
  has_api_key: boolean;
  updated_at: string | null;
}

export default function WhatsAppGlobalConfigPage() {
  const { isSuperadmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [testNumber, setTestNumber] = useState('');
  const [cfg, setCfg] = useState<GlobalCfg>({
    enabled: false, base_url: '', instance: '', has_api_key: false, updated_at: null,
  });

  useEffect(() => { if (isSuperadmin) load(); }, [isSuperadmin]);

  async function extractError(error: any, data: any, fallback: string): Promise<string> {
    // Prefer error returned in the JSON body (200 with { error })
    if (data && typeof data === 'object' && (data as any).error) {
      return String((data as any).error);
    }
    // FunctionsHttpError: try to read the response body for the real message
    try {
      const ctx = error?.context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.error) return String(body.error);
        if (body?.message) return String(body.message);
      } else if (ctx && typeof ctx.text === 'function') {
        const txt = await ctx.text();
        if (txt) return txt.slice(0, 300);
      }
    } catch {
      // ignore
    }
    if (error?.message) return String(error.message);
    return fallback;
  }

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('whatsapp-manager', {
      body: { action: 'get_global_config' },
    });
    setLoading(false);
    if (error || (data as any)?.error) {
      const description = await extractError(error, data, 'Falha ao carregar.');
      console.error('whatsapp-manager get_global_config:', description, error);
      toast({ title: 'Erro ao carregar configuração global', description, variant: 'destructive' });
      return;
    }
    const d = data as any;
    setCfg({
      enabled: !!d.enabled,
      base_url: d.base_url ?? '',
      instance: d.instance ?? '',
      has_api_key: !!d.has_api_key,
      updated_at: d.updated_at ?? null,
    });
  }

  async function save() {
    setSaving(true);
    const payload: any = {
      action: 'save_global_config',
      global: {
        enabled: cfg.enabled,
        base_url: cfg.base_url.trim(),
        instance: cfg.instance.trim(),
      },
    };
    if (apiKey.trim()) payload.global.api_key = apiKey.trim();
    const { data, error } = await supabase.functions.invoke('whatsapp-manager', { body: payload });
    setSaving(false);
    if (error || (data as any)?.error) {
      const description = await extractError(error, data, 'Falha ao salvar.');
      console.error('whatsapp-manager save_global_config:', description, error);
      toast({ title: 'Erro ao salvar', description, variant: 'destructive' });
      return;
    }
    setApiKey('');
    toast({ title: 'Configuração global salva' });
    load();
  }

  async function test() {
    if (!testNumber.trim()) {
      toast({ title: 'Informe um número', variant: 'destructive' });
      return;
    }
    setTesting(true);
    const { data, error } = await supabase.functions.invoke('whatsapp-manager', {
      body: { action: 'test_global', test_number: testNumber.trim() },
    });
    setTesting(false);
    if (error || (data as any)?.error) {
      const description = await extractError(error, data, 'Erro no envio.');
      console.error('whatsapp-manager test_global:', description, error);
      toast({ title: 'Falha no teste', description, variant: 'destructive' });
      return;
    }
    toast({ title: 'Mensagem de teste enviada!' });
  }

  if (authLoading) return null;
  if (!isSuperadmin) return <Navigate to="/dashboard" replace />;
  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>;

  const ready = cfg.base_url && cfg.instance && cfg.has_api_key;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 p-4">
        <div className="flex items-center gap-3">
          <Globe2 className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Evolution GO — Configuração Global</h1>
            <p className="text-sm text-muted-foreground">
              Credenciais únicas usadas por todas as empresas. Apenas superadmin pode visualizar e alterar.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> Status
            </CardTitle>
            <CardDescription>
              {cfg.updated_at
                ? `Última atualização: ${new Date(cfg.updated_at).toLocaleString('pt-BR')}`
                : 'Nunca configurada.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant={cfg.enabled ? 'default' : 'secondary'}>
              {cfg.enabled ? 'Integração ativa' : 'Integração desativada'}
            </Badge>
            <Badge variant={ready ? 'default' : 'destructive'} className="gap-1">
              {ready ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {ready ? 'Credenciais completas' : 'Credenciais incompletas'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credenciais</CardTitle>
            <CardDescription>API Key armazenada no servidor; nunca exposta ao navegador.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Integração global ativa</Label>
                <p className="text-xs text-muted-foreground">
                  Quando desativada, nenhum envio ocorre para qualquer empresa.
                </p>
              </div>
              <Switch checked={cfg.enabled} onCheckedChange={(v) => setCfg((c) => ({ ...c, enabled: v }))} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>URL base</Label>
                <Input
                  placeholder="https://evolution.exemplo.com"
                  value={cfg.base_url}
                  onChange={(e) => setCfg((c) => ({ ...c, base_url: e.target.value }))}
                />
              </div>
              <div>
                <Label>Instance ID (UUID)</Label>
                <Input
                  placeholder="ex.: 249aad2e-68f9-464f-bc84-aca560c38f0e"
                  value={cfg.instance}
                  onChange={(e) => setCfg((c) => ({ ...c, instance: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  UUID da instância no Evolution GO (campo <code>instanceId</code>), retornado ao criar a instância.
                </p>
              </div>
            </div>
            <div>
              <Label>API Key (GLOBAL_API_KEY) {cfg.has_api_key && <span className="text-xs text-muted-foreground ml-2">(já configurada — deixe em branco para manter)</span>}</Label>
              <Input
                type="password"
                placeholder={cfg.has_api_key ? '••••••••••••' : 'Cole a API Key'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar configuração global
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Testar conexão</CardTitle>
            <CardDescription>Envia uma mensagem de teste usando as credenciais globais.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-[1fr_auto] gap-2 items-end">
              <div>
                <Label>Número para teste</Label>
                <Input
                  placeholder="5511999998888"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                />
              </div>
              <Button onClick={test} disabled={testing || !ready} variant="outline">
                {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Enviar teste
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}