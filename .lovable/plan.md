# Central de Lucro — Plano de Implementação

Transformar o MesaChef em uma ferramenta estratégica criando um novo dashboard executivo focado em margem, CMV, desperdício e precificação. Implementação incremental, sem refatorar o que já existe.

## 1. Navegação e rotas

- Renomear o item de menu atual **"Dashboard"** (rota `/dashboard` → `DashboardOverview`) para **"Gestão de Estoque"** (mantendo a rota para não quebrar links).
- Criar nova rota `/central-lucro` apontando para `pages/CentralLucro.tsx`.
- Adicionar item no `Sidebar.tsx` no topo: **"Central de Lucro"** (ícone `TrendingUp`) como tela principal padrão pós-login.
- Atualizar `pages/Index.tsx` para redirecionar usuários autenticados para `/central-lucro`.

## 2. Infraestrutura compartilhada

- Criar `src/hooks/useCurrentCompany.ts` — wrapper único sobre `profiles.company_id` do usuário logado (cacheado por React Query). Substituir gradualmente apenas onde a Central de Lucro precisar; não tocar nos hooks legados.
- Padrão de queryKey: `['central-lucro', '<bloco>', companyId, periodo]`.
- Todo `INSERT` novo passa `company_id` explícito (mesmo com trigger).

## 3. Estrutura da página `CentralLucro.tsx`

```text
┌─────────────────────────────────────────────────┐
│ Header: título + seletor de período (7/30/90d)  │
├─────────────────────────────────────────────────┤
│ [Cards executivos — grid responsivo 2/3/5 cols] │
├─────────────────────────────────────────────────┤
│ [Alertas inteligentes — lista priorizada]       │
├─────────────────────────────────────────────────┤
│ [Gráficos — grid 1/2 cols]                      │
│  • CMV ao longo do tempo  • Compras período     │
│  • Estoque por categoria  • Top 10 insumos      │
│  • Gap preço atual x sugerido                   │
├─────────────────────────────────────────────────┤
│ [Bloco Self-Service — se houver dados]          │
└─────────────────────────────────────────────────┘
```

## 4. Cards executivos (10 KPIs)

Componente `ExecutiveCard` reutilizável (título, valor, variação %, ícone, cor semântica, link "ver detalhes").

| Card | Fonte |
|---|---|
| Valor em estoque | `stock_items` × `calculateItemTotalValue` |
| Compras no período | `stock_purchases` filtradas por data |
| CMV real do período | `cmv_snapshots` (último fechado) ou estimado |
| CMV % | CMV / receita estimada |
| Perdas e ajustes | `stock_adjustments` tipo `loss`/`waste` |
| Sem estoque | `stock_items.current_quantity = 0` |
| Abaixo do mínimo | `current_quantity <= minimum_stock` |
| Próximos do vencimento | usando `ExpiryBadge` existente |
| Preço abaixo do sugerido | `pricing_products` × cálculo SEBRAE |
| Fichas incompletas | `technical_sheets` sem ingredientes ou CVU=0 |

## 5. Cálculo de CMV (regra crítica)

- Remover qualquer estimativa "% das compras".
- Buscar último `cmv_snapshots` do período. Se existir: usar `realCMV`/`theoreticalCMV` e diferença.
- Se não existir snapshot: calcular teórico via `calculateCMV(estoqueInicial, compras, estoqueFinal)` reutilizando `utils/cmvCalculations.ts` e renderizar `Alert` amarelo: **"CMV estimado — realize um fechamento de estoque para CMV real."**

## 6. Gráficos (Recharts)

- `CMVEvolutionChart` — linha, série mensal de `cmv_snapshots`.
- `PurchasesChart` — barras por semana de `stock_purchases`.
- `StockByCategoryChart` — pizza/barras `stock_items` agrupados por categoria.
- `TopImpactItemsChart` — barras top 10 por `qty × value`.
- `PriceGapChart` — barras horizontais top produtos com maior diferença preço atual vs. sugerido.

## 7. Alertas inteligentes

Componente `SmartAlert` (título + descrição + ação sugerida + CTA navega para origem). Regras:

- Preço defasado (>30 dias sem atualização ou abaixo do mínimo SEBRAE).
- Custo de insumo subiu >10% em compra recente (`stock_purchases` comparativo).
- Vencimento em ≤7 dias.
- Estoque crítico (zero ou <50% do mínimo).
- CMV acima da meta de `pricing_config_global.target_cmv_pct` (ou 35% default com aviso).
- Ficha técnica sem custo completo.
- Divergência CMV real vs teórico > threshold.

Ordenar por severidade (crítico → atenção → info). Limitar 10 visíveis com "Ver todos".

## 8. Precificação

Reusar `usePricingData`, `usePricingCosts`. Calcular para cada produto: preço atual, sugerido (SEBRAE), margem. Classificar:
- **Saudável**: margem ≥ meta
- **Atenção**: 80–99% da meta
- **Crítico**: <80% da meta ou prejuízo
- **Oportunidade**: preço atual muito abaixo do sugerido (>15%)

## 9. Bloco Self-Service

Query em `self_service_daily_records` do período. Se 0 registros: card vazio com botão "Cadastrar primeiro dia". Caso contrário: cards com totais agregados (produzido/consumido/sobras kg, valor da sobra, preço/kg, resultado).

## 10. Arquivos a criar/editar

**Novos:**
- `src/pages/CentralLucro.tsx`
- `src/hooks/useCurrentCompany.ts`
- `src/hooks/useCentralLucroData.ts` (orquestra todas as queries do dashboard)
- `src/components/central-lucro/ExecutiveCard.tsx`
- `src/components/central-lucro/SmartAlert.tsx`
- `src/components/central-lucro/PeriodSelector.tsx`
- `src/components/central-lucro/charts/CMVEvolutionChart.tsx`
- `src/components/central-lucro/charts/PurchasesChart.tsx`
- `src/components/central-lucro/charts/StockByCategoryChart.tsx`
- `src/components/central-lucro/charts/TopImpactItemsChart.tsx`
- `src/components/central-lucro/charts/PriceGapChart.tsx`
- `src/components/central-lucro/SelfServiceSummary.tsx`
- `src/utils/centralLucroCalculations.ts`

**Editados:**
- `src/App.tsx` — nova rota `/central-lucro`.
- `src/components/layout/Sidebar.tsx` — novo item, renomear Dashboard → Gestão de Estoque.
- `src/pages/Index.tsx` — redirect default.

## 11. O que NÃO será feito

- Não renomear arquivos existentes (`DashboardOverview.tsx`, `Dashboard.tsx`) — apenas o rótulo na UI.
- Não criar migrations (todos os dados necessários já existem).
- Não alterar páginas Pricing, Stock, CMV, Self-Service existentes.
- Filtros avançados/exportação ficam para uma fase posterior.

## 12. Responsividade

Grid Tailwind `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` para cards; gráficos em coluna única no mobile, 2 colunas no desktop. Reusar layout `DashboardLayout` (já tem header mobile fixo).

## Detalhes técnicos (resumo para revisão)

- Stack: React 18 + TS + Tailwind + shadcn + Recharts + React Query.
- Período padrão: últimos 30 dias; seletor 7/30/90d/mês atual.
- Todas as queries: `enabled: !!companyId` para evitar fetch antes de carregar perfil.
- Conversão de unidades reusando `normalizeQuantityToBaseUnit`.
- Sem hardcode de cores: tokens semânticos (`bg-destructive`, `text-success`, etc).
