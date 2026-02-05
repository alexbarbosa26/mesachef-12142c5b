 import { useMemo } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import {
   ChartContainer,
   ChartTooltip,
   ChartTooltipContent,
   type ChartConfig,
 } from '@/components/ui/chart';
 import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
 import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { ValueTrendPoint } from '@/hooks/useStockValueTrend';
 
 interface ValueTrendChartProps {
   data: ValueTrendPoint[];
   trendPercentage: number;
   loading?: boolean;
 }
 
 const chartConfig: ChartConfig = {
   value: {
     label: 'Valor',
     color: 'hsl(var(--primary))',
   },
 };
 
 const formatCurrency = (value: number) => {
   return value.toLocaleString('pt-BR', {
     style: 'currency',
     currency: 'BRL',
   });
 };
 
 const ValueTrendChart = ({ data, trendPercentage, loading }: ValueTrendChartProps) => {
   const trendStatus = useMemo(() => {
     if (trendPercentage > 5) return 'increase';
     if (trendPercentage < -5) return 'decrease';
     return 'stable';
   }, [trendPercentage]);
 
   const TrendIcon = trendStatus === 'increase' 
     ? TrendingUp 
     : trendStatus === 'decrease' 
       ? TrendingDown 
       : Minus;
 
   const trendColor = trendStatus === 'increase'
     ? 'text-success'
     : trendStatus === 'decrease'
       ? 'text-destructive'
       : 'text-muted-foreground';
 
   if (loading) {
     return (
       <Card>
         <CardHeader>
           <CardTitle className="text-lg">Tendência de Valor</CardTitle>
         </CardHeader>
         <CardContent>
           <div className="h-[300px] flex items-center justify-center">
             <p className="text-muted-foreground">Carregando...</p>
           </div>
         </CardContent>
       </Card>
     );
   }
 
   if (data.length === 0) {
     return (
       <Card>
         <CardHeader>
           <CardTitle className="text-lg">Tendência de Valor</CardTitle>
         </CardHeader>
         <CardContent>
           <div className="h-[300px] flex items-center justify-center">
             <p className="text-muted-foreground">
               Sem dados de histórico disponíveis
             </p>
           </div>
         </CardContent>
       </Card>
     );
   }
 
   return (
     <Card>
       <CardHeader className="flex flex-row items-center justify-between">
         <CardTitle className="text-lg">Tendência de Valor (30 dias)</CardTitle>
         <div className={cn('flex items-center gap-2', trendColor)}>
           <TrendIcon className="h-5 w-5" />
           <span className="font-semibold">
             {trendPercentage >= 0 ? '+' : ''}
             {trendPercentage.toFixed(1)}%
           </span>
         </div>
       </CardHeader>
       <CardContent>
         <ChartContainer config={chartConfig} className="h-[300px] w-full">
           <AreaChart
             data={data}
             margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
           >
             <defs>
               <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                 <stop
                   offset="5%"
                   stopColor="hsl(var(--primary))"
                   stopOpacity={0.3}
                 />
                 <stop
                   offset="95%"
                   stopColor="hsl(var(--primary))"
                   stopOpacity={0}
                 />
               </linearGradient>
             </defs>
             <CartesianGrid
               strokeDasharray="3 3"
               className="stroke-muted"
               vertical={false}
             />
             <XAxis
               dataKey="formattedDate"
               tickLine={false}
               axisLine={false}
               className="text-xs"
               tickMargin={8}
             />
             <YAxis
               tickLine={false}
               axisLine={false}
               className="text-xs"
               tickFormatter={(value) =>
                 value >= 1000
                   ? `R$${(value / 1000).toFixed(0)}k`
                   : `R$${value}`
               }
               width={60}
             />
             <ChartTooltip
               content={
                 <ChartTooltipContent
                   formatter={(value) => formatCurrency(value as number)}
                 />
               }
             />
             <Area
               type="monotone"
               dataKey="value"
               stroke="hsl(var(--primary))"
               strokeWidth={2}
               fill="url(#valueGradient)"
             />
           </AreaChart>
         </ChartContainer>
       </CardContent>
     </Card>
   );
 };
 
 export default ValueTrendChart;