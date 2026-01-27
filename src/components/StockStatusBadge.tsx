import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle } from 'lucide-react';

interface StockStatusBadgeProps {
  currentQuantity: number;
  className?: string;
  showIcon?: boolean;
}

export const StockStatusBadge = ({
  currentQuantity,
  className,
  showIcon = true,
}: StockStatusBadgeProps) => {
  const inStock = currentQuantity > 0;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium whitespace-nowrap',
        inStock
          ? 'border-success bg-success/10 text-success'
          : 'border-destructive bg-destructive/10 text-destructive',
        className
      )}
    >
      {showIcon &&
        (inStock ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : (
          <XCircle className="w-3 h-3" />
        ))}
      {inStock ? 'Em estoque' : 'Sem estoque'}
    </Badge>
  );
};

export default StockStatusBadge;
