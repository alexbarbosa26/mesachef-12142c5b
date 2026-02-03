import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StockHistoryEntry {
  id: string;
  item_id: string;
  previous_quantity: number;
  new_quantity: number;
  change_type: string;
  changed_by: string | null;
  created_at: string;
}

export interface ItemVariation {
  item_id: string;
  previous_quantity: number;
  current_quantity: number;
  percentage: number;
  status: 'increase' | 'stable' | 'decrease';
}

export const useStockHistory = () => {
  const [history, setHistory] = useState<StockHistoryEntry[]>([]);
  const [variations, setVariations] = useState<Map<string, ItemVariation>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    
    // Get the most recent history entry for each item
    const { data, error } = await supabase
      .from('stock_history')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching stock history:', error);
      setLoading(false);
      return;
    }

    setHistory(data || []);

    // Calculate variations - get the most recent entry for each item
    const latestByItem = new Map<string, StockHistoryEntry>();
    data?.forEach((entry) => {
      if (!latestByItem.has(entry.item_id)) {
        latestByItem.set(entry.item_id, entry);
      }
    });

    const variationsMap = new Map<string, ItemVariation>();
    latestByItem.forEach((entry, itemId) => {
      const difference = entry.new_quantity - entry.previous_quantity;
      let percentage = 0;
      
      if (entry.previous_quantity !== 0) {
        percentage = (difference / entry.previous_quantity) * 100;
      } else if (entry.new_quantity > 0) {
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

      variationsMap.set(itemId, {
        item_id: itemId,
        previous_quantity: Number(entry.previous_quantity),
        current_quantity: Number(entry.new_quantity),
        percentage,
        status,
      });
    });

    setVariations(variationsMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getVariation = (itemId: string): ItemVariation | null => {
    return variations.get(itemId) || null;
  };

  return {
    history,
    variations,
    loading,
    getVariation,
    refetch: fetchHistory,
  };
};
