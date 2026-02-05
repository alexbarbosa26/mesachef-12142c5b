 import { useState, useEffect, useMemo } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { StockItem } from '@/hooks/useStockData';
 import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
 
 export interface ValueTrendPoint {
   date: string;
   value: number;
   formattedDate: string;
 }
 
 interface StockHistoryEntry {
   id: string;
   item_id: string;
   previous_quantity: number;
   new_quantity: number;
   created_at: string;
 }
 
 export const useStockValueTrend = (stockItems: StockItem[], days: number = 30) => {
   const [history, setHistory] = useState<StockHistoryEntry[]>([]);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     const fetchHistory = async () => {
       setLoading(true);
       const startDate = subDays(new Date(), days).toISOString();
       
       const { data, error } = await supabase
         .from('stock_history')
         .select('id, item_id, previous_quantity, new_quantity, created_at')
         .gte('created_at', startDate)
         .order('created_at', { ascending: true });
 
       if (error) {
         console.error('Error fetching stock history:', error);
       } else {
         setHistory(data || []);
       }
       setLoading(false);
     };
 
     fetchHistory();
   }, [days]);
 
   const trendData = useMemo(() => {
     if (stockItems.length === 0) return [];
 
     const today = startOfDay(new Date());
     const startDate = startOfDay(subDays(today, days - 1));
     const dateRange = eachDayOfInterval({ start: startDate, end: today });
 
     // Create item value map
     const itemValueMap = new Map<string, number>();
     stockItems.forEach(item => {
       itemValueMap.set(item.id, item.value || 0);
     });
 
     // Create current quantity map (starting point)
     const currentQuantityMap = new Map<string, number>();
     stockItems.forEach(item => {
       currentQuantityMap.set(item.id, item.current_quantity);
     });
 
     // Group history by date and item
     const historyByDate = new Map<string, Map<string, { from: number; to: number }>>();
     history.forEach(entry => {
       const dateKey = format(new Date(entry.created_at), 'yyyy-MM-dd');
       if (!historyByDate.has(dateKey)) {
         historyByDate.set(dateKey, new Map());
       }
       const dateMap = historyByDate.get(dateKey)!;
       // Keep the last change of the day for each item
       dateMap.set(entry.item_id, {
         from: entry.previous_quantity,
         to: entry.new_quantity,
       });
     });
 
     // Calculate historical quantities by working backwards from current
     const result: ValueTrendPoint[] = [];
     
     // Start from today and work backwards
     const quantitySnapshot = new Map(currentQuantityMap);
     
     for (let i = dateRange.length - 1; i >= 0; i--) {
       const date = dateRange[i];
       const dateKey = format(date, 'yyyy-MM-dd');
       
       // Calculate total value for this day
       let totalValue = 0;
       quantitySnapshot.forEach((qty, itemId) => {
         const unitValue = itemValueMap.get(itemId) || 0;
         totalValue += qty * unitValue;
       });
 
       result.unshift({
         date: dateKey,
         value: totalValue,
         formattedDate: format(date, 'dd/MM'),
       });
 
       // Apply reverse changes (go back in time)
       const dayChanges = historyByDate.get(dateKey);
       if (dayChanges) {
         dayChanges.forEach((change, itemId) => {
           // Revert to previous quantity
           quantitySnapshot.set(itemId, change.from);
         });
       }
     }
 
     return result;
   }, [stockItems, history, days]);
 
   // Calculate trend percentage
   const trendPercentage = useMemo(() => {
     if (trendData.length < 2) return 0;
     const first = trendData[0].value;
     const last = trendData[trendData.length - 1].value;
     if (first === 0) return last > 0 ? 100 : 0;
     return ((last - first) / first) * 100;
   }, [trendData]);
 
   return {
     trendData,
     trendPercentage,
     loading,
   };
 };