import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminOnlyGuard } from '@/components/pricing/AdminOnlyGuard';
import { GlobalConfigForm } from '@/components/pricing/GlobalConfigForm';
import { usePricingConfigGlobal } from '@/hooks/usePricingData';
import { ArrowLeft, Settings } from 'lucide-react';

export default function PricingConfig() {
  const navigate = useNavigate();
  const { data: globalConfig, isLoading } = usePricingConfigGlobal();

  return (
    <DashboardLayout>
      <AdminOnlyGuard>
        <div className="space-y-6 max-w-2xl">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/pricing')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="w-6 h-6" />
                Configuração de Precificação
              </h1>
              <p className="text-muted-foreground">
                Defina os percentuais padrão para cálculo de preços
              </p>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <Skeleton className="h-[600px]" />
          ) : globalConfig ? (
            <GlobalConfigForm config={globalConfig} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Erro ao carregar configuração</p>
            </div>
          )}
        </div>
      </AdminOnlyGuard>
    </DashboardLayout>
  );
}
