import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Key, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

interface PasswordResetDialogProps {
  user: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const passwordSchema = z.object({
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

const PasswordResetDialog = ({
  user,
  open,
  onOpenChange,
  onSuccess,
}: PasswordResetDialogProps) => {
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleReset = async () => {
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

    if (!user) return;

    setIsResetting(true);

    try {
      const response = await supabase.functions.invoke('reset-user-password', {
        body: {
          user_id: user.user_id,
          new_password: password,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: 'Sucesso',
        description: `Senha de ${user.full_name} redefinida com sucesso!`,
      });

      setPassword('');
      setConfirmPassword('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao redefinir senha',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setPassword('');
      setConfirmPassword('');
      setErrors({});
    }
    onOpenChange(isOpen);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Redefinir Senha
          </DialogTitle>
          <DialogDescription>
            Defina uma nova senha para {user.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2 p-3 bg-warning/10 text-warning rounded-lg">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">
              O usuário precisará usar essa nova senha no próximo login.
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password">Nova Senha</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={errors.confirmPassword ? 'border-destructive' : ''}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              className="flex-1"
              disabled={isResetting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReset}
              className="flex-1"
              disabled={isResetting || !password || !confirmPassword}
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redefinindo...
                </>
              ) : (
                'Redefinir Senha'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordResetDialog;
