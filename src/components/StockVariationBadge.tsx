import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StockVariationBadgeProps {
  previousQuantity: number;
  currentQuantity: number;
  className?: string;
  showPercentage?: boolean;
}

export const StockVariationBadge = ({
  previousQuantity,
  currentQuantity,
  className,
  showPercentage = true,
}: StockVariationBadgeProps) => {
  // Calculate variation
  const difference = currentQuantity - previousQuantity;
  
  // Handle division by zero
  let percentage = 0;
  if (previousQuantity !== 0) {
    percentage = (difference / previousQuantity) * 100;
  } else if (currentQuantity > 0) {
    percentage = 100; // From 0 to any positive number = 100% increase
  }

  // Determine status based on percentage
  let status: 'increase' | 'stable' | 'decrease';
  let Icon: typeof TrendingUp;
  let colorClasses: string;
  
  if (percentage > 5) {
    status = 'increase';
    Icon = TrendingUp;
    colorClasses = 'border-success bg-success/10 text-success';
  } else if (percentage < -5) {
    status = 'decrease';
    Icon = TrendingDown;
    colorClasses = 'border-destructive bg-destructive/10 text-destructive';
  } else {
    status = 'stable';
    Icon = Minus;
    colorClasses = 'border-warning bg-warning/10 text-warning';
  }

  const formattedPercentage = Math.abs(percentage).toFixed(1);
  const sign = percentage > 0 ? '+' : percentage < 0 ? '-' : '';

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium whitespace-nowrap',
        colorClasses,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {showPercentage ? (
        <span>{sign}{formattedPercentage}%</span>
      ) : (
        <span>
          {status === 'increase' && 'Aumento'}
          {status === 'decrease' && 'Redução'}
          {status === 'stable' && 'Estável'}
        </span>
      )}
    </Badge>
  );
};

export const getVariationStatus = (
  previousQuantity: number,
  currentQuantity: number
): { status: 'increase' | 'stable' | 'decrease'; percentage: number } => {
  const difference = currentQuantity - previousQuantity;
  let percentage = 0;
  
  if (previousQuantity !== 0) {
    percentage = (difference / previousQuantity) * 100;
  } else if (currentQuantity > 0) {
    percentage = 100;
  }

  let status: 'increase' | 'stable' | 'decrease';
  if (percentage > 5) {
    status = 'increase';
  } else if (percentage < -5) {
    status = 'decrease';
  } else {
    status = 'stable';
  }

  return { status, percentage };
};

export default StockVariationBadge;
