import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export type CardTone = 'default' | 'success' | 'warning' | 'destructive' | 'info';

interface ExecutiveCardProps {
  title: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: CardTone;
  to?: string;
}

const toneStyles: Record<CardTone, { ring: string; bg: string; fg: string }> = {
  default:     { ring: '', bg: 'bg-primary/10', fg: 'text-primary' },
  success:     { ring: 'border-emerald-500/40', bg: 'bg-emerald-500/10', fg: 'text-emerald-500' },
  warning:     { ring: 'border-warning/40', bg: 'bg-warning/10', fg: 'text-warning' },
  destructive: { ring: 'border-destructive/40', bg: 'bg-destructive/10', fg: 'text-destructive' },
  info:        { ring: 'border-sky-500/40', bg: 'bg-sky-500/10', fg: 'text-sky-500' },
};

export function ExecutiveCard({ title, value, hint, icon: Icon, tone = 'default', to }: ExecutiveCardProps) {
  const s = toneStyles[tone];
  const content = (
    <Card className={cn('transition-colors hover:bg-accent/40', s.ring)}>
      <CardContent className="flex items-start gap-3 p-4">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', s.bg)}>
          <Icon className={cn('h-5 w-5', s.fg)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{title}</p>
          <p className="mt-0.5 text-xl font-bold leading-tight">{value}</p>
          {hint && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to} className="block">{content}</Link> : content;
}
