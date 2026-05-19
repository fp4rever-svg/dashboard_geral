import React from 'react';
import { useAbsenteeismData } from '../../hooks/useAbsenteeismData';
import { Users, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export function AbsenteeismManagement() {
  const { rows, loading, updateRow, totals } = useAbsenteeismData();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Gestão de Absenteísmo</h2>
            <p className="text-sm text-slate-500">Controle de faltas e presença por setor</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Setor</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Faltas</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Colaboradores</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">% Absenteísmo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row) => (
                <tr key={row.setor} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4">
                    <span className="font-bold text-slate-700">{row.setor}</span>
                  </td>
                  <td className="p-4">
                    <input
                      type="number"
                      min="0"
                      value={row.faltas}
                      onChange={(e) => updateRow(row.setor, 'faltas', parseInt(e.target.value) || 0)}
                      className="w-24 px-3 py-1.5 bg-slate-100 border-none rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </td>
                  <td className="p-4">
                    <input
                      type="number"
                      min="1"
                      value={row.total}
                      onChange={(e) => updateRow(row.setor, 'total', parseInt(e.target.value) || 0)}
                      className="w-24 px-3 py-1.5 bg-slate-100 border-none rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`text-lg font-black tracking-tighter ${row.percentage > 5 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {row.percentage.toFixed(2)}%
                      </span>
                      <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${row.percentage > 5 ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(row.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white border-t-4 border-slate-100">
                <td className="p-5 font-black uppercase text-[11px] tracking-widest rounded-bl-[1.5rem]">Total Geral</td>
                <td className="p-5 font-black text-lg">{totals.faltas}</td>
                <td className="p-5 font-black text-lg">{totals.total}</td>
                <td className="p-5 text-right font-black text-2xl tracking-tighter rounded-br-[1.5rem] text-indigo-400">
                  {totals.percentage.toFixed(2)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl flex gap-4 items-start"
      >
        <AlertCircle className="w-6 h-6 text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-black text-indigo-900 uppercase tracking-widest">Dica de Gestão</h4>
          <p className="text-sm text-indigo-700 leading-relaxed">
            Mantenha os dados de absenteísmo atualizados diariamente para garantir a precisão dos indicadores de <strong>Saúde da Operação</strong>. 
            Uma taxa acima de 5% pode impactar significativamente a produtividade da expedição.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
