import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  Activity, 
  Clock, 
  Hourglass, 
  Info
} from 'lucide-react';

interface HourlyTrendChartProps {
  data: any[];
}

export function HourlyTrendChart({ data }: HourlyTrendChartProps) {
  const [selectedHourIndex, setSelectedHourIndex] = useState<number | null>(null);

  React.useEffect(() => {
    if (!data || data.length === 0) return;

    const now = new Date();
    const curHour = now.getHours();

    let bestIndex = data.length - 1;
    let minDiff = Infinity;

    data.forEach((item, index) => {
      if (!item.name) return;
      const parts = item.name.split(':');
      const h = parseInt(parts[0], 10);
      if (!isNaN(h)) {
        const diff = Math.abs(h - curHour);
        if (diff < minDiff) {
          minDiff = diff;
          bestIndex = index;
        }
      }
    });

    setSelectedHourIndex(bestIndex);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 min-h-[300px]">
        <Activity className="w-10 h-10 text-slate-300 animate-pulse mb-3" />
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Aguardando dados de fluxo...</p>
      </div>
    );
  }

  // Calculate high-level pipeline statistics
  const totalSeparado = data.reduce((acc, curr) => acc + (curr.SeparaUND || 0), 0);
  const totalConferido = data.reduce((acc, curr) => acc + (curr.CFracUND || 0), 0);
  const overallDiff = Math.max(0, totalSeparado - totalConferido);
  const averageEfficiency = totalSeparado > 0 ? Math.round((totalConferido / totalSeparado) * 100) : 0;

  // Find the hour with the worst absolute queue/bottleneck (SeparaUND - CFracUND)
  let maxBottleneckIndex = -1;
  let maxBottleneckVal = -Infinity;
  data.forEach((item, index) => {
    const diff = (item.SeparaUND || 0) - (item.CFracUND || 0);
    if (diff > maxBottleneckVal) {
      maxBottleneckVal = diff;
      maxBottleneckIndex = index;
    }
  });

  // Safe accessor for the currently focused hour details
  const activeIndex = selectedHourIndex !== null ? selectedHourIndex : data.length - 1;
  const activeHourData = data[activeIndex];
  const activeSepara = activeHourData?.SeparaUND || 0;
  const activeConferido = activeHourData?.CFracUND || 0;
  const activeDiff = activeSepara - activeConferido;
  const activeRatio = activeSepara > 0 ? Math.round((activeConferido / activeSepara) * 100) : 0;

  // Status computation for rendering hour nodes
  const getHourMeta = (item: any) => {
    const separa = item.SeparaUND || 0;
    const conferido = item.CFracUND || 0;
    const gap = separa - conferido;
    const ratio = separa > 0 ? (conferido / separa) * 100 : 0;

    let level: 'aligned' | 'warning' | 'critical' | 'starving' = 'aligned';
    let label = 'Fluxo Alinhado';
    let colorClass = 'bg-emerald-500';
    let borderClass = 'border-emerald-255';
    let textClass = 'text-emerald-600';
    let glowClass = 'bg-emerald-50/50';

    if (separa === 0 && conferido === 0) {
      level = 'starving';
      label = 'Sem Movimentação';
      colorClass = 'bg-slate-300';
      borderClass = 'border-slate-150';
      textClass = 'text-slate-400';
      glowClass = 'bg-slate-100/50';
    } else if (gap > 500) {
      level = 'critical';
      label = 'Gargalo Crítico';
      colorClass = 'bg-red-500';
      borderClass = 'border-red-200';
      textClass = 'text-red-500';
      glowClass = 'bg-red-50/50';
    } else if (gap > 100) {
      level = 'warning';
      label = 'Acúmulo Moderado';
      colorClass = 'bg-amber-500';
      borderClass = 'border-amber-200';
      textClass = 'text-amber-500';
      glowClass = 'bg-amber-50/50';
    } else if (gap < -100) {
      level = 'aligned';
      label = 'Conferência Ativa';
      colorClass = 'bg-blue-500';
      borderClass = 'border-blue-200';
      textClass = 'text-blue-550';
      glowClass = 'bg-blue-50/50';
    }

    return { level, label, colorClass, borderClass, textClass, glowClass, gap, ratio };
  };

  return (
    <div className="w-full h-full flex flex-col justify-between gap-4">
      
      {/* 1. Header Pipeline HUD (Grid optimized 2x2 to prevent horizontal squishing in split screens) */}
      <div className="grid grid-cols-2 gap-3 shrink-0">
        {/* Total Separado */}
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 flex items-center justify-between shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)]">
          <div className="min-w-0">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">Total Separado</span>
            <div className="text-base font-black text-slate-800 font-mono mt-0.5 truncate">
              {totalSeparado.toLocaleString('pt-BR')} <span className="text-[10px] font-bold text-slate-400">UN</span>
            </div>
          </div>
          <div className="p-2 bg-teal-500/10 text-teal-600 rounded-xl shrink-0">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* Total Conferido */}
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 flex items-center justify-between shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)]">
          <div className="min-w-0">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">Total Conferido</span>
            <div className="text-base font-black text-slate-800 font-mono mt-0.5 truncate">
              {totalConferido.toLocaleString('pt-BR')} <span className="text-[10px] font-bold text-slate-400">UN</span>
            </div>
          </div>
          <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* Pendente Acumulado */}
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 flex items-center justify-between shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)]">
          <div className="min-w-0">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">Acúmulo Pendente</span>
            <div className={`text-base font-black font-mono mt-0.5 truncate ${overallDiff > 500 ? 'text-red-650' : 'text-slate-800'}`}>
              {overallDiff.toLocaleString('pt-BR')} <span className="text-[10px] font-bold text-slate-400">UN</span>
            </div>
          </div>
          <div className={`p-2 rounded-xl shrink-0 ${overallDiff > 500 ? 'bg-red-500/10 text-red-650' : 'bg-slate-100 text-slate-550'}`}>
            <Hourglass className={`w-4 h-4 ${overallDiff > 500 ? 'animate-spin-slow text-red-600' : ''}`} />
          </div>
        </div>

        {/* Eficiência da Linha */}
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 flex items-center justify-between shadow-[0_2px_8px_-3px_rgba(0,0,0,0.02)]">
          <div className="min-w-0">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">Eficiência Linha</span>
            <div className="text-base font-black text-slate-800 font-mono mt-0.5 truncate">
              {averageEfficiency}%
            </div>
          </div>
          <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 2. Horizontal timeline container - Elegant and visually light */}
      <div className="relative bg-slate-50/50 rounded-2xl p-4 border border-slate-150 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)] flex-1 flex flex-col justify-between min-h-[160px]">
        {/* Subtle timeline connector bar */}
        <div className="absolute top-[48px] left-8 right-8 h-[2px] bg-slate-200 hidden md:block" />

        {/* Header inside Timeline containing Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-200/60 shrink-0">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Balanceamento do Fluxo</h4>
          </div>
          
          <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-wider text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Alinhado
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Acúmulo
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Gargalo
            </span>
          </div>
        </div>

        {/* Scrollable Node Flow */}
        <div className="flex flex-row overflow-x-auto space-x-3 pb-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent flex-1 items-center">
          {data.map((item, index) => {
            const { level, colorClass, borderClass, glowClass, gap } = getHourMeta(item);
            const isSelected = index === activeIndex;
            const isWorst = index === maxBottleneckIndex && gap > 100;

            return (
              <motion.button
                key={item.name}
                type="button"
                onClick={() => setSelectedHourIndex(index)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative flex-shrink-0 w-[105px] p-2.5 text-left rounded-xl border transition-all ${
                  isSelected 
                    ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/10' 
                    : 'bg-white/80 border-slate-200/80 hover:bg-white hover:border-slate-350'
                }`}
              >
                {/* Node hour and extreme bottleneck absolute indicators */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black text-slate-800 font-mono">{item.name}</span>
                  {isWorst && (
                    <span className="text-[7px] font-black bg-red-100 text-red-600 px-1 py-0.2 rounded uppercase tracking-wider">
                      GAP
                    </span>
                  )}
                </div>

                {/* Floating solid double horizontal pipe */}
                <div className="h-1.5 w-full bg-slate-105 rounded-full overflow-hidden flex mb-2 relative border border-slate-200/40">
                  <div 
                    style={{ width: `${Math.min(100, ((item.SeparaUND || 0) / 3000) * 100)}%` }} 
                    className="h-full bg-teal-500/70 rounded-l-full" 
                  />
                  <div 
                    style={{ width: `${Math.min(100, ((item.CFracUND || 0) / 3000) * 100)}%` }} 
                    className="h-full bg-indigo-500/75 absolute top-0 left-0" 
                  />
                  <span className={`absolute right-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full ${colorClass}`} />
                </div>

                {/* Compact diagnostics specs */}
                <div className="space-y-0.5 text-[9px] font-bold text-slate-500 leading-tight">
                  <div className="flex items-center justify-between">
                    <span>Sep:</span>
                    <span className="font-mono text-slate-800">{(item.SeparaUND || 0).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Conf:</span>
                    <span className="font-mono text-slate-800">{(item.CFracUND || 0).toLocaleString('pt-BR')}</span>
                  </div>
                  
                  {/* Balance color code indicator */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1">
                    <span className="text-[8px] font-black text-slate-400">SALDO:</span>
                    <span className={`font-mono font-black ${
                      gap > 500 ? 'text-red-600' :
                      gap > 100 ? 'text-amber-600' :
                      gap <= 0 && (item.SeparaUND > 0) ? 'text-emerald-600' : 'text-slate-500'
                    }`}>
                      {gap > 0 ? `+${gap}` : gap}
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 3. Micro-balancing Diagnosis HUD Panel (Optimized with solid anti-overlap and light background harmony) */}
      <AnimatePresence mode="wait">
        {activeHourData && (
          <motion.div
            key={activeHourData.name}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="p-4 bg-gradient-to-br from-indigo-50/20 to-slate-50/20 text-slate-800 rounded-2xl border border-slate-150 shadow-[0_2px_12px_rgba(0,0,0,0.015)] flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0"
          >
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 font-mono text-[10px] font-black rounded-lg">
                  {activeHourData.name}h
                </span>
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-indigo-550" /> Diagnose Operacional
                </span>
              </div>

              {/* Flex row with minimum spacing guarantees no horizontal text overlaps */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5">
                <div className="min-w-[80px]">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Separação</span>
                  <p className="text-sm font-black font-mono text-teal-600">
                    {activeSepara.toLocaleString('pt-BR')} <span className="text-[9px] font-bold text-slate-400">UN</span>
                  </p>
                </div>
                <div className="min-w-[100px]">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Conferência (Aprov.)</span>
                  <p className="text-sm font-black font-mono text-indigo-600">
                    {activeConferido.toLocaleString('pt-BR')} <span className="text-[9px] font-extrabold text-indigo-400">({activeRatio}%)</span>
                  </p>
                </div>
                <div className="min-w-[80px]">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Saldo Acumulado</span>
                  <p className={`text-sm font-black font-mono ${
                    activeDiff > 500 ? 'text-red-600' :
                    activeDiff > 100 ? 'text-amber-600' :
                    activeDiff <= 0 && activeSepara > 0 ? 'text-emerald-600' : 'text-slate-600'
                  }`}>
                    {activeDiff > 0 ? `+${activeDiff.toLocaleString('pt-BR')}` : activeDiff.toLocaleString('pt-BR')} <span className="text-[9px] font-bold text-slate-400">UN</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Tight text advisory notice */}
            <div className="flex-1 md:max-w-[190px] p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_4px_rgba(0,0,0,0.01)] text-[10px] font-semibold text-slate-600 leading-normal shrink-0">
              {activeDiff > 500 ? (
                <span>
                  <strong className="text-red-500 uppercase block text-[8px] font-black tracking-wider mb-0.5">Vazão Crítica:</strong> 
                  Conferência muito lenta. Sugerido realocar separadores para conferência.
                </span>
              ) : activeDiff > 100 ? (
                <span>
                  <strong className="text-amber-600 uppercase block text-[8px] font-black tracking-wider mb-0.5">Aviso de Acúmulo:</strong> 
                  Volume da esteira acumulando moderadamente nesta hora.
                </span>
              ) : activeDiff < -50 && activeSepara > 0 ? (
                <span>
                  <strong className="text-blue-600 uppercase block text-[8px] font-black tracking-wider mb-0.5">Aceleração Alta:</strong> 
                  Conferência limpando pedidos acumulados anteriormente.
                </span>
              ) : activeSepara > 0 ? (
                <span>
                  <strong className="text-emerald-600 uppercase block text-[8px] font-black tracking-wider mb-0.5">Equilibrado:</strong> 
                  Cadência ideal. Sincronização e balanceamento perfeitos.
                </span>
              ) : (
                <span className="text-slate-400 font-medium italic block text-center py-1">
                  Sem movimentação ativa.
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



