# Calculadoras de Produção

Implementação incremental, reaproveitando padrões existentes (sidebar, RLS multi-tenant, `stock_items`, hooks). Sem refatorar estoque, fichas técnicas, pricing nem self-service.

## Escopo da entrega

1. Nova página `/calculators` no menu lateral (grupo **Estoque**), com 2 abas:
   - **Fator de Correção** (pré-preparo)
   - **Fator de Cocção** (pós-preparo)
2. Histórico de cálculos por empresa.
3. Ações ao final do cálculo:
   - Atualizar custo de insumo existente (com diálogo de confirmação).
   - Criar novo insumo derivado (ex.: "Salmão limpo", "Salmão grelhado").
   - Apenas salvar o cálculo.
4. Custos atualizados/criados ficam disponíveis automaticamente em fichas técnicas e pricing (usa a mesma tabela `stock_items` que o pricing já consome via `usePricingCosts`).

## Estrutura de arquivos (nova)

```text
src/pages/Calculators.tsx                       # página com tabs + histórico
src/components/calculators/CorrectionFactorCalculator.tsx
src/components/calculators/CookingFactorCalculator.tsx
src/components/calculators/CalculatorResultPanel.tsx   # cards de resultado + ações
src/components/calculators/ApplyToStockDialog.tsx      # confirmação para atualizar / criar insumo
src/components/calculators/CalculatorHistoryTable.tsx
src/hooks/useProductionCalculations.ts          # CRUD do histórico
```

Sidebar: adicionar item `{ name: 'Calculadoras', href: '/calculators', icon: Calculator }` dentro do grupo **Estoque**. Rota registrada em `src/App.tsx`.

## Cálculos (puros, sem backend)

Tudo normalizado em **gramas** internamente; UI aceita Kg ou g.

**Correção:**
- `perda = bruto - liquido` (ou inverso)
- `% perda = perda / bruto`
- `% aproveitamento = liquido / bruto`
- `fator_correcao = bruto / liquido`
- `custo_kg_bruto = custo_total / bruto_kg`
- `custo_kg_limpo = custo_total / liquido_kg`
- `custo_g_limpo = custo_kg_limpo / 1000`

**Cocção:**
- `perda_coccao = antes - depois`
- `% perda = perda_coccao / antes`; `fator_coccao = depois / antes`
- `custo_total_usado = antes_g * custo_g_antes`
- `custo_g_depois = custo_total_usado / depois_g`; `custo_kg_depois = custo_g_depois * 1000`

Botão "Usar resultado da Correção" preenche o custo na calculadora de Cocção.

Formatação: `R$` com 2 casas (custo/Kg) e até 5 casas (custo/g); percentuais com 2 casas; aceita vírgula e ponto na entrada.

## Banco de dados (migração nova)

Tabela `production_calculations` (multi-tenant via `company_id`, mesmos padrões de RLS já usados):

- `calculation_type` (`'correction' | 'cooking'`)
- `food_name`
- `gross_weight_g`, `net_weight_g`, `loss_g`
- `loss_pct`, `yield_pct`, `correction_factor`, `cooking_factor`
- `total_cost`, `cost_per_kg_gross`, `cost_per_kg_net`, `cost_per_g_net`
- `action_taken` (`'updated_item' | 'created_item' | 'saved_only'`)
- `linked_item_id` → `stock_items(id)` (ON DELETE SET NULL)
- `source_calculation_id` → self-ref (cocção pode referenciar correção)
- `notes`, `created_by`, `company_id`, `created_at`, `updated_at`

GRANTs para `authenticated` e `service_role`, `ENABLE RLS`, e políticas espelhando `stock_items`:
- SELECT/INSERT/UPDATE/DELETE restritos a `company_id = current_company_id()`.
- Trigger `set_company_id_on_insert` (já existe) reaproveitada.

Sem alterações em `stock_items`, `technical_sheets`, `pricing_*`.

## Integração com estoque

`ApplyToStockDialog` oferece dois modos:

1. **Atualizar existente**: Combobox com busca (mesmo padrão usado em `IngredientsList`) listando `stock_items` ativos do tenant. Exibe "De R$ X → Para R$ Y" e confirma antes do `UPDATE` em `stock_items.value` (custo unitário por unidade do item — converte para a unidade do item: Kg→`/1`, g→`/1000`, l→`/1` etc.). Usa `.select()` para detectar falha de RLS.
2. **Criar novo insumo derivado**: Form com nome, categoria, unidade, custo calculado preenchido. `INSERT` em `stock_items` (`company_id` vem do trigger), `current_quantity=0`, `minimum_stock=0`.
3. **Apenas salvar**: grava no histórico com `action_taken='saved_only'`.

Toda ação grava 1 linha em `production_calculations` com `linked_item_id` quando aplicável.

## Histórico

Aba/seção na própria página listando últimos 50 cálculos do tenant: data, tipo, alimento, custo/Kg final, ação, insumo vinculado (link), observações. Sem filtros avançados nesta fase.

## Permissões

Página acessível a admin e staff (mesmo critério do menu Estoque > Preenchimento). Atualização/criação de insumos respeita as policies atuais de `stock_items` (staff já pode atualizar quantidade; valor é admin-only via trigger `check_stock_update_permissions`). Por isso:
- Botão "Atualizar custo" e "Criar insumo derivado" ficam **visíveis apenas para admin**.
- Staff pode usar as calculadoras e salvar histórico.

## Fora de escopo (fase 1)

- Conversões avançadas (litro, ml, pacote, caixa, peça) além de Kg/g/unidade — estrutura preparada via campo `unit`, mas UI inicial só Kg/g.
- Filtros, exportação e edição do histórico.
- Vínculo direto com fichas técnicas (já é automático pois fichas leem `stock_items.value`).

## Critérios de aceite cobertos

Página criada ✅ • cálculo de correção ✅ • cálculo de cocção ✅ • % perda/aproveitamento ✅ • custo/Kg bruto/limpo ✅ • custo/g ✅ • atualizar insumo com confirmação ✅ • criar insumo derivado ✅ • multi-tenant via RLS ✅ • estoque/fichas/pricing intactos ✅.

Posso seguir com a implementação?
