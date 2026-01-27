import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Shield, User, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'staff';
  is_active: boolean;
  password_expiry_days: number | null;
  created_at: string;
}

interface UserEditDialogProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentUserId?: string;
}

const UserEditDialog = ({
  user,
  open,
  onOpenChange,
  onSuccess,
  currentUserId,
}: UserEditDialogProps) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    role: 'staff' as 'admin' | 'staff',
    is_active: true,
    password_expiry_enabled: false,
    password_expiry_days: 45,
  });

  // Update form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
        password_expiry_enabled: !!user.password_expiry_days,
        password_expiry_days: user.password_expiry_days || 45,
      });
    }
  }, [user]);

  const isCurrentUser = user?.user_id === currentUserId;

  const handleUpdate = async () => {
    if (!user) return;

    setIsUpdating(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('update-user', {
        body: {
          user_id: user.user_id,
          full_name: formData.full_name,
          role: formData.role as 'admin' | 'staff',
          is_active: formData.is_active,
          password_expiry_days: formData.password_expiry_enabled
            ? formData.password_expiry_days
            : null,
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
        description: 'Usuário atualizado com sucesso!',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar usuário',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="edit_full_name">Nome Completo</Label>
            <Input
              id="edit_full_name"
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_email">Email</Label>
            <Input id="edit_email" value={user.email} disabled />
            <p className="text-xs text-muted-foreground">
              O email não pode ser alterado
            </p>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Usuário</Label>
            <Select
              value={formData.role}
              onValueChange={(v: 'admin' | 'staff') =>
                setFormData({ ...formData, role: v })
              }
              disabled={isCurrentUser}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Funcionário (Staff)
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Administrador
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {isCurrentUser && (
              <p className="text-xs text-muted-foreground">
                Você não pode alterar seu próprio tipo
              </p>
            )}
          </div>

          {/* Status (Active/Inactive) */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label>Usuário Ativo</Label>
              <p className="text-sm text-muted-foreground">
                Usuários inativos não podem acessar o sistema
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
              disabled={isCurrentUser}
            />
          </div>

          {isCurrentUser && !formData.is_active && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 text-warning rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">
                Você não pode desativar sua própria conta
              </span>
            </div>
          )}

          {/* Password Expiry */}
          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Expiração de Senha</Label>
                <p className="text-sm text-muted-foreground">
                  Exigir troca de senha periodicamente
                </p>
              </div>
              <Switch
                checked={formData.password_expiry_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, password_expiry_enabled: checked })
                }
              />
            </div>

            {formData.password_expiry_enabled && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="expiry_days">Dias para expirar</Label>
                <Input
                  id="expiry_days"
                  type="number"
                  min={1}
                  max={365}
                  value={formData.password_expiry_days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      password_expiry_days: parseInt(e.target.value) || 45,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Sugerido: 45 dias. A senha não poderá ser igual às últimas 10.
                </p>
              </div>
            )}
          </div>

          <Button
            onClick={handleUpdate}
            className="w-full"
            disabled={isUpdating || (isCurrentUser && !formData.is_active)}
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Atualizando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserEditDialog;
