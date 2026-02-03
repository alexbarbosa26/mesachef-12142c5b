import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PageLoader } from '@/components/ui/page-loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, Save, Loader2, Send, Eye, EyeOff, Check, X } from 'lucide-react';

interface EmailSettings {
  smtp_host: string;
  smtp_port: string;
  smtp_secure: string;
  smtp_user: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;
}

const Settings = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [settings, setSettings] = useState<EmailSettings>({
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: 'tls',
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: 'MesaChef',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', [
        'smtp_host',
        'smtp_port',
        'smtp_secure',
        'smtp_user',
        'smtp_password',
        'smtp_from_email',
        'smtp_from_name',
      ]);

    if (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar configurações',
        variant: 'destructive',
      });
    } else if (data) {
      const settingsMap: Record<string, string> = {};
      data.forEach((s) => {
        settingsMap[s.key] = s.value;
      });
      setSettings({
        smtp_host: settingsMap.smtp_host || '',
        smtp_port: settingsMap.smtp_port || '587',
        smtp_secure: settingsMap.smtp_secure || 'tls',
        smtp_user: settingsMap.smtp_user || '',
        smtp_password: settingsMap.smtp_password || '',
        smtp_from_email: settingsMap.smtp_from_email || '',
        smtp_from_name: settingsMap.smtp_from_name || 'MesaChef',
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);

    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
    }));

    let hasError = false;
    for (const update of updates) {
      const { error } = await supabase
        .from('settings')
        .update({ value: update.value })
        .eq('key', update.key);

      if (error) {
        console.error(`Error updating ${update.key}:`, error);
        hasError = true;
      }
    }

    if (hasError) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar algumas configurações',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: 'Configurações de email salvas!',
      });
    }

    setSaving(false);
  };

  const handleTestEmail = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: settings.smtp_user || settings.smtp_from_email,
          subject: 'Teste de Configuração - MesaChef',
          html: `
            <h1>Teste de Email</h1>
            <p>Se você está recebendo este email, suas configurações de SMTP estão funcionando corretamente!</p>
            <p>Configurado em: ${new Date().toLocaleString('pt-BR')}</p>
          `,
          isTest: true,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setTestResult({ success: true, message: 'Email de teste enviado com sucesso!' });
        toast({
          title: 'Sucesso',
          description: 'Email de teste enviado!',
        });
      } else {
        setTestResult({ success: false, message: data?.error || 'Falha ao enviar email' });
        toast({
          title: 'Erro',
          description: data?.error || 'Falha ao enviar email de teste',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Test email error:', error);
      setTestResult({ success: false, message: error.message || 'Erro ao testar email' });
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao testar email',
        variant: 'destructive',
      });
    }

    setTesting(false);
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <PageLoader message="Carregando configurações..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema
          </p>
        </div>

        {/* Email Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Configurações de Email (SMTP)
            </CardTitle>
            <CardDescription>
              Configure o servidor de email para envio de notificações e recuperação de senha
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SMTP Host */}
              <div className="space-y-2">
                <Label htmlFor="smtp_host">Servidor SMTP</Label>
                <Input
                  id="smtp_host"
                  placeholder="smtp.gmail.com"
                  value={settings.smtp_host}
                  onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                />
              </div>

              {/* SMTP Port */}
              <div className="space-y-2">
                <Label htmlFor="smtp_port">Porta</Label>
                <Input
                  id="smtp_port"
                  placeholder="587"
                  value={settings.smtp_port}
                  onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
                />
              </div>

              {/* Security */}
              <div className="space-y-2">
                <Label htmlFor="smtp_secure">Segurança</Label>
                <Select
                  value={settings.smtp_secure}
                  onValueChange={(v) => setSettings({ ...settings, smtp_secure: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tls">TLS (Recomendado)</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                    <SelectItem value="none">Nenhum</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* SMTP User */}
              <div className="space-y-2">
                <Label htmlFor="smtp_user">Usuário / Email</Label>
                <Input
                  id="smtp_user"
                  placeholder="seu@email.com"
                  value={settings.smtp_user}
                  onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                />
              </div>

              {/* SMTP Password */}
              <div className="space-y-2">
                <Label htmlFor="smtp_password">Senha / App Password</Label>
                <div className="relative">
                  <Input
                    id="smtp_password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={settings.smtp_password}
                    onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Para Gmail, use uma Senha de App (App Password)
                </p>
              </div>

              {/* From Email */}
              <div className="space-y-2">
                <Label htmlFor="smtp_from_email">Email de Envio</Label>
                <Input
                  id="smtp_from_email"
                  placeholder="noreply@seudominio.com"
                  value={settings.smtp_from_email}
                  onChange={(e) => setSettings({ ...settings, smtp_from_email: e.target.value })}
                />
              </div>

              {/* From Name */}
              <div className="space-y-2">
                <Label htmlFor="smtp_from_name">Nome do Remetente</Label>
                <Input
                  id="smtp_from_name"
                  placeholder="MesaChef"
                  value={settings.smtp_from_name}
                  onChange={(e) => setSettings({ ...settings, smtp_from_name: e.target.value })}
                />
              </div>
            </div>

            {/* Test Result */}
            {testResult && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg ${
                  testResult.success
                    ? 'bg-success/10 text-success'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {testResult.success ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <X className="w-5 h-5" />
                )}
                <span className="text-sm">{testResult.message}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configurações
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleTestEmail}
                disabled={testing || !settings.smtp_host}
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Email de Teste
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
