
# Plano: Compras por Fornecedor + Unidades de Contagem vs Base

Implementação incremental em 4 fases. Cada fase é independente e não quebra o que existe.

## Fase 1 — Banco de dados (migração única)

### Tabelas novas

**`stock_purchase_orders`** (cabeçalho da compra)
- supplier_id, supplier_name (snapshot), purchase_date, invoice_number, notes
- total_amount (calculado), company_id, created_by

**`stock_purchase_order_items`** (itens da compra)
- order_id, stock_item_id
- purchased_quantity (ex: 4)
- purchase_unit (ex: "pacote")
- package_size (ex: 500)
- base_unit (ex: "g")
- package_unit_cost (ex: 1.79)
- total_base_quantity (gerado: purchased_quantity × package_size)
- total_cost (gerado: purchased_quantity × package_unit_cost)
- base_unit_cost (gerado: total_cost / total_base_quantity)
- notes

### Campos novos em `stock_items`
- `count_unit` text (ex: "pacote") — unidade que o staff usa para contar
- `package_size` numeric (ex: 500) — quanto vem em cada unidade de contagem
- `base_unit` text (kg/g/l/ml/un) — unidade para ficha técnica

`unit` e `value` continuam sendo unidade BASE + custo por unidade base (fonte da verdade — fichas técnicas e pricing não mudam).

### Migração de dados existentes
- Backfill: `count_unit = unit`, `package_size = 1`, `base_unit = unit` para todos os insumos atuais.
- Tabela `stock_purchases` antiga: mantida como legacy read-only por enquanto (não migrada automaticamente para evitar perda). Criar view ou flag para diferenciar. Na UI nova, lista unificada (orders + legacy).

### RLS
- Mesmas políticas das tabelas existentes (company_id + has_role).
- GRANTs para authenticated e service_role.

## Fase 2 — Tela "Nova Compra por Fornecedor"

Em `/stock-purchases`, adicionar botão primário **"Nova Compra"** que abre dialog/página:

**Cabeçalho:**
- Fornecedor (select com `useSuppliers`)
- Data
- Nº nota/cupom (opcional)
- Observações
- Total (calculado, read-only)

**Itens (linhas dinâmicas, "+ Adicionar item"):**
- Insumo (autocomplete com `useStockData`)
- Quantidade comprada
- Unidade de compra (pacote/caixa/unidade/garrafa/lata/bandeja/kg/g/l/ml)
- Qtd por embalagem
- Unidade base (kg/g/l/ml/un)
- Valor unitário da embalagem
- Calculados ao vivo: total do item, custo por unidade base
- Botão remover

**Ao salvar:**
1. Insert em `stock_purchase_orders` + itens.
2. Para cada item: atualiza `stock_items.value = base_unit_cost`, soma `current_quantity` em unidade base, e atualiza `count_unit`/`package_size`/`base_unit` se vazio.
3. Audit log.

## Fase 3 — Contagem de estoque por unidade de contagem

Em `StockEntry.tsx`, quando o insumo tem `count_unit` definido:
- Input mostra "X pacotes" (count_unit)
- Helper abaixo: "= 1.5 kg • R$ 5,37"
- Internamente, salva `current_quantity = digitado × package_size` (em unidade base).
- Quando `count_unit` = `base_unit` ou ausente, comportamento atual.

Componente helper `useUnitConversion` centraliza a lógica.

## Fase 4 — UI: cadastro de insumo simplificado

No formulário de insumo, perguntas didáticas:
- "Como você compra?" → purchase_unit padrão
- "Quanto vem dentro?" → package_size
- "Como você conta no estoque?" → count_unit
- "Como é usado nas fichas?" → base_unit (= `unit`)

Fichas técnicas e PricingResale **não mudam** — continuam lendo `stock_items.value` como custo por unidade base, que já é o convertido correto.

## Arquivos afetados

**Novos:**
- `supabase/migrations/...` (uma migração)
- `src/hooks/useStockPurchaseOrders.ts`
- `src/components/stock/PurchaseOrderDialog.tsx`
- `src/components/stock/PurchaseOrderItemRow.tsx`
- `src/utils/unitConversion.ts` (centraliza conversões)

**Editados (mínimo):**
- `src/pages/StockPurchases.tsx` — adiciona botão "Nova Compra" + aba/listagem de ordens
- `src/pages/StockEntry.tsx` — input por count_unit quando aplicável
- `src/pages/Dashboard.tsx` (form de insumo) — campos count_unit/package_size/base_unit
- `src/integrations/supabase/types.ts` — regenerado pela migração

**Não tocados:** `TechnicalSheetForm`, `PricingResale`, `PricingProducts`, `usePricingCosts`, relatórios — tudo continua funcionando.

## Validação

- Exemplo Flocão (4×500g a R$1,79) deve gerar value=3.58, current_quantity=2 (kg) ou 2000 (g) conforme base.
- Compras antigas continuam aparecendo no histórico.
- Ficha técnica usando 100g de flocão custa R$0,358.
- Multiempresa: RLS por company_id em todas as novas tabelas.

## Riscos e mitigações

- **Risco:** atualizar `stock_items.value` na compra pode mudar custo de fichas existentes. **Mitigação:** comportamento já é o atual (useStockPurchases hoje também atualiza value).
- **Risco:** insumos legados sem `count_unit`. **Mitigação:** backfill na migração + fallback na UI (`count_unit ?? unit`).
- **Risco:** unidade de compra incompatível com base (ex: comprou em "caixa" mas base é "kg"). **Mitigação:** package_size + base_unit resolvem (1 caixa = 5000 g).
