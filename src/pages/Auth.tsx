import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { z } from 'zod';
import logo from '@/assets/logo.png';
import { supabase } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

type AuthMode = 'login' | 'forgot-password' | 'reset-password';

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [emailSent, setEmailSent] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkUserStatus = async (userId: string): Promise<{ isActive: boolean; passwordExpired: boolean }> => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active, password_expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (!profile) {
      return { isActive: true, passwordExpired: false };
    }

    const isActive = profile.is_active !== false;
    let passwordExpired = false;

    if (profile.password_expires_at) {
      const expiresAt = new Date(profile.password_expires_at);
      passwordExpired = expiresAt < new Date();
    }

    return { isActive, passwordExpired };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      let errorMessage = 'Erro ao fazer login';
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Email ou senha incorretos';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Email não confirmado';
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Check user status after successful auth
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { isActive, passwordExpired } = await checkUserStatus(user.id);

      if (!isActive) {
        await supabase.auth.signOut();
        toast({
          title: 'Acesso Negado',
          description: 'Sua conta está desativada. Entre em contato com o administrador.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (passwordExpired) {
        toast({
          title: 'Senha Expirada',
          description: 'Sua senha expirou. Por favor, altere sua senha para continuar.',
          variant: 'destructive',
        });
        // Allow login but show warning - they will see the alert on dashboard
      }
    }

    toast({
      title: 'Sucesso',
      description: 'Login realizado com sucesso!',
    });
    
    navigate('/dashboard');
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      const fieldErrors: { email?: string } = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    const redirectUrl = `${window.location.origin}/auth?mode=reset`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao enviar email de recuperação. Tente novamente.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    setEmailSent(true);
    toast({
      title: 'Email Enviado',
      description: 'Verifique sua caixa de entrada para redefinir sua senha.',
    });
    
    setIsLoading(false);
  };

  // Login Form
  if (mode === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md animate-scale-in">
          <CardHeader className="text-center space-y-4">
            <img src={logo} alt="MesaChef Logo" className="mx-auto w-24 h-24 object-contain" />
            <div>
              <CardTitle className="text-2xl font-bold">MesaChef</CardTitle>
              <CardDescription className="mt-2">
                Estoque & Gestão Inteligente
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? 'border-destructive' : ''}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={errors.password ? 'border-destructive' : ''}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full text-muted-foreground"
                onClick={() => {
                  setMode('forgot-password');
                  setErrors({});
                  setEmailSent(false);
                }}
              >
                Esqueci minha senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Forgot Password Form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md animate-scale-in">
        <CardHeader className="text-center space-y-4">
          <img src={logo} alt="MesaChef Logo" className="mx-auto w-24 h-24 object-contain" />
          <div>
            <CardTitle className="text-2xl font-bold">Recuperar Senha</CardTitle>
            <CardDescription className="mt-2">
              {emailSent
                ? 'Verifique seu email para continuar'
                : 'Digite seu email para receber o link de recuperação'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="p-4 bg-success/10 rounded-full">
                  <Mail className="w-8 h-8 text-success" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Enviamos um link de recuperação para
                  </p>
                  <p className="font-medium">{email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setMode('login');
                  setEmail('');
                  setEmailSent(false);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset_email">Email</Label>
                <Input
                  id="reset_email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? 'border-destructive' : ''}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Link de Recuperação'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setMode('login');
                  setErrors({});
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Login
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;