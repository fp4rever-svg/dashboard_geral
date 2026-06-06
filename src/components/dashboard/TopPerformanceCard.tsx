import React from 'react';
import { useUserPerformance } from '../../hooks/useUserPerformance';
import { Trophy, Medal, Crown, Loader2, Users } from 'lucide-react';
import { motion } from 'motion/react';

export function TopPerformanceCard() {
  const { data, loading } = useUserPerformance();

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
      className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
          <Trophy className="w-6 h-6 text-amber-500 fill-amber-100" />
          TOP 5 Performance
        </h3>
        <span className="text-[10px] font-black text-slate-400 bg-slate-100 border border-slate-200 rounded-full px-3 py-1 uppercase tracking-widest">
          Hoje
        </span>
      </div>

      {top5.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-100">
          <Users className="w-12 h-12 text-slate-300 mb-2" />
          <p className="text-slate-400 italic text-sm">Dados de performance indisponíveis no momento.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-3">
          {/* Header */}
          <div className="grid grid-cols-12 text-[10px] font-black text-slate-400 uppercase tracking-wider px-3 pb-1 border-b border-slate-50">
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
              className={`grid grid-cols-12 items-center px-3 py-3 rounded-2xl border border-transparent transition-colors ${
                index === 0 
                  ? 'bg-gradient-to-r from-amber-50/40 via-amber-50/10 to-transparent border-amber-100/50' 
                  : ''
              }`}
            >
              <div className="col-span-1">
                {getRankBadge(index)}
              </div>
              
              <div className="col-span-3">
                <span className="text-sm font-black text-slate-900 tracking-tight block">
                  {row.user}
                </span>
              </div>
              
              <div className="col-span-2 text-right font-semibold text-slate-600 text-sm">
                {row.recordsUPM.toLocaleString('pt-BR')}
              </div>
              
              <div className="col-span-2 text-right font-semibold text-slate-600 text-sm">
                {row.conferredQty.toLocaleString('pt-BR')}
              </div>
              
              <div className="col-span-2 text-right">
                <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-0.5 inline-block">
                  {row.prodPct}
                </span>
              </div>
              
              <div className="col-span-2 text-right">
                <span className="text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2 py-0.5 inline-block">
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
