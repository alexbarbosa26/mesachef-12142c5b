import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Settings {
  expiry_alert_days: number;
  low_stock_alert: boolean;
  low_stock_percentage: number;
}

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>({
    expiry_alert_days: 1,
    low_stock_alert: true,
    low_stock_percentage: 20,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    const { data, error } = await supabase.from('settings').select('*');

    if (error) {
      console.error('Error fetching settings:', error);
      return;
    }

    const settingsMap: Record<string, string> = {};
    data?.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    setSettings({
      expiry_alert_days: parseInt(settingsMap.expiry_alert_days || '1', 10),
      low_stock_alert: settingsMap.low_stock_alert === 'true',
      low_stock_percentage: parseInt(settingsMap.low_stock_percentage || '20', 10),
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('settings')
      .update({ value })
      .eq('key', key);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar configuração',
        variant: 'destructive',
      });
      return false;
    }

    await fetchSettings();
    toast({ title: 'Sucesso', description: 'Configuração atualizada!' });
    return true;
  };

  return { settings, loading, updateSetting, refetch: fetchSettings };
};