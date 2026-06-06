import { Package, Clock, Box, LayoutGrid, TrendingUp, Calendar } from 'lucide-react';
import { KPICard } from '../dashboard/KPICard';
import { HourlyTrendChart } from '../dashboard/HourlyTrendChart';
import { ProductionTrendChart } from '../dashboard/ProductionTrendChart';
import { TopPerformanceCard } from './TopPerformanceCard';
import { motion } from 'motion/react';
import { useUserPerformance } from '../../hooks/useUserPerformance';

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
  const { period } = useUserPerformance();

  return (
    <div className="space-y-8">
      {period && (period.startDate || period.endDate) && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-100 text-blue-800 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/15">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-black tracking-tight text-blue-950">Período de Avaliação Ativo</h4>
              <p className="text-xs text-blue-700 font-bold mt-0.5">Os dados de performance individual desta tela correspondem ao período de monitoramento configurado.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-blue-100 px-5 py-3 rounded-2xl shadow-sm text-sm font-black text-blue-900 border-dashed">
            <span>De:</span>
            <span className="text-blue-600 px-1 bg-blue-50 border border-blue-100/50 rounded-lg">{period.startDate || '?'}</span>
            <span className="text-slate-400 font-medium">Até:</span>
            <span className="text-blue-600 px-1 bg-blue-50 border border-blue-100/50 rounded-lg">{period.endDate || '?'}</span>
          </div>
        </motion.div>
      )}

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

      <TopPerformanceCard />
    </div>
  );
}
