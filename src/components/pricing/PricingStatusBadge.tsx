import { Badge } from '@/components/ui/badge';
import { PricingStatus } from '@/hooks/usePricingData';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface PricingStatusBadgeProps {
  status: PricingStatus;
  showLabel?: boolean;
}

const STATUS_CONFIG: Record<PricingStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; className: string }> = {
  saudavel: {
    label: 'Saudável',
    variant: 'default',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    className: 'bg-green-500/10 text-green-700 border-green-500/30 hover:bg-green-500/20',
  },
  atencao: {
    label: 'Atenção',
    variant: 'secondary',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30 hover:bg-yellow-500/20',
  },
  inviavel: {
    label: 'Inviável',
    variant: 'destructive',
    icon: <XCircle className="w-3.5 h-3.5" />,
    className: 'bg-red-500/10 text-red-700 border-red-500/30 hover:bg-red-500/20',
  },
};

export function PricingStatusBadge({ status, showLabel = true }: PricingStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant="outline" className={`gap-1.5 font-medium ${config.className}`}>
      {config.icon}
      {showLabel && config.label}
    </Badge>
  );
}
