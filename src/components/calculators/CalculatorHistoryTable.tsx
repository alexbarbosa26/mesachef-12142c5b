import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { formatBRL, formatPct } from './calculatorMath';
import { useProductionCalculations } from '@/hooks/useProductionCalculations';
import { useStockData } from '@/hooks/useStockData';

const TYPE_LABEL: Record<string, string> = {
  correction: 'Correção',
  cooking: 'Cocção',
};
const ACTION_LABEL: Record<string, string> = {
  saved_only: 'Apenas salvo',
  updated_item: 'Atualizou insumo',
  created_item: 'Criou insumo',
};

export function CalculatorHistoryTable() {
  const { calculations, loading } = useProductionCalculations();
  const { stockItems } = useStockData();

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando histórico...</p>;
  }
  if (calculations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum cálculo registrado ainda.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Alimento</TableHead>
            <TableHead>% Perda</TableHead>
            <TableHead>Custo/Kg final</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Insumo vinculado</TableHead>
            <TableHead>Obs.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calculations.map((c) => {
            const linked = c.linked_item_id
              ? stockItems.find((i) => i.id === c.linked_item_id)
              : undefined;
            return (
              <TableRow key={c.id}>
                <TableCell className="text-sm">
                  {format(new Date(c.created_at), 'dd/MM/yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{TYPE_LABEL[c.calculation_type]}</Badge>
                </TableCell>
                <TableCell className="font-medium">{c.food_name}</TableCell>
                <TableCell>{c.loss_pct != null ? formatPct(c.loss_pct) : '—'}</TableCell>
                <TableCell className="font-semibold">
                  {c.cost_per_kg_net != null && c.cost_per_kg_net > 0
                    ? formatBRL(c.cost_per_kg_net)
                    : '—'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={c.action_taken === 'saved_only' ? 'secondary' : 'default'}
                  >
                    {ACTION_LABEL[c.action_taken]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {linked ? linked.name : c.linked_item_id ? '—' : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {c.notes || '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}