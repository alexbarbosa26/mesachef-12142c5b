import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';
import logo from '@/assets/logo.png';
import { supabase } from '@/integrations/supabase/client';

const passwordSchema = z.object({
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event, 'Has session:', !!session);
        
        if (session) {
          setUserId(session.user.id);
          setIsSessionReady(true);
          setSessionError(null);
        }
      }
    );

    const initSession = async () => {
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      if (existingSession) {
        console.log('Existing session found for user:', existingSession.user.id);
        setUserId(existingSession.user.id);
        setIsSessionReady(true);
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      
      console.log('URL params - type:', type, 'hasAccessToken:', !!accessToken);
      
      if (accessToken && type === 'recovery') {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });
        
        if (error) {
          console.error('Error setting session:', error);
          setSessionError('Link de recuperação inválido ou expirado.');
        } else if (data.session) {
          setUserId(data.session.user.id);
          setIsSessionReady(true);
        }
      } else if (!accessToken) {
        setTimeout(() => {
          if (!isSessionReady) {
            setSessionError('Link de recuperação inválido. Solicite um novo.');
          }
        }, 2000);
      }
    };

    initSession();

    return () => subscription.unsubscribe();
  }, []);

  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md animate-scale-in">
          <CardHeader className="text-center space-y-4">
            <img src={logo} alt="MesaChef Logo" className="mx-auto w-24 h-24 object-contain" />
            <div>
              <CardTitle className="text-2xl font-bold text-destructive">Link Inválido</CardTitle>
              <CardDescription className="mt-2">{sessionError}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/auth')}>
              Voltar para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isSessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md animate-scale-in">
          <CardHeader className="text-center space-y-4">
            <img src={logo} alt="MesaChef Logo" className="mx-auto w-24 h-24 object-contain" />
            <div>
              <CardTitle className="text-2xl font-bold">Validando Link...</CardTitle>
              <CardDescription className="mt-2">Aguarde enquanto validamos seu link</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const validation = passwordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: 'Erro',
        description: 'Sessão expirada. Solicite um novo link de recuperação.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error('Error updating password:', error);
      
      let errorMessage = 'Erro ao atualizar senha. O link pode ter expirado.';
      if (error.message === 'New password should be different from the old password.') {
        errorMessage = 'A nova senha deve ser diferente da senha atual.';
      } else if (error.message.includes('expired') || error.message.includes('invalid')) {
        errorMessage = 'O link de recuperação expirou. Solicite um novo.';
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('password_expiry_days')
        .eq('user_id', userId)
        .maybeSingle();

      const updates: Record<string, any> = {
        last_password_change: new Date().toISOString(),
      };

      if (profile?.password_expiry_days) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + profile.password_expiry_days);
        updates.password_expires_at = expiryDate.toISOString();
      }

      await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId);
    }

    setSuccess(true);
    toast({
      title: 'Sucesso',
      description: 'Sua senha foi atualizada com sucesso!',
    });
    
    setIsLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md animate-scale-in">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto p-4 bg-success/10 rounded-full">
              <CheckCircle2 className="w-12 h-12 text-success" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Senha Atualizada!</CardTitle>
              <CardDescription className="mt-2">
                Sua senha foi alterada com sucesso.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => navigate('/auth')}
            >
              Ir para o Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md animate-scale-in">
        <CardHeader className="text-center space-y-4">
          <img src={logo} alt="MesaChef Logo" className="mx-auto w-24 h-24 object-contain" />
          <div>
            <CardTitle className="text-2xl font-bold">Nova Senha</CardTitle>
            <CardDescription className="mt-2">
              Digite sua nova senha abaixo
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmar Senha</Label>
              <Input
                id="confirm_password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={errors.confirmPassword ? 'border-destructive' : ''}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Atualizar Senha'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
