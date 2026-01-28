import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInDays } from 'date-fns';

interface PasswordExpiryAlertProps {
  onChangePassword?: () => void;
}

const PasswordExpiryAlert = ({ onChangePassword }: PasswordExpiryAlertProps) => {
  const { user } = useAuth();
  const [expiryInfo, setExpiryInfo] = useState<{
    expiresAt: Date | null;
    daysRemaining: number | null;
    isExpired: boolean;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkPasswordExpiry = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('password_expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.password_expires_at) {
        const expiresAt = new Date(profile.password_expires_at);
        const now = new Date();
        const daysRemaining = differenceInDays(expiresAt, now);
        const isExpired = daysRemaining < 0;

        setExpiryInfo({
          expiresAt,
          daysRemaining,
          isExpired,
        });
      }
    };

    checkPasswordExpiry();
  }, [user]);

  if (!expiryInfo || dismissed) return null;

  // Show alert if expired or expiring within 7 days
  if (!expiryInfo.isExpired && expiryInfo.daysRemaining !== null && expiryInfo.daysRemaining > 7) {
    return null;
  }

  const isExpired = expiryInfo.isExpired;
  const daysRemaining = expiryInfo.daysRemaining ?? 0;

  return (
    <Alert variant={isExpired ? 'destructive' : 'default'} className="relative mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        {isExpired ? 'Senha Expirada' : 'Senha Expirando'}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          {isExpired
            ? 'Sua senha expirou. Por favor, altere sua senha para continuar usando o sistema.'
            : `Sua senha expira em ${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''}. Considere alterá-la em breve.`}
        </span>
        <div className="flex items-center gap-2 ml-4">
          {onChangePassword && (
            <Button size="sm" variant={isExpired ? 'default' : 'outline'} onClick={onChangePassword}>
              <Key className="w-4 h-4 mr-1" />
              Alterar Senha
            </Button>
          )}
          {!isExpired && (
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default PasswordExpiryAlert;
