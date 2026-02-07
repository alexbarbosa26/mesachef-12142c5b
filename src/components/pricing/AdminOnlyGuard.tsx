import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { ReactNode } from 'react';

interface AdminOnlyGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminOnlyGuard({ children, fallback }: AdminOnlyGuardProps) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return fallback ?? (
      <Alert variant="destructive" className="max-w-lg mx-auto mt-8">
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle>Acesso Restrito</AlertTitle>
        <AlertDescription>
          Somente Administrador pode gerenciar fichas técnicas e precificação.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}
