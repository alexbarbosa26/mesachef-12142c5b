import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { AdminOnlyGuard } from '@/components/pricing/AdminOnlyGuard';
import { TechnicalSheetForm } from '@/components/pricing/TechnicalSheetForm';
import {
  usePricingProducts,
  useTechnicalSheets,
  usePricingConfigGlobal,
  usePricingConfigProducts,
} from '@/hooks/usePricingData';
import { ArrowLeft, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function TechnicalSheetPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const { data: products = [], isLoading: loadingProducts } = usePricingProducts();
  const { data: sheets = [], isLoading: loadingSheets } = useTechnicalSheets();
  const { data: globalConfig, isLoading: loadingConfig } = usePricingConfigGlobal();
  const { data: productConfigs = [] } = usePricingConfigProducts();

  const product = products.find((p) => p.id === productId);
  const sheet = sheets.find((s) => s.product_id === productId);
  const productConfig = productConfigs.find((c) => c.product_id === productId);

  const isLoading = loadingProducts || loadingSheets || loadingConfig;

  return (
    <DashboardLayout>
      <AdminOnlyGuard>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/pricing')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Ficha Técnica
              </h1>
              <p className="text-muted-foreground">
                {isLoading ? 'Carregando...' : product?.name || 'Produto não encontrado'}
              </p>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="grid lg:grid-cols-2 gap-6">
              <Skeleton className="h-[500px]" />
              <Skeleton className="h-[500px]" />
            </div>
          ) : !product ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Produto não encontrado</p>
              <Button variant="link" onClick={() => navigate('/pricing')}>
                Voltar para lista
              </Button>
            </div>
          ) : !globalConfig ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Configuração global não encontrada. Configure os percentuais primeiro.</p>
              <Button variant="link" onClick={() => navigate('/pricing/config')}>
                Ir para Configuração
              </Button>
            </div>
          ) : (
            <TechnicalSheetForm
              productId={productId!}
              productName={product.name}
              sheet={sheet}
              globalConfig={globalConfig}
              productConfig={productConfig}
              onClose={() => navigate('/pricing')}
            />
          )}
        </div>
      </AdminOnlyGuard>
    </DashboardLayout>
  );
}
