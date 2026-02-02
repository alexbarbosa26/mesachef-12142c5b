import { forwardRef } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock } from 'lucide-react';

interface ExpiryBadgeProps {
  expiryDate: string | null;
  alertDays: number;
  showIcon?: boolean;
  className?: string;
}

export type ExpiryStatus = 'expired' | 'expiring' | 'ok' | 'none';

export const getExpiryStatus = (
  expiryDate: string | null,
  alertDays: number
): { status: ExpiryStatus; days: number | null } => {
  if (!expiryDate) return { status: 'none', days: null };
  
  const days = differenceInDays(parseISO(expiryDate), new Date());
  
  if (days < 0) {
    return { status: 'expired', days: Math.abs(days) };
  } else if (days <= alertDays) {
    return { status: 'expiring', days };
  }
  
  return { status: 'ok', days };
};

export const getExpiryLabel = (status: ExpiryStatus, days: number | null): string => {
  if (status === 'none') return 'Sem validade';
  if (status === 'expired') return `Vencido há ${days} dia${days !== 1 ? 's' : ''}`;
  if (status === 'expiring') {
    if (days === 0) return 'Vence hoje';
    return `Vence em ${days} dia${days !== 1 ? 's' : ''}`;
  }
  return `${days} dias`;
};

export const ExpiryBadge = forwardRef<HTMLDivElement, ExpiryBadgeProps>(
  ({ expiryDate, alertDays, showIcon = true, className }, ref) => {
    const { status, days } = getExpiryStatus(expiryDate, alertDays);

    if (status === 'none') {
      return null;
    }

    if (status === 'ok') {
      return null; // Don't show badge for items with plenty of time
    }

    const isExpired = status === 'expired';
    const label = getExpiryLabel(status, days);

    return (
      <Badge
        ref={ref}
        variant="outline"
        className={cn(
          'gap-1 font-medium whitespace-nowrap',
          isExpired
            ? 'border-destructive bg-destructive/10 text-destructive'
            : 'border-[hsl(var(--warning))] bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning-foreground))]',
          className
        )}
      >
        {showIcon && (
          isExpired ? (
            <AlertTriangle className="w-3 h-3" />
          ) : (
            <Clock className="w-3 h-3" />
          )
        )}
        {label}
      </Badge>
    );
  }
);

ExpiryBadge.displayName = 'ExpiryBadge';

export default ExpiryBadge;
