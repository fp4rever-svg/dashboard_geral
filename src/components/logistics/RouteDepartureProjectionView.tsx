import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLogisticsData } from '../../hooks/useLogisticsData';
import { useRouteFlowData } from '../../hooks/useRouteFlowData';
import { 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  Sliders, 
  Activity, 
  RotateCcw, 
  HelpCircle, 
  Info,
  Calendar,
  AlertOctagon,
  TrendingDown
} from 'lucide-react';

export function RouteDepartureProjectionView() {
  const { rows, loading: loadingLogistics } = useLogisticsData();
  const { routesData, loading: loadingFlow } = useRouteFlowData();

  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'delayed' | 'ontime' | 'pending'>('all');

  // Sliders state with localStorage synchronization
  const [productivity, setProductivity] = useState(() => {
    const saved = localStorage.getItem('simulation_productivity');
    return saved ? parseInt(saved, 10) : 150;
  });

  const [penalty, setPenalty] = useState(() => {
    const saved = localStorage.getItem('simulation_rec_falta_penalty');
    return saved ? parseInt(saved, 10) : 10;
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  // Periodically refresh current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Listen to storage events to synchronize changes from other tabs
  useEffect(() => {
    const handleStorage = () => {
      const prod = localStorage.getItem('simulation_productivity');
      if (prod) setProductivity(parseInt(prod, 10));

      const pen = localStorage.getItem('simulation_rec_falta_penalty');
      if (pen) setPenalty(parseInt(pen, 10));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleProductivityChange = (val: number) => {
    setProductivity(val);
    localStorage.setItem('simulation_productivity', String(val));
    window.dispatchEvent(new Event('storage'));
  };

  const handlePenaltyChange = (val: number) => {
    setPenalty(val);
    localStorage.setItem('simulation_rec_falta_penalty', String(val));
    window.dispatchEvent(new Event('storage'));
  };

  const handleResetSettings = () => {
    handleProductivityChange(150);
    handlePenaltyChange(10);
  };

  // Compute projection records
  const projections = useMemo(() => {
    return rows.map(row => {
      const routeId = row.rotas;
      const dbInfo = routesData[routeId];
      const recFaltas = dbInfo?.zwm?.recFaltas ?? 0;
      const docsAtuais = row.docsAtuais;
      const docsIniciais = row.docsIniciais;
      const originalHorarios = row.horarios;

      if (row.status === 'Finalizado' || docsAtuais === 0) {
        return {
          ...row,
          recFaltas,
          projectedTimeStr: row.horarioReal || 'Finalizado',
          minutesDiff: 0,
          isDelayed: false,
          processingTimeMin: 0,
          penaltyMin: 0,
          totalRemainingMin: 0,
          statusLabel: 'Concluído'
        };
      }

      // Calculate processing time in minutes
      const processingTimeMin = Math.round((docsAtuais / productivity) * 60);
      const penaltyMin = recFaltas * penalty;
      const totalRemainingMin = processingTimeMin + penaltyMin;

      // Projected departure time is current time + total remaining minutes
      const projectedDate = new Date(currentTime.getTime() + totalRemainingMin * 60 * 1000);
      
      const hProj = projectedDate.getHours();
      const mProj = projectedDate.getMinutes();
      const sProj = projectedDate.getSeconds();
      const projectedTimeStr = `${String(hProj).padStart(2, '0')}:${String(mProj).padStart(2, '0')}:${String(sProj).padStart(2, '0')}`;

      // Scheduled programmed time
      const [hProg, mProg, sProg] = originalHorarios.split(':').map(Number);
      const programmedDate = new Date(currentTime.getTime());
      programmedDate.setHours(hProg, mProg || 0, sProg || 0, 0);

      // Simple guard for crossings over midnight
      if (currentTime.getHours() >= 22 && hProg < 10) {
        programmedDate.setDate(programmedDate.getDate() + 1);
      } else if (currentTime.getHours() < 10 && hProg > 20) {
        programmedDate.setDate(programmedDate.getDate() - 1);
      }

      const diffMs = projectedDate.getTime() - programmedDate.getTime();
      const minutesDiff = Math.round(diffMs / (60 * 1000));
      const isDelayed = minutesDiff > 0;

      return {
        ...row,
        recFaltas,
        projectedTimeStr,
        minutesDiff,
        isDelayed,
        processingTimeMin,
        penaltyMin,
        totalRemainingMin,
        statusLabel: isDelayed ? 'Atraso Projetado' : 'No Prazo'
      };
    });
  }, [rows, routesData, productivity, penalty, currentTime]);

  // Sort projections as requested by programmed hours
  const sortedProjections = useMemo(() => {
    return [...projections].sort((a, b) => {
      // Sort priority or by programmed departure time
      const toMinutes = (timeStr: string) => {
        const [h, m, s] = timeStr.split(':').map(Number);
        return h * 60 + (m || 0) + (s || 0) / 60;
      };
      
      const aMin = toMinutes(a.horarios);
      const bMin = toMinutes(b.horarios);

      // Handle shift crossings (sort early morning hours after late night hours if current is night)
      const currentH = currentTime.getHours();
      const isNight = currentH >= 18 || currentH < 6;

      if (isNight) {
        const adjust = (min: number) => min < 12 * 60 ? min + 24 * 60 : min;
        return adjust(aMin) - adjust(bMin);
      }
      return aMin - bMin;
    });
  }, [projections, currentTime]);

  // Apply filters and searches
  const filteredProjections = useMemo(() => {
    return sortedProjections.filter(p => {
      const matchesSearch = p.rotas.toLowerCase().includes(searchTerm.toLowerCase());
      
      const isFinished = p.docsAtuais === 0;
      if (filterMode === 'delayed') {
        return matchesSearch && !isFinished && p.isDelayed;
      }
      if (filterMode === 'ontime') {
        return matchesSearch && !isFinished && !p.isDelayed;
      }
      if (filterMode === 'pending') {
        return matchesSearch && !isFinished;
      }
      
      return matchesSearch;
    });
  }, [sortedProjections, searchTerm, filterMode]);

  // KPI calculations
  const stats = useMemo(() => {
    const active = projections.filter(p => p.docsAtuais > 0);
    const totalActive = active.length;
    const delayedCount = active.filter(p => p.isDelayed).length;
    const onTimeCount = active.filter(p => !p.isDelayed).length;
    const finishedCount = projections.filter(p => p.docsAtuais === 0).length;
    const totalBoxesPending = active.reduce((acc, p) => acc + p.docsAtuais, 0);
    const totalRecFaltas = active.reduce((acc, p) => acc + p.recFaltas, 0);

    return {
      totalActive,
      delayedCount,
      onTimeCount,
      finishedCount,
      totalBoxesPending,
      totalRecFaltas
    };
  }, [projections]);

  const isLoading = loadingLogistics || loadingFlow;

  return (
    <div className="space-y-6" id="projection-container">
      {/* 1. Header with simulation configurations */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-xl border border-slate-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
                <Sliders className="w-5 h-5 animate-pulse" />
              </span>
              <h2 className="text-xl font-black text-white tracking-tight uppercase">Simulador de Projeções de Partidas</h2>
            </div>
            <p className="text-slate-300 text-xs max-w-xl leading-relaxed">
              O simulador cruza o volume pendente de caixas da aba <strong className="text-blue-400">Log. Tabela</strong> com as ocorrências de <strong className="text-blue-400">Rec Falta</strong> da aba de <strong className="text-blue-400">Gestão de Faltas</strong>. Ajuste os coeficientes operacionais abaixo para recalcular as estimativas das partidas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] uppercase font-black tracking-wider text-slate-400">Última atualização</div>
              <div className="text-sm font-semibold font-mono text-slate-200">
                {currentTime.toLocaleTimeString('pt-BR')}
              </div>
            </div>
            <button 
              onClick={handleResetSettings}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 border border-slate-700 transition"
              title="Restaurar valores padrão"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Resetar
            </button>
          </div>
        </div>

        {/* Coeficientes Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-700/60">
          {/* Slider 1: Produtividade de Separação */}
          <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">Produtividade Operacional</span>
              </div>
              <span className="bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold px-2 py-0.5 rounded-md">
                {productivity} caixas / hora
              </span>
            </div>
            <input 
              type="range"
              min="50"
              max="600"
              step="10"
              value={productivity}
              onChange={(e) => handleProductivityChange(parseInt(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Mín: 50 cx/h</span>
              <span>Médio: 150 cx/h (Padrão)</span>
              <span>Máx: 600 cx/h</span>
            </div>
          </div>

          {/* Slider 2: Penalidade de Rec Faltas */}
          <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">Gargalo por Rec. Falta pendente</span>
              </div>
              <span className="bg-amber-500/20 text-amber-400 text-xs font-mono font-bold px-2 py-0.5 rounded-md">
                +{penalty} min / pacote
              </span>
            </div>
            <input 
              type="range"
              min="0"
              max="60"
              step="1"
              value={penalty}
              onChange={(e) => handlePenaltyChange(parseInt(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Sem penalidade (0m)</span>
              <span>Padrão 10m / falta</span>
              <span>Crítico: 60m / falta</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Panels */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 border border-slate-200 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Atrasadas */}
          <div className="bg-red-50 border border-red-200 rounded-3xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[10px] font-black uppercase text-red-600 tracking-wider">Atraso Projetado</div>
              <div className="text-2xl font-black text-red-900 font-mono mt-1">{stats.delayedCount}</div>
              <div className="text-[10px] text-red-700 mt-1">Acima do prazo programado</div>
            </div>
            <span className="p-3 bg-red-100 text-red-600 rounded-2xl">
              <AlertOctagon className="w-6 h-6" />
            </span>
          </div>

          {/* KPI 2: No Prazo */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">No Prazo Projetado</div>
              <div className="text-2xl font-black text-emerald-900 font-mono mt-1">{stats.onTimeCount}</div>
              <div className="text-[10px] text-emerald-700 mt-1">Rotas em andamento controladas</div>
            </div>
            <span className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
              <CheckCircle className="w-6 h-6" />
            </span>
          </div>

          {/* KPI 3: Caixa Pendente */}
          <div className="bg-slate-50 border border-slate-150 rounded-3xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Volume Corrente</div>
              <div className="text-2xl font-black text-slate-800 font-mono mt-1">{stats.totalBoxesPending}</div>
              <div className="text-[10px] text-slate-500 mt-1">Caixas pendentes no fluxo</div>
            </div>
            <span className="p-3 bg-slate-100 text-slate-650 rounded-2xl">
              <TrendingUp className="w-6 h-6 text-slate-700" />
            </span>
          </div>

          {/* KPI 4: Rec Faltas */}
          <div className="bg-amber-50 border border-amber-150 rounded-3xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <div className="text-[10px] font-black uppercase text-amber-700 tracking-wider font-bold">Ocorrências Rec Falta</div>
              <div className="text-2xl font-black text-amber-900 font-mono mt-1">{stats.totalRecFaltas}</div>
              <div className="text-[10px] text-amber-800 mt-1">Impactos computados</div>
            </div>
            <span className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
              <Info className="w-6 h-6" />
            </span>
          </div>
        </div>
      )}

      {/* 3. Search Bar and Table Controls */}
      <div className="bg-white rounded-3xl border border-slate-150 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider">Lista Priorizada de Projeção de Partidas</h3>
            <p className="text-slate-400 text-xs mt-1">Prioridade ordenada de acordo com seu horário de saída programado.</p>
          </div>

          {/* Tab Filter Button Row */}
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setFilterMode('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${filterMode === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
            >
              Todas ({sortedProjections.length})
            </button>
            <button 
              onClick={() => setFilterMode('delayed')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${filterMode === 'delayed' ? 'bg-red-650 text-white shadow-sm' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
            >
              Projetado Atraso ({sortedProjections.filter(p => p.docsAtuais > 0 && p.isDelayed).length})
            </button>
            <button 
              onClick={() => setFilterMode('ontime')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${filterMode === 'ontime' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
            >
              Projetado Prazo ({sortedProjections.filter(p => p.docsAtuais > 0 && !p.isDelayed).length})
            </button>
            <button 
              onClick={() => setFilterMode('pending')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${filterMode === 'pending' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              Ativas ({stats.totalActive})
            </button>
          </div>
        </div>

        {/* Search tool */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input 
            type="text"
            placeholder="Pesquisar rota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 outline-none text-sm font-semibold text-slate-850 placeholder:text-slate-400 focus:border-slate-350 focus:bg-white transition"
          />
        </div>

        {/* Content Table */}
        <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-wider border-b border-slate-150">
                <tr>
                  <th className="px-6 py-4">Rota</th>
                  <th className="px-6 py-4">Prog. Saída</th>
                  <th className="px-6 py-4">Cx Pendentes</th>
                  <th className="px-6 py-4">Rec Faltas (ZWM)</th>
                  <th className="px-6 py-4">Tratamento Faltas</th>
                  <th className="px-6 py-4">Est. Separação</th>
                  <th className="px-6 py-4">Partida Estimada</th>
                  <th className="px-6 py-4 text-center">Status Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                <AnimatePresence mode="popLayout">
                  {filteredProjections.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        Nenhuma rota encontrada nessa seleção.
                      </td>
                    </tr>
                  ) : (
                    filteredProjections.map((p, index) => {
                      const isFinished = p.docsAtuais === 0;

                      return (
                        <motion.tr 
                          key={p.rotas}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15, delay: Math.min(10, index) * 0.03 }}
                          className={`hover:bg-slate-50 transition-colors ${isFinished ? 'bg-slate-50 font-medium' : ''}`}
                        >
                          {/* ROTA */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 font-black text-slate-950">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                              {p.rotas}
                            </div>
                          </td>

                          {/* PROGRAMMED DEPARTURE */}
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs font-black text-slate-600 bg-slate-100 px-2 py-1 rounded">
                              {p.horarios}
                            </span>
                          </td>

                          {/* PENDING BOXES */}
                          <td className="px-6 py-4">
                            {isFinished ? (
                              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> 100% Concluída
                              </span>
                            ) : (
                              <div className="space-y-1">
                                <div className="font-mono font-bold text-slate-800 text-xs">
                                  {p.docsAtuais} / {p.docsIniciais}
                                </div>
                                <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-blue-600 h-1.5 rounded-full" 
                                    style={{ width: `${Math.min(100, Math.max(0, ((p.docsIniciais - p.docsAtuais) / p.docsIniciais) * 100))}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </td>

                          {/* REC FALTAS */}
                          <td className="px-6 py-4">
                            {p.recFaltas > 0 ? (
                              <span className="bg-amber-100 text-amber-800 font-mono text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-max">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                {p.recFaltas} pacote{p.recFaltas > 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>

                          {/* PENALTY COMPOSER */}
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">
                            {p.recFaltas > 0 && !isFinished ? (
                              <span className="text-amber-700 font-bold">
                                +{p.penaltyMin} min
                              </span>
                            ) : (
                              <span>0 min</span>
                            )}
                          </td>

                          {/* SEPARATION TIME */}
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">
                            {!isFinished ? (
                              <span>{p.processingTimeMin} min</span>
                            ) : (
                              <span>-</span>
                            )}
                          </td>

                          {/* ESTIMATED DEPARTURE */}
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {p.projectedTimeStr}
                            </span>
                          </td>

                          {/* STATUS BADGE */}
                          <td className="px-6 py-4 text-center">
                            {isFinished ? (
                              <span className="inline-flex px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                                No Pátio / Expedida
                              </span>
                            ) : p.isDelayed ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex px-2.5 py-1 bg-red-100 text-red-700 text-xs font-black rounded-full uppercase tracking-wider">
                                  ⚠️ Atraso: +{p.minutesDiff} min
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full uppercase tracking-wider">
                                ✅ No Horário
                              </span>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
