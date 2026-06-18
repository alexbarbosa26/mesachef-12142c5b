import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Flame, History } from 'lucide-react';
import { CorrectionFactorCalculator } from '@/components/calculators/CorrectionFactorCalculator';
import { CookingFactorCalculator } from '@/components/calculators/CookingFactorCalculator';
import { CalculatorHistoryTable } from '@/components/calculators/CalculatorHistoryTable';

const Calculators = () => {
  const [correctionResult, setCorrectionResult] = useState<
    { costPerKgNet: number; foodName: string } | null
  >(null);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calculadoras de Produção</h1>
          <p className="text-muted-foreground">
            Calcule perdas, rendimento e custo real dos alimentos.
          </p>
        </div>

        <Tabs defaultValue="correction">
          <TabsList>
            <TabsTrigger value="correction">
              <Calculator className="w-4 h-4 mr-2" />
              Fator de correção
            </TabsTrigger>
            <TabsTrigger value="cooking">
              <Flame className="w-4 h-4 mr-2" />
              Fator de cocção
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="correction" className="mt-4">
            <CorrectionFactorCalculator onResultChange={setCorrectionResult} />
          </TabsContent>
          <TabsContent value="cooking" className="mt-4">
            <CookingFactorCalculator prefillFromCorrection={correctionResult} />
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de cálculos</CardTitle>
              </CardHeader>
              <CardContent>
                <CalculatorHistoryTable />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Calculators;