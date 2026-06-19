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

// Compact display for currency values when they get too wide for the card.
// Keeps short values intact; abbreviates >= 1.000 with mil / mi / bi suffixes.
function compactDisplay(value: string | number): string {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR').format(value);
  }
  const str = String(value);
  // Detect BRL currency like "R$ 1.234.567,89"
  const match = str.match(/^(R\$\s?)(-?[\d.]+)(,\d+)?$/);
  if (!match) return str;
  const prefix = match[1];
  const raw = match[2].replace(/\./g, '');
  const num = Number(raw);
  if (!Number.isFinite(num)) return str;
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  const fmt = (n: number, suffix: string) =>
    `${prefix}${sign}${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${suffix}`;
  if (abs >= 1_000_000_000) return fmt(abs / 1_000_000_000, 'bi');
  if (abs >= 1_000_000) return fmt(abs / 1_000_000, 'mi');
  if (abs >= 100_000) return fmt(abs / 1_000, 'mil');
  return str;
}

export function ExecutiveCard({ title, value, hint, icon: Icon, tone = 'default', to }: ExecutiveCardProps) {
  const s = toneStyles[tone];
  const display = compactDisplay(value);
  const fullText = String(value);
  const content = (
    <Card className={cn('h-full transition-colors hover:bg-accent/40', s.ring)}>
      <CardContent className="flex h-full items-start gap-3 p-4">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', s.bg)}>
          <Icon className={cn('h-5 w-5', s.fg)} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="line-clamp-2 text-xs leading-tight text-muted-foreground" title={title}>
            {title}
          </p>
          <p
            className="mt-1 truncate text-lg font-bold leading-tight sm:text-xl"
            title={fullText}
          >
            {display}
          </p>
          {hint && (
            <p className="mt-auto pt-1 line-clamp-2 text-xs text-muted-foreground" title={hint}>
              {hint}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to} className="block h-full">{content}</Link> : content;
}
