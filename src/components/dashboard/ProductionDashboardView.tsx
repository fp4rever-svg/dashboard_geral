import { Package, Clock, Box, LayoutGrid, TrendingUp } from 'lucide-react';
import { KPICard } from '../dashboard/KPICard';
import { HourlyTrendChart } from '../dashboard/HourlyTrendChart';
import { ProductionTrendChart } from '../dashboard/ProductionTrendChart';
import { motion } from 'motion/react';

interface ProductionDashboardViewProps {
  totals: {
    totalCubagem: number;
    totalSeparaACS: number;
    totalSeparaUND: number;
    totalCFracUND: number;
  };
  lastHourACS: string;
  chartData: any[];
  formatValue: (val: number) => string;
  otsPadrao: number;
}

export function ProductionDashboardView({ totals, lastHourACS, chartData, formatValue, otsPadrao }: ProductionDashboardViewProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total Cubagem ACS" value={formatValue(totals.totalCubagem)} icon={Package} trend="+12,5%" />
        <KPICard title="SEPARAÇÃO ACESSOS / ULTIMA HORA" value={lastHourACS} icon={Clock} />
        <KPICard title="Total Separa.UND" value={formatValue(totals.totalSeparaUND)} icon={Box} status="Ativo" />
        <KPICard title="Total C.Frac.UND" value={formatValue(totals.totalCFracUND)} icon={LayoutGrid} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm"
        >
          <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <LayoutGrid className="w-6 h-6 text-blue-600" />
              Tendência de Separação (UNID)
          </h3>
          <div className="h-[400px]">
              <HourlyTrendChart data={chartData} />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm"
        >
          <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
              Projeção de Performance (ACS)
          </h3>
          <div className="h-[400px]">
              <ProductionTrendChart data={chartData} target={otsPadrao} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
