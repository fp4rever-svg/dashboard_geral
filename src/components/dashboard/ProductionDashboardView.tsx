import { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Clock, 
  Box, 
  LayoutGrid, 
  TrendingUp, 
  Calendar, 
  Trophy, 
  Medal, 
  Crown, 
  Play, 
  Pause, 
  Tv, 
  ChevronRight, 
  Activity, 
  Flame, 
  Sparkles, 
  Award,
  RefreshCw
} from 'lucide-react';
import { KPICard } from '../dashboard/KPICard';
import { HourlyTrendChart } from '../dashboard/HourlyTrendChart';
import { ProductionTrendChart } from '../dashboard/ProductionTrendChart';
import { useUserPerformance } from '../../hooks/useUserPerformance';
import { motion, AnimatePresence } from 'motion/react';

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
  forcedSlide?: number; // Optional prop to override the current active slide externally
}

export function ProductionDashboardView({ totals, lastHourACS, chartData, formatValue, otsPadrao, forcedSlide }: ProductionDashboardViewProps) {
  const { period, data: rawPerformanceData, loading: userPerformanceLoading } = useUserPerformance();

  // Carousel & TV Loop States
  const [isTvActive, setIsTvActive] = useState(true);
  const [internalSlide, setInternalSlide] = useState(0); // 0: Charts, 1: Immersive Ranking
  const [loopInterval, setLoopInterval] = useState(15000); // 15 seconds default
  const [remainingTime, setRemainingTime] = useState(loopInterval);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  // Top 5 calculation
  const top5 = rawPerformanceData ? rawPerformanceData.slice(0, 5) : [];

  // Determine current active slide (forced externally or managed internally)
  const currentSlide = forcedSlide !== undefined ? forcedSlide : internalSlide;

  // Smooth Countdown Loop using RequestAnimationFrame to prevent drift and stutter
  useEffect(() => {
    if (!isTvActive || forcedSlide !== undefined) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    lastTickRef.current = Date.now();
    setRemainingTime(loopInterval);

    const updateTimer = () => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      setRemainingTime((prev) => {
        const next = prev - delta;
        if (next <= 0) {
          // Slide Transition
          setInternalSlide((current) => (current === 0 ? 1 : 0));
          return loopInterval;
        }
        return next;
      });

      animationFrameRef.current = requestAnimationFrame(updateTimer);
    };

    animationFrameRef.current = requestAnimationFrame(updateTimer);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isTvActive, loopInterval, internalSlide, forcedSlide]);

  const progressPercentage = isTvActive ? Math.max(0, Math.min(100, (remainingTime / loopInterval) * 100)) : 100;

  // Visual medal / trophy renders for the grand Olympic podium
  const renderPodiumTitle = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="flex flex-col items-center gap-1">
            <div className="relative">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="w-16 h-16 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-400/35 border-2 border-white relative z-10"
              >
                <Crown className="w-9 h-9 text-white drop-shadow-md fill-amber-100/20" />
              </motion.div>
              <div className="absolute -inset-1.5 bg-amber-400 rounded-2xl blur opacity-30 animate-pulse"></div>
            </div>
            <span className="text-[10px] font-black uppercase text-amber-500 tracking-[0.2em] mt-1">1º Lugar</span>
          </div>
        );
      case 1:
        return (
          <div className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 bg-gradient-to-tr from-slate-400 via-slate-200 to-slate-500 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-300/35 border-2 border-white">
              <Medal className="w-7 h-7 text-white drop-shadow-md" />
            </div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-1">2º Lugar</span>
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 bg-gradient-to-tr from-amber-700 via-orange-300 to-amber-800 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-700/35 border-2 border-white">
              <Medal className="w-7 h-7 text-white drop-shadow-md" />
            </div>
            <span className="text-[10px] font-black uppercase text-orange-700 tracking-[0.2em] mt-1">3º Lugar</span>
          </div>
        );
      default:
        return null;
    }
  };

  const podiumOrder = top5.length >= 3 
    ? [top5[1], top5[0], top5[2]] // [Silver, Gold, Bronze] matching physical layout positions
    : top5;

  return (
    <div className="space-y-5">
      {/* Control Bar: Premium Dashboard Loop Configurator (Only when not externally controlled) */}
      {forcedSlide === undefined && (
        <div className="bg-slate-900 text-white rounded-[2rem] p-5 shadow-xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.06),transparent_50%)]"></div>
          
          {/* Left Section: Active info */}
          <div className="relative z-10 flex items-center gap-4.5">
            <div className="p-3 bg-blue-500/10 border border-blue-500/25 rounded-2xl text-blue-400 flex items-center justify-center animate-pulse">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                <h3 className="text-sm font-black tracking-widest uppercase text-slate-300">Modo TV Dashboard</h3>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Loop automático ativo para exposição em monitores e TVs industriais.
              </p>
            </div>
          </div>

          {/* Center: Slide Switcher Tabs */}
          <div className="relative z-10 flex items-center bg-slate-950/60 p-1.5 rounded-2xl border border-white/5 shadow-inner gap-1">
            <button
              onClick={() => {
                setInternalSlide(0);
                setRemainingTime(loopInterval);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                currentSlide === 0 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              📊 Gráficos Gerais
            </button>
            <button
              onClick={() => {
                setInternalSlide(1);
                setRemainingTime(loopInterval);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                currentSlide === 1 
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/10' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4" />
              🏆 TOP 5 Performance
            </button>
          </div>

          {/* Right Section: Time Controllers */}
          <div className="relative z-10 flex items-center gap-3">
            <button 
              type="button"
              onClick={() => setIsTvActive(!isTvActive)}
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white hover:text-blue-400 transition-colors flex items-center justify-center cursor-pointer shadow-md"
              title={isTvActive ? "Pausar Loop" : "Iniciar Loop Automático"}
            >
              {isTvActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <div className="flex bg-slate-950/40 border border-white/5 rounded-xl p-1 items-center">
              {[10000, 15000, 20000, 30000].map((ms) => (
                <button
                  key={ms}
                  onClick={() => {
                    setLoopInterval(ms);
                    setRemainingTime(ms);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer uppercase transition-all ${
                    loopInterval === ms 
                      ? 'bg-white/10 text-white font-extrabold' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {ms / 1000}s
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Loop Countdown Glow Line */}
          {isTvActive && (
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-amber-400 transition-all duration-100 ease-linear shadow-lg"
                 style={{ width: `${progressPercentage}%` }} />
          )}
        </div>
      )}

      {/* ALWAYS VISIBLE PRODUCTION CORE KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Cubagem ACS" value={formatValue(totals.totalCubagem)} icon={Package} trend="+12,5%" />
        <KPICard title="SEPARAÇÃO ACESSOS / ULTIMA HORA" value={lastHourACS} icon={Clock} />
        <KPICard title="Total Separa.UND" value={formatValue(totals.totalSeparaUND)} icon={Box} status="Ativo" />
        <KPICard title="Total C.Frac.UND" value={formatValue(totals.totalCFracUND)} icon={LayoutGrid} />
      </div>

      {/* DYNAMIC SHIFT CONTENT PANE WITH HIGH-IMPACT LAYOUT */}
      <div className="relative min-h-[400px]">
        <AnimatePresence mode="wait">
          {currentSlide === 0 ? (
            /* SLIDE 0: GENERAL PRODUCTION TREND GRAPHICS */
            <motion.div
              key="slide-charts"
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -15 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm flex flex-col h-[380px]">
                <h3 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-blue-600" />
                  Tendência de Separação (UNID)
                </h3>
                <div className="flex-1 min-h-0">
                  <HourlyTrendChart data={chartData} />
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm flex flex-col h-[380px]">
                <h3 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Projeção de Performance (ACS)
                </h3>
                <div className="flex-1 min-h-0">
                  <ProductionTrendChart data={chartData} target={otsPadrao} />
                </div>
              </div>
            </motion.div>
          ) : (
            /* SLIDE 1: GRAND IMMERSIVE OLYMPIC PODIUM FOR TV DASHBOARD */
            <motion.div
              key="slide-ranking"
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -15 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="space-y-4"
            >
              {/* Dynamic Evaluation Period Active Header - ONLY displayed with TOP 5 Ranking slide */}
              {period && (period.startDate || period.endDate) && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-50/70 border border-blue-100 text-blue-800 rounded-2xl p-3.5 px-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black tracking-tight text-blue-950">Período de Avaliação Ativo</h4>
                      <p className="text-[11px] text-blue-700 font-bold mt-0.5">Os dados de performance individual abaixo foram apurados na janela de monitoramento selecionada.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-blue-150 px-3 py-1.5 rounded-xl shadow-sm text-xs font-black text-blue-900 border-dashed">
                    <span>De:</span>
                    <span className="text-blue-600 px-1.5 bg-blue-50 border border-blue-100/50 rounded-lg">{period.startDate || '?'}</span>
                    <span className="text-slate-400 font-medium">Até:</span>
                    <span className="text-blue-600 px-1.5 bg-blue-50 border border-blue-100/50 rounded-lg">{period.endDate || '?'}</span>
                  </div>
                </motion.div>
              )}

              {/* Grand Header for TV Board */}
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/15 p-5 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-xl shadow-amber-500/25">
                    <Trophy className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-none">Ranking Individual de Excelência</h3>
                    <p className="text-xs text-slate-500 font-extrabold tracking-wider uppercase mt-1">
                      Os melhores em destaque - Período de Avaliação Corrente
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black tracking-widest uppercase">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Quadro de Destaques
                </div>
              </div>

              {top5.length === 0 ? (
                <div className="bg-white p-10 rounded-[2rem] border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center py-20 min-h-[350px]">
                  <Trophy className="w-14 h-14 text-slate-200 mb-4 animate-bounce" />
                  <h4 className="text-lg font-black text-slate-800">Sem dados computados ainda</h4>
                  <p className="text-slate-400 text-sm mt-1 max-w-sm">
                    Preencha ou faça a importação do controle individual via painel para exibir o ranking.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Majestic Sport Podium [Silver (pos 1), Gold (pos 0), Bronze (pos 2)] */}
                  <div className="lg:col-span-8 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[350px] justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.03),transparent_70%)]"></div>
                    
                    <div className="relative z-10 grid grid-cols-3 gap-4 items-end mt-2 h-full">
                      {/* position 2 (Silver) */}
                      {top5[1] ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1, duration: 0.5 }}
                          className="flex flex-col items-center h-[85%] justify-between bg-slate-50/40 border border-slate-200/65 rounded-2xl p-3.5 shadow-sm text-center relative"
                        >
                          {renderPodiumTitle(1)}
                          <div className="my-1.5 w-full min-w-0">
                            <h4 className="text-sm font-black text-slate-800 leading-tight block truncate w-full" title={top5[1].user}>
                              {top5[1].user}
                            </h4>
                            <div className="mt-1.5 flex items-center justify-center gap-1.5">
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] font-black text-slate-400 tracking-wider uppercase">Prod</span>
                                <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-1.5 py-0.5 rounded-md inline-block min-w-[38px] text-center">
                                  {top5[1].prodPct}
                                </span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] font-black text-slate-400 tracking-wider uppercase">UPM</span>
                                <span className="text-xs font-black text-blue-600 bg-blue-50 border border-blue-100/50 px-1.5 py-0.5 rounded-md inline-block min-w-[38px] text-center">
                                  {top5[1].upmPct}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="h-[80%] border-2 border-dashed border-slate-150 rounded-2xl" />
                      )}

                      {/* position 1 (Gold, centered and taller!) */}
                      {top5[0] ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 40 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5 }}
                          className="flex flex-col items-center h-full justify-between bg-gradient-to-b from-amber-500/10 via-amber-50/20 to-white border-2 border-amber-300 rounded-[2rem] p-4 shadow-lg text-center relative z-20"
                        >
                          {renderPodiumTitle(0)}
                          <div className="my-2 w-full min-w-0">
                            <h4 className="text-base font-black text-amber-950 leading-tight block truncate w-full" title={top5[0].user}>
                              {top5[0].user}
                            </h4>
                            <div className="mt-2 flex items-center justify-center gap-2">
                              <div className="flex flex-col items-center">
                                <span className="text-[8.5px] font-black text-amber-800 tracking-wider uppercase">Prod</span>
                                <span className="text-xs font-black text-amber-700 bg-amber-500/10 border border-amber-300/30 px-2 py-0.5 rounded-md inline-block min-w-[42px] text-center">
                                  {top5[0].prodPct}
                                </span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[8.5px] font-black text-amber-800 tracking-wider uppercase">UPM</span>
                                <span className="text-xs font-black text-blue-700 bg-blue-500/10 border border-blue-300/30 px-2 py-0.5 rounded-md inline-block min-w-[42px] text-center">
                                  {top5[0].upmPct}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="h-full border-2 border-dashed border-slate-150 rounded-[2rem]" />
                      )}

                      {/* position 3 (Bronze) */}
                      {top5[2] ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2, duration: 0.5 }}
                          className="flex flex-col items-center h-[75%] justify-between bg-orange-50/20 border border-orange-200/50 rounded-2xl p-3 shadow-sm text-center relative"
                        >
                          {renderPodiumTitle(2)}
                          <div className="my-1.5 w-full min-w-0">
                            <h4 className="text-sm font-black text-orange-950 leading-tight block truncate w-full" title={top5[2].user}>
                              {top5[2].user}
                            </h4>
                            <div className="mt-1.5 flex items-center justify-center gap-1.5">
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] font-black text-orange-800 tracking-wider uppercase">Prod</span>
                                <span className="text-xs font-black text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded-md inline-block min-w-[38px] text-center">
                                  {top5[2].prodPct}
                                </span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] font-black text-orange-850 tracking-wider uppercase">UPM</span>
                                <span className="text-xs font-black text-blue-600 bg-blue-50 border border-blue-100/50 px-1.5 py-0.5 rounded-md inline-block min-w-[38px] text-center">
                                  {top5[2].upmPct}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="h-[70%] border-2 border-dashed border-slate-150 rounded-2xl" />
                      )}
                    </div>
                  </div>

                  {/* Right Column: Runner ups (#4 and #5) + Summary highlights */}
                  <div className="lg:col-span-4 space-y-3">
                    {/* Honorable Mentions Header */}
                    <div className="bg-slate-900 text-white p-4.5 rounded-3xl shadow-md border border-white/5 space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-cyan-400" />
                        Quadro Adjunto (TOP 4 & 5)
                      </h4>

                      <div className="space-y-2">
                        {/* Runner #4 */}
                        {top5[3] ? (
                          <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded bg-slate-800 border border-white/10 text-[10px] font-black flex items-center justify-center">
                                4º
                              </span>
                              <span className="text-xs font-black text-white truncate max-w-[120px]" title={top5[3].user}>
                                {top5[3].user}
                              </span>
                            </div>
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                              {top5[3].prodPct}
                            </span>
                          </div>
                        ) : null}

                        {/* Runner #5 */}
                        {top5[4] ? (
                          <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded bg-slate-800 border border-white/10 text-[10px] font-black flex items-center justify-center">
                                5º
                              </span>
                              <span className="text-xs font-black text-white truncate max-w-[120px]" title={top5[4].user}>
                                {top5[4].user}
                              </span>
                            </div>
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                              {top5[4].prodPct}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Operational Performance TV Metric Tip */}
                    <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-3xl flex items-start gap-3">
                      <div className="p-2 bg-amber-500 text-white rounded-xl shadow-md shrink-0">
                        <Flame className="w-3.5 h-3.5 animate-bounce" />
                      </div>
                      <div>
                        <h5 className="text-[10px] font-black text-amber-950 uppercase tracking-wider">Como calculamos</h5>
                        <p className="text-[10px] text-amber-800 mt-1 leading-relaxed font-semibold">
                          O ranking é atualizado em tempo real. Ele pondera a produtividade total em percentual com relação à cubagem concluída e o UPM individual registrado para cada colaborador.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
