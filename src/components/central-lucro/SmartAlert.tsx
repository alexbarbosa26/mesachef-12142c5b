import { AlertTriangle, ChevronRight, Info, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface SmartAlertItem {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  action: string;
  to?: string;
}

const styles: Record<AlertSeverity, { bg: string; icon: any; fg: string }> = {
  critical: { bg: 'bg-destructive/10 border-destructive/30', icon: XCircle, fg: 'text-destructive' },
  warning:  { bg: 'bg-warning/10 border-warning/30', icon: AlertTriangle, fg: 'text-warning' },
  info:     { bg: 'bg-sky-500/10 border-sky-500/30', icon: Info, fg: 'text-sky-500' },
};

export function SmartAlert({ alert }: { alert: SmartAlertItem }) {
  const s = styles[alert.severity];
  const Icon = s.icon;
  const body = (
    <div className={cn('flex items-start gap-3 rounded-lg border p-3', s.bg)}>
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', s.fg)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{alert.title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{alert.description}</p>
        <p className="mt-1 text-xs"><span className="font-medium">Sugestão:</span> {alert.action}</p>
      </div>
      {alert.to && <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
    </div>
  );
  return alert.to ? <Link to={alert.to} className="block">{body}</Link> : body;
}
