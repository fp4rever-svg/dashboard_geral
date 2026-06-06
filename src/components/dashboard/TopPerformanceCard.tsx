import React from 'react';
import { useUserPerformance } from '../../hooks/useUserPerformance';
import { Trophy, Medal, Crown, Loader2, Users } from 'lucide-react';
import { motion } from 'motion/react';

export function TopPerformanceCard() {
  const { data, period, loading } = useUserPerformance();

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-sm text-slate-500 font-medium">Carregando ranking...</p>
      </div>
    );
  }

  // Get only the first 5 rows
  const top5 = data.slice(0, 5);

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="flex items-center justify-center bg-amber-50 border border-amber-200 text-amber-600 rounded-lg p-1.5 w-8 h-8 relative shadow-sm">
            <Crown className="w-4 h-4" />
          </div>
        );
      case 1:
        return (
          <div className="flex items-center justify-center bg-slate-100 border border-slate-200 text-slate-600 rounded-lg p-1.5 w-8 h-8 relative shadow-sm">
            <Medal className="w-4 h-4" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center bg-orange-50 border border-orange-200 text-orange-700 rounded-lg p-1.5 w-8 h-8 relative shadow-sm">
            <Medal className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center bg-slate-50 border border-slate-100 text-slate-500 font-black text-xs rounded-lg w-8 h-8">
            {index + 1}º
          </div>
        );
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2.5">
            <Trophy className="w-5.5 h-5.5 text-amber-500 fill-amber-100" />
            TOP 5 Performance
          </h3>
          {period && (period.startDate || period.endDate) && (
            <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">
              Período: <span className="font-extrabold text-slate-700">{period.startDate || '?'}</span> até <span className="font-extrabold text-slate-700">{period.endDate || '?'}</span>
            </p>
          )}
        </div>
        <span className="text-[8px] font-black text-slate-400 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5 uppercase tracking-widest">
          Hoje
        </span>
      </div>

      {top5.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-100">
          <Users className="w-10 h-10 text-slate-300 mb-1.5" />
          <p className="text-slate-400 italic text-[11px]">Dados de performance indisponíveis no momento.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-2">
          {/* Header */}
          <div className="grid grid-cols-12 text-[9px] font-black text-slate-400 uppercase tracking-wider px-2 pb-1 border-b border-slate-50">
            <div className="col-span-1">Ref</div>
            <div className="col-span-3">Colaborador</div>
            <div className="col-span-2 text-right">Reg. UPM</div>
            <div className="col-span-2 text-right">Qtd Conf.</div>
            <div className="col-span-2 text-right">% Prod</div>
            <div className="col-span-2 text-right">% UPM</div>
          </div>

          {/* List Rows */}
          {top5.map((row, index) => (
            <motion.div 
              key={row.id || index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.01, backgroundColor: 'rgba(248, 250, 252, 0.5)' }}
              className={`grid grid-cols-12 items-center px-2 py-1.5 rounded-xl border border-transparent transition-colors ${
                index === 0 
                  ? 'bg-gradient-to-r from-amber-50/40 via-amber-50/10 to-transparent border-amber-100/50' 
                  : ''
              }`}
            >
              <div className="col-span-1">
                {getRankBadge(index)}
              </div>
              
              <div className="col-span-3 pr-1">
                <span className="text-xs font-black text-slate-900 tracking-tight block truncate" title={row.user}>
                  {row.user}
                </span>
              </div>
              
              <div className="col-span-2 text-right font-semibold text-slate-600 text-xs text-slate-700/80">
                {row.recordsUPM.toLocaleString('pt-BR')}
              </div>
              
              <div className="col-span-2 text-right font-semibold text-slate-600 text-xs text-slate-700/80">
                {row.conferredQty.toLocaleString('pt-BR')}
              </div>
              
              <div className="col-span-2 text-right">
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100/60 rounded-md px-1.5 py-0.5 inline-block">
                  {row.prodPct}
                </span>
              </div>
              
              <div className="col-span-2 text-right">
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-100/60 rounded-md px-1.5 py-0.5 inline-block">
                  {row.upmPct}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
