import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { packageCostToBaseCost, toBaseQuantity } from '@/utils/unitConversion';

export interface PurchaseOrderItemInput {
  stock_item_id: string | null;
  item_name: string;
  purchased_quantity: number;
  purchase_unit: string;
  package_size: number;
  base_unit: string;
  package_unit_cost: number;
  notes?: string | null;
}

export interface PurchaseOrderItem extends PurchaseOrderItemInput {
  id: string;
  order_id: string;
  total_base_quantity: number;
  total_cost: number;
  base_unit_cost: number;
}

export interface PurchaseOrder {
  id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  purchase_date: string;
  invoice_number: string | null;
  notes: string | null;
  total_amount: number;
  created_at: string;
  created_by: string | null;
  items: PurchaseOrderItem[];
}

export const useStockPurchaseOrders = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { logAction } = useAuditLog();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('stock_purchase_orders')
      .select('*, items:stock_purchase_order_items(*)')
      .order('purchase_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as compras.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }
    setOrders((data || []) as unknown as PurchaseOrder[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /**
   * Cria a ordem de compra, insere os itens, atualiza o custo (em unidade base)
   * e a quantidade em estoque dos insumos vinculados.
   */
  const createOrder = async (
    header: {
      supplier_id: string | null;
      supplier_name: string | null;
      purchase_date: string;
      invoice_number?: string | null;
      notes?: string | null;
    },
    items: PurchaseOrderItemInput[],
  ) => {
    const validItems = items.filter(
      (i) => i.item_name && i.purchased_quantity > 0 && i.package_unit_cost >= 0,
    );
    if (validItems.length === 0) {
      toast({
        title: 'Atenção',
        description: 'Adicione ao menos um item válido à compra.',
        variant: 'destructive',
      });
      return null;
    }

    const totalAmount = validItems.reduce(
      (sum, it) => sum + it.purchased_quantity * it.package_unit_cost,
      0,
    );

    const { data: order, error: orderErr } = await supabase
      .from('stock_purchase_orders')
      .insert({
        supplier_id: header.supplier_id,
        supplier_name: header.supplier_name,
        purchase_date: header.purchase_date,
        invoice_number: header.invoice_number || null,
        notes: header.notes || null,
        total_amount: totalAmount,
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (orderErr || !order) {
      toast({
        title: 'Erro',
        description: orderErr?.message || 'Erro ao criar compra.',
        variant: 'destructive',
      });
      return null;
    }

    const itemsPayload = validItems.map((it) => ({
      order_id: order.id,
      stock_item_id: it.stock_item_id,
      item_name: it.item_name,
      purchased_quantity: it.purchased_quantity,
      purchase_unit: it.purchase_unit,
      package_size: it.package_size || 1,
      base_unit: it.base_unit || 'un',
      package_unit_cost: it.package_unit_cost,
      notes: it.notes || null,
    }));

    const { error: itemsErr } = await supabase
      .from('stock_purchase_order_items')
      .insert(itemsPayload);

    if (itemsErr) {
      toast({
        title: 'Erro',
        description: 'Compra criada, mas itens falharam: ' + itemsErr.message,
        variant: 'destructive',
      });
      await fetchOrders();
      return order.id;
    }

    // Atualizar estoque vinculado: soma quantidade base e custo por unidade base
    for (const it of validItems) {
      if (!it.stock_item_id) continue;
      const baseQty = toBaseQuantity(it.purchased_quantity, it.package_size);
      const baseCost = packageCostToBaseCost(it.package_unit_cost, it.package_size);

      const { data: existing } = await supabase
        .from('stock_items')
        .select('current_quantity, value, unit, count_unit, base_unit, package_size')
        .eq('id', it.stock_item_id)
        .maybeSingle();

      if (!existing) continue;

      // current_quantity é mantida na unidade BASE
      const newQty = Number(existing.current_quantity || 0) + baseQty;

      await supabase
        .from('stock_items')
        .update({
          current_quantity: newQty,
          value: baseCost, // custo por unidade base (kg/g/l/ml/un)
          unit: existing.base_unit || existing.unit || it.base_unit,
          base_unit: existing.base_unit || it.base_unit,
          count_unit: existing.count_unit || it.purchase_unit,
          package_size: existing.package_size || it.package_size,
        })
        .eq('id', it.stock_item_id);
    }

    await logAction({
      action: 'CREATE',
      entity_type: 'stock_purchase_order',
      entity_id: order.id,
      details: {
        supplier: header.supplier_name,
        total: totalAmount,
        items: validItems.length,
      },
    });

    await fetchOrders();
    toast({
      title: 'Compra registrada',
      description: `Total ${totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em ${validItems.length} item(ns).`,
    });
    return order.id;
  };

  const deleteOrder = async (id: string) => {
    const { error } = await supabase
      .from('stock_purchase_orders')
      .delete()
      .eq('id', id);
    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a compra.',
        variant: 'destructive',
      });
      return false;
    }
    await fetchOrders();
    toast({ title: 'Compra excluída' });
    return true;
  };

  return { orders, loading, refetch: fetchOrders, createOrder, deleteOrder };
};