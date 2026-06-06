import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductionDashboardView } from '../dashboard/ProductionDashboardView';
import { NewsTicker } from '../common/NewsTicker';
import AnnouncementsView from '../views/AnnouncementsView';
import { useLogisticsData } from '../../hooks/useLogisticsData';
import { useProjectionData, ProjectionData } from '../../hooks/useProjectionData';
import { useAbsenteeismData } from '../../hooks/useAbsenteeismData';
import { useWakeLock } from '../../hooks/useWakeLock';
import { 
    Truck, 
    Package, 
    Clock, 
    AlertCircle, 
    TrendingUp, 
    Activity,
    FileSpreadsheet,
    ChevronRight,
    Search,
    Filter,
    RefreshCw,
    Maximize2,
    Minimize2,
    Users,
    Play,
    Pause
} from 'lucide-react';

interface LogisticsRow {
  rotas: string;
  docsIniciais: number;
  docsAtuais: number;
  horarios: string;
  status: string;
}

const FIXED_DATA: Omit<LogisticsRow, 'status' | 'docsIniciais' | 'docsAtuais'>[] = [
    { rotas: '731', horarios: '01:00:00' },
    { rotas: '732', horarios: '01:00:00' },
    { rotas: '733', horarios: '01:00:00' },
    { rotas: '734', horarios: '01:00:00' },
    { rotas: '764', horarios: '01:30:00' },
    { rotas: '722', horarios: '02:40:00' },
    { rotas: '761', horarios: '02:10:00' },
    { rotas: '741', horarios: '03:00:00' },
    { rotas: '742', horarios: '03:00:00' },
    { rotas: '720', horarios: '04:20:00' },
    { rotas: '721', horarios: '04:20:00' },
    { rotas: '783', horarios: '04:40:00' },
    { rotas: '754', horarios: '05:10:00' },
    { rotas: '700', horarios: '08:00:00' },
    { rotas: '723', horarios: '08:00:00' },
    { rotas: '725', horarios: '08:00:00' },
    { rotas: '750', horarios: '08:00:00' },
    { rotas: '756', horarios: '08:00:00' },
    { rotas: '727', horarios: '08:00:00' },
];

const parseBrValue = (val: string | number) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return parseFloat(val.replace('.', '').replace(',', '.').replace('%', '')) || 0;
};

const getCompletionInfo = (initial: number, current: number) => {
    if (initial <= 0) return { percentage: 0, display: '0%' };
    // Progress is based on the difference (documents processed)
    // If we started with 100 and have 20 left, we processed 80.
    const diff = Math.max(0, initial - current);
    const pct = (diff / initial) * 100;
    return {
        percentage: Math.min(100, pct),
        display: Math.min(100, pct).toFixed(0) + '%'
    };
};

const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-emerald-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-indigo-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-slate-300';
};

interface LogisticsDashboardViewProps {
  forcedView?: 'logistics' | 'production' | 'health' | 'avisos';
  externalTVMode?: boolean;
  productionData?: {
    totals: any;
    lastHourACS: string;
    chartData: any[];
    formatValue: (val: number) => string;
  };
  selectedRoute?: string;
}

export function LogisticsDashboardView({ productionData, forcedView, externalTVMode, selectedRoute = '' }: LogisticsDashboardViewProps) {
    const { rows, loading: loadingLogistics } = useLogisticsData();
    const { data: projection, loading: loadingProjection } = useProjectionData();
    const { totals: absenteeismTotals } = useAbsenteeismData();

    // Persistent storage for delayed routes
    const [persistentDelayedRoutes, setPersistentDelayedRoutes] = useState<Set<string>>(() => {
        const stored = localStorage.getItem('delayedRoutes');
        if (stored) {
            try {
                const { date, routes } = JSON.parse(stored);
                if (date === new Date().toISOString().split('T')[0]) {
                    return new Set(routes);
                }
            } catch (e) {
                return new Set();
            }
        }
        return new Set();
    });

    useEffect(() => {
        const delayed = rows.filter(r => r.status === 'Atrasado').map(r => r.rotas);
        const finalized = rows.filter(r => r.status === 'Finalizado').map(r => r.rotas);
        
        setPersistentDelayedRoutes(prev => {
            const next = new Set([...Array.from(prev), ...delayed]);
            finalized.forEach(r => next.delete(r));
            
            localStorage.setItem('delayedRoutes', JSON.stringify({
                date: new Date().toISOString().split('T')[0],
                routes: Array.from(next)
            }));
            return next;
        });
    }, [rows]);

    const isQuebraComercial = projection && parseBrValue(projection.cancelamentoComercial.cenarioAtual) > parseBrValue(projection.cancelamentoComercial.meta);
    const isQuebraOperacional = projection && parseBrValue(projection.cancelamentoOperacional.cenarioAtual) > parseBrValue(projection.cancelamentoOperacional.meta);
    const isQuebraUPM = projection && projection.upmEticos.cenarioAtual > projection.upmEticos.meta;
    const isCritical = isQuebraComercial || isQuebraOperacional || isQuebraUPM;

    const tickerMessages = productionData ? [
        `Ritmo de Produção: ${productionData.totals.totalSeparaACS} ACS separados | ${productionData.totals.totalSeparaUND} UND separados.`,
        `Performance: ${productionData.totals.averageSeparaACS >= projection.volumeDiario.meta ? 'Operação Dentro da Meta' : 'Atenção: Operação Abaixo da Meta'}`,
        `Último Registro Acessos: ${productionData.lastHourACS} ACS na última hora.`,
        `Risco Rota Gargalo: ${persistentDelayedRoutes.size > 0 ? `Rotas ${Array.from(persistentDelayedRoutes).join(', ')} em atraso hoje` : 'Nenhum risco identificado'}`,
        `Faltas na Operação: ${absenteeismTotals.faltas} colaboradores ausentes.`,
        ...(isCritical ? ['⚠️ ALERTA CRÍTICO: Indicações de quebra de meta em indicadores operacionais!'] : [])
    ] : [];
    
    const [searchQuery, setSearchQuery] = useState('');
    const [isTVMode, setIsTVMode] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [tvView, setTvView] = useState<'logistics' | 'production_charts' | 'production_top5' | 'health' | 'avisos'>(() => {
        if (forcedView === 'production') return 'production_charts';
        return (forcedView as any) || 'logistics';
    });
    
    // Enable wake lock when in TV mode
    useWakeLock(isTVMode);
  
    // Synchronize with external TV mode signal
    useEffect(() => {
        if (externalTVMode !== undefined) {
            setIsTVMode(externalTVMode);
        }
    }, [externalTVMode]);

    // Update tvView if forcedView changes (only when NOT in TV Mode)
    useEffect(() => {
        if (forcedView && !isTVMode) {
            if (forcedView === 'production') {
                setTvView('production_charts');
            } else {
                setTvView(forcedView as any);
            }
        }
    }, [forcedView, isTVMode]);

    // TV Mode Rotation Effect
    useEffect(() => {
        if (!isTVMode || isPaused) return;

        const interval = setInterval(() => {
            setTvView(current => {
                if (current === 'logistics') return 'production_charts';
                if (current === 'production_charts') return 'production_top5';
                if (current === 'production_top5') return 'health';
                if (current === 'health') return 'avisos';
                return 'logistics';
            });
        }, 12000); // 12 seconds per view - beautifully optimized for read rate and loop rhythm

        return () => clearInterval(interval);
    }, [isTVMode, isPaused]);

    const loading = loadingLogistics || loadingProjection;
    
    const effectiveSearchQuery = selectedRoute || searchQuery;

    const filteredRows = rows
        .filter(row => row.rotas.includes(effectiveSearchQuery))
        .sort((a, b) => {
            if (a.status === 'Finalizado' && b.status !== 'Finalizado') return 1;
            if (a.status !== 'Finalizado' && b.status === 'Finalizado') return -1;
            return 0;
        });
    const totalDocsIniciais = rows.reduce((acc, row) => acc + row.docsIniciais, 0);
    const totalDocsAtuais = rows.reduce((acc, row) => acc + row.docsAtuais, 0);
    const totalFaltantes = filteredRows.reduce((acc, row) => acc + row.docsAtuais, 0);
    const globalCompletion = getCompletionInfo(totalDocsIniciais, totalDocsAtuais);
    
    const filteredDocsIniciais = filteredRows.reduce((acc, row) => acc + row.docsIniciais, 0);
    const filteredDocsAtuais = filteredRows.reduce((acc, row) => acc + row.docsAtuais, 0);
    const filteredCompletion = getCompletionInfo(filteredDocsIniciais, filteredDocsAtuais);
    
    // Find next route (first not finished)
    const nextRoute = rows.find(row => row.status !== 'Finalizado');
  
    if (loading) return (
        <div className="space-y-6 animate-pulse">
            <div className="flex justify-between items-center h-12 bg-slate-100 rounded-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 auto-rows-[140px] gap-4">
                <div className="md:col-span-2 lg:col-span-4 lg:row-span-2 bg-slate-200 rounded-2xl"></div>
                <div className="md:col-span-1 lg:col-span-4 bg-slate-100 rounded-2xl"></div>
                <div className="md:col-span-1 lg:col-span-4 bg-slate-100 rounded-2xl"></div>
                <div className="md:col-span-1 lg:col-span-4 bg-slate-100 rounded-2xl"></div>
                <div className="md:col-span-1 lg:col-span-4 bg-slate-100 rounded-2xl"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="h-32 bg-slate-50 rounded-xl border border-slate-100"></div>
                ))}
            </div>
        </div>
    );
  
    return (
      <div className={`space-y-6 ${isTVMode ? 'fixed inset-0 z-[100] bg-slate-50 p-8 overflow-y-auto' : ''}`}>
        {productionData && <NewsTicker messages={tickerMessages} />}
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    {isTVMode ? <div className="p-2 bg-slate-900 rounded-lg text-white"><Activity className="w-5 h-5" /></div> : null}
                    Logistics Operations {isTVMode && <span className="text-slate-400 font-medium">| TV Insights Mode</span>}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <p className="text-slate-500 text-sm font-medium italic">
                        {tvView === 'health' ? 'Monitoramento de integridade e presença' : `Fluxo operacional em tempo real • ${rows.length} Rotas ativas`}
                    </p>
                </div>
            </div>

            {!forcedView && (
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-inner overflow-x-auto no-scrollbar">
                    <button 
                        onClick={() => setTvView('logistics')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${tvView === 'logistics' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Logística
                    </button>
                    <button 
                        onClick={() => setTvView('production_charts')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${(tvView === 'production_charts' || tvView === 'production_top5') ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Produção
                    </button>
                    <button 
                        onClick={() => setTvView('health')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${tvView === 'health' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Saúde
                    </button>
                    <button 
                        onClick={() => setTvView('avisos')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${tvView === 'avisos' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Avisos
                    </button>
                </div>
            )}

            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar rota..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    />
                </div>
                <div className="flex items-center gap-2">
                    {isTVMode && (
                        <button 
                            onClick={() => setIsPaused(!isPaused)}
                            className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
                            title={isPaused ? "Resumir transições" : "Pausar transições"}
                        >
                            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        </button>
                    )}
                    <button 
                        onClick={() => setIsTVMode(!isTVMode)}
                        className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                        title={isTVMode ? "Sair do Modo TV" : "Modo TV"}
                    >
                        {isTVMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
                        <Filter className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="space-y-12">
            {/* Health View Section */}
            {projection && tvView === 'health' && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">Saúde da Operação</h3>
                        <div className="h-px w-full bg-slate-200"></div>
                    </div>
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`grid gap-6 ${tvView === 'health' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-3'}`}
                    >
                        <HealthCard 
                            label="Cancelamento Comercial" 
                            value={projection.cancelamentoComercial.cenarioAtual} 
                            meta={projection.cancelamentoComercial.meta}
                            isQuebra={parseBrValue(projection.cancelamentoComercial.cenarioAtual) > parseBrValue(projection.cancelamentoComercial.meta)}
                            isAtencao={! (parseBrValue(projection.cancelamentoComercial.cenarioAtual) > parseBrValue(projection.cancelamentoComercial.meta)) && parseBrValue(projection.cancelamentoComercial.cenarioAtual) > (parseBrValue(projection.cancelamentoComercial.meta) - 0.02)}
                            isLarge={tvView === 'health'}
                        />
                        <HealthCard 
                            label="Cancelamento Operacional" 
                            value={projection.cancelamentoOperacional.cenarioAtual} 
                            meta={projection.cancelamentoOperacional.meta}
                            isQuebra={parseBrValue(projection.cancelamentoOperacional.cenarioAtual) > parseBrValue(projection.cancelamentoOperacional.meta)}
                            isAtencao={! (parseBrValue(projection.cancelamentoOperacional.cenarioAtual) > parseBrValue(projection.cancelamentoOperacional.meta)) && parseBrValue(projection.cancelamentoOperacional.cenarioAtual) > (parseBrValue(projection.cancelamentoOperacional.meta) - 0.02)}
                            isLarge={tvView === 'health'}
                        />
                        <HealthCard 
                            label="UPM Éticos" 
                            value={projection.upmEticos.cenarioAtual.toString()} 
                            meta={projection.upmEticos.meta.toString()}
                            isQuebra={projection.upmEticos.cenarioAtual > projection.upmEticos.meta}
                            isAtencao={! (projection.upmEticos.cenarioAtual > projection.upmEticos.meta) && projection.upmEticos.cenarioAtual > (projection.upmEticos.meta * (1 - 0.0002))}
                            isLarge={tvView === 'health'}
                        />
                        
                        {tvView === 'health' && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="md:col-span-2 lg:col-span-3 bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden"
                            >
                                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                                    <div className="text-center md:text-left">
                                        <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                                <Users className="w-6 h-6" />
                                            </div>
                                            <h4 className="text-2xl font-black">Saúde do Time - Absenteísmo</h4>
                                        </div>
                                        <p className="text-slate-400 text-sm max-w-md">Monitoramento consolidado de faltas e presença da equipe operacional.</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-6 justify-center">
                                        <div className="px-8 py-4 bg-white/5 rounded-3xl backdrop-blur-md border border-white/10 text-center">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Taxa Geral</span>
                                            <p className={`text-4xl font-black tracking-tighter ${absenteeismTotals.percentage > 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {absenteeismTotals.percentage.toFixed(1)}%
                                            </p>
                                        </div>
                                        <div className="px-8 py-4 bg-white/5 rounded-3xl backdrop-blur-md border border-white/10 text-center">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Colaboradores</span>
                                            <p className="text-4xl font-black tracking-tighter text-white">
                                                {absenteeismTotals.total}
                                            </p>
                                        </div>
                                        <div className="px-8 py-4 bg-white/5 rounded-3xl backdrop-blur-md border border-white/10 text-center text-red-400">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Faltas Hoje</span>
                                            <p className="text-4xl font-black tracking-tighter">
                                                {absenteeismTotals.faltas}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            )}

            {(tvView === 'production_charts' || tvView === 'production_top5') && productionData && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-8"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="h-0.5 flex-1 bg-slate-200"></div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">
                            {tvView === 'production_charts' ? 'Insights de Produção - Tendências Gerais' : 'Insights de Produção - Medalhistas de Performance'}
                        </h3>
                        <div className="h-0.5 flex-1 bg-slate-200"></div>
                    </div>
                    <ProductionDashboardView 
                        totals={productionData.totals}
                        lastHourACS={productionData.lastHourACS}
                        chartData={productionData.chartData}
                        formatValue={productionData.formatValue}
                        otsPadrao={projection.otsPadrao}
                        forcedSlide={tvView === 'production_charts' ? 0 : 1}
                    />
                </motion.div>
            )}

            {tvView === 'avisos' && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <AnnouncementsView />
                </motion.div>
            )}

            {tvView === 'logistics' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 auto-rows-[140px] gap-4">
                        {/* 1. Network Activity Block (2x2) */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.01, boxShadow: "0 20px 40px -10px rgba(59, 130, 246, 0.2)" }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="md:col-span-2 lg:col-span-6 lg:row-span-2 bg-slate-900 rounded-[2rem] p-6 lg:p-7 text-white relative overflow-hidden flex flex-col justify-between shadow-xl border border-white/5"
                        >
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.12),transparent_70%)]"></div>
                            
                            {/* Card Content Top Section: Title & Status */}
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
                                        <Activity className="w-5 h-5 animate-pulse" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 block">Monitoramento</span>
                                        <h3 className="text-xs font-black text-white leading-tight uppercase tracking-wider">Conclusão Geral</h3>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></div>
                                    <span className="text-[9px] font-black uppercase tracking-widest">LIVE</span>
                                </div>
                            </div>

                            {/* Dual Pane Main Area */}
                            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-12 gap-4 flex-1 items-center">
                                {/* Left Pane: Stats (columns: 7) */}
                                <div className="sm:col-span-7 space-y-3.5">
                                    <div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-black tracking-tighter text-white tabular-nums">
                                                {filteredCompletion.display.replace('%', '')}
                                            </span>
                                            <span className="text-xl font-bold text-blue-400/80">%</span>
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Progresso total ponderado</p>
                                    </div>

                                    {/* Small Grid for sub-stats to reduce spacing */}
                                    <div className="grid grid-cols-2 gap-3.5 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                                        <div>
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Concluídos</p>
                                            <p className="text-lg font-black text-white tabular-nums">{(filteredDocsIniciais - filteredDocsAtuais).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Faltantes</p>
                                            <p className="text-lg font-black text-blue-400 tabular-nums">{filteredDocsAtuais.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Pane: Interactive Live Visualizer Graph (columns: 5) */}
                                <div className="sm:col-span-5 flex flex-col items-center justify-center bg-slate-950/30 rounded-2xl p-3 border border-white/5 h-[135px] relative">
                                    {/* Graph Grid Lines */}
                                    <div className="absolute inset-x-3 inset-y-4 flex flex-col justify-between pointer-events-none opacity-5">
                                        <div className="w-full h-px bg-white"></div>
                                        <div className="w-full h-px bg-white"></div>
                                        <div className="w-full h-px bg-white"></div>
                                    </div>
                                    
                                    {(() => {
                                        const sparklinePoints = rows.map(r => getCompletionInfo(r.docsIniciais, r.docsAtuais).percentage);
                                        const N = sparklinePoints.length || 1;
                                        const svgWidth = 140;
                                        const svgHeight = 75;
                                        const points = sparklinePoints.map((pct, i) => {
                                            const x = N > 1 ? (i / (N - 1)) * svgWidth : 0;
                                            const y = svgHeight - (pct / 100) * (svgHeight - 12) - 6;
                                            return { x, y };
                                        });
                                        const linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
                                        const areaPath = points.length > 0 
                                            ? `${linePath} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z` 
                                            : '';
                                        const lastPoint = points[points.length - 1];

                                        return points.length > 0 ? (
                                            <svg width="100%" height="75" viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="overflow-visible z-10">
                                                <defs>
                                                    <linearGradient id="liveGraphGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                                                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                                                    </linearGradient>
                                                </defs>
                                                
                                                {/* Area under curve */}
                                                <path d={areaPath} fill="url(#liveGraphGradient)" />
                                                
                                                {/* Glowing Line */}
                                                <motion.path 
                                                    d={linePath} 
                                                    fill="none" 
                                                    stroke="url(#lineGrad)" 
                                                    strokeWidth="2" 
                                                    strokeLinecap="round"
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: 1 }}
                                                    transition={{ duration: 1.5, ease: "easeInOut" }}
                                                />
                                                
                                                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                                                    <stop offset="0%" stopColor="#3b82f6" />
                                                    <stop offset="100%" stopColor="#22d3ee" />
                                                </linearGradient>

                                                {/* Pulse Dot at Last Point */}
                                                {lastPoint && (
                                                    <g>
                                                        <circle 
                                                            cx={lastPoint.x} 
                                                            cy={lastPoint.y} 
                                                            r="4" 
                                                            fill="#22d3ee" 
                                                            className="animate-ping origin-center" 
                                                            style={{ transformOrigin: `${lastPoint.x}px ${lastPoint.y}px` }} 
                                                        />
                                                        <circle cx={lastPoint.x} cy={lastPoint.y} r="3" fill="#ffffff" stroke="#3b82f6" strokeWidth="1.5" />
                                                    </g>
                                                )}
                                            </svg>
                                        ) : (
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Sem rotas ativas</p>
                                        );
                                    })()}

                                    <div className="flex justify-between w-full px-1 mt-2 text-[7.5px] font-bold text-slate-500 uppercase tracking-widest z-10">
                                        <span>Rotas Início</span>
                                        <span className="text-blue-400">Fluxo Total</span>
                                        <span>Fim</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Progress Bar & Label */}
                            <div className="relative z-10 flex flex-col gap-1.5 mt-2">
                                <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    <span>Progresso da Operação</span>
                                    <span className="text-blue-400 font-bold">{(filteredDocsIniciais - filteredDocsAtuais).toLocaleString()} / {filteredDocsIniciais.toLocaleString()} Caixas</span>
                                </div>
                                <div className="w-full bg-slate-950/60 h-2 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: filteredCompletion.display }}
                                        transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                                        className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 h-full rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                    >
                                        <div className="w-full h-full opacity-30 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:20px_20px] animate-pulse"></div>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>

                        {/* 5. Next Window Block - Increased prominence */}
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            whileHover={{ y: -5, boxShadow: "0 25px 30px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)" }}
                            className="md:col-span-2 lg:col-span-6 bg-slate-900 rounded-3xl p-10 shadow-xl flex flex-col justify-center gap-2 transition-all duration-300 relative overflow-hidden"
                        >
                                <div className="absolute -bottom-6 -right-6 opacity-[0.25] pointer-events-none rotate-6 [filter:drop-shadow(0_0_12px_rgba(148,163,184,0.3))_drop-shadow(0_0_2px_rgba(148,163,184,0.2))]">
                                    <Truck size={220} strokeWidth={1} className="text-slate-700" />
                                </div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest relative z-10">Próxima Janela</p>
                                <div className="flex items-baseline gap-4 relative z-10">
                                    <p className="text-6xl font-black text-white">{nextRoute?.horarios.substring(0, 5) || '--:--'}</p>
                                    <span className="text-sm font-black text-blue-400 bg-blue-500/10 px-4 py-1 rounded-lg">Rota {nextRoute?.rotas || 'N/A'}</span>
                                </div>
                        </motion.div>

                        {/* 6. Total Faltantes Block */}
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            whileHover={{ y: -5, boxShadow: "0 25px 30px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.05)" }}
                            className="md:col-span-2 lg:col-span-6 bg-white rounded-3xl p-10 shadow-lg border border-slate-100 flex flex-col justify-center gap-2 transition-all duration-300 relative overflow-hidden"
                        >
                                <div className="absolute -bottom-6 -right-6 opacity-[0.06] pointer-events-none rotate-6 [filter:drop-shadow(0_0_12px_rgba(148,163,184,0.3))_drop-shadow(0_0_2px_rgba(148,163,184,0.2))]">
                                    <Package size={220} strokeWidth={1} className="text-slate-400" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">Total Faltantes</p>
                                <div className="flex items-baseline gap-4 relative z-10">
                                    <p className="text-6xl font-black text-blue-600">{totalFaltantes.toLocaleString()}</p>
                                    <span className="text-sm font-black text-slate-600">Caixas Faltantes</span>
                                </div>
                        </motion.div>

                        {/* 6. Main Route Grid (Space filling) */}
                        <div className="lg:col-span-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 pt-4">
                            <AnimatePresence>
                                    {filteredRows.map((row, index) => {
                                        const completion = getCompletionInfo(row.docsIniciais, row.docsAtuais);
                                        return (
                                            <motion.div
                                                key={row.rotas}
                                                layout
                                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                transition={{ delay: index * 0.01 }}
                                                className={`bg-white p-3.5 rounded-xl border ${row.status === 'Finalizado' ? 'border-slate-100 opacity-60 scale-75' : 'border-slate-200 shadow-sm'} ${row.status === 'Atrasado' ? 'ring-2 ring-red-400 animate-pulse' : ''} hover:border-blue-400 transition-all hover:shadow-xl group relative cursor-pointer active:scale-95`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="space-y-0.5">
                                                        <span className="text-[9px] font-black text-slate-300 group-hover:text-blue-400 transition-colors uppercase tracking-[0.1em]">Rota</span>
                                                        <h4 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">{row.rotas}</h4>
                                                    </div>
                                                    <div className={`w-2.5 h-2.5 rounded-full shadow-inner ${
                                                        row.status === 'Finalizado' 
                                                        ? 'bg-emerald-500 ring-2 ring-emerald-50' 
                                                        : row.status === 'Atrasado' 
                                                        ? 'bg-red-500 animate-pulse ring-2 ring-red-100'
                                                        : 'bg-yellow-400 ring-2 ring-yellow-50'
                                                    }`}></div>
                                                </div>

                                                <div className="space-y-2.5">
                                                     {/* Documents Stats */}
                                                     <div className="flex justify-between items-center bg-slate-50/50 p-1.5 rounded-lg group-hover:bg-blue-50/30 transition-colors">
                                                         <div className="text-center flex-1">
                                                             <p className="text-[7.5px] font-black text-slate-400 uppercase">Inicial</p>
                                                             <p className="text-xs font-black text-slate-700">{row.docsIniciais}</p>
                                                         </div>
                                                         <div className="w-px h-5 bg-slate-200"></div>
                                                         <div className="text-center flex-1">
                                                             <p className="text-[7.5px] font-black text-slate-400 uppercase">Faltantes</p>
                                                             <p className="text-xs font-black text-blue-600">{row.docsAtuais}</p>
                                                         </div>
                                                     </div>

                                                     {/* Progress Bar */}
                                                     <div className="space-y-1">
                                                         <div className="flex justify-between items-end">
                                                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Conclusão</span>
                                                             <span className={`text-[11px] font-black ${completion.percentage >= 100 ? 'text-emerald-600' : 'text-slate-900'}`}>{completion.display}</span>
                                                         </div>
                                                         <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                             <motion.div 
                                                                 initial={{ width: 0 }}
                                                                 animate={{ width: completion.display }}
                                                                 transition={{ duration: 1, delay: 0.2 + (index * 0.05) }}
                                                                 className={`h-full rounded-full ${getStatusColor(completion.percentage)}`}
                                                             ></motion.div>
                                                         </div>
                                                     </div>

                                                    <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-1.5">
                                                        <div className={`flex items-center gap-1 text-[9px] font-black tracking-tight ${row.status === 'Atrasado' ? 'text-red-500' : 'text-slate-400'}`}>
                                                            <Clock className={`w-3.5 h-3.5 ${row.status === 'Atrasado' ? 'text-red-400' : 'text-slate-300'}`} />
                                                            {row.horarios.substring(0, 5)}
                                                            {row.status === 'Atrasado' && <span className="ml-1 uppercase text-[7px] px-1 bg-red-100 rounded">Atrasado</span>}
                                                        </div>
                                                        <div className="p-0.5 px-1.5 bg-slate-50 rounded group-hover:bg-blue-50 transition-colors">
                                                            <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-blue-500 transition-transform group-hover:translate-x-0.5" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {row.status === 'Finalizado' && (
                                                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-xl flex items-center justify-center pointer-events-none">
                                                        <span className="bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-md">Finalizado</span>
                                                    </div>
                                                )}
                                            </motion.div>
                                );
                            })}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    );

}

function HealthCard({ label, value, meta, isQuebra, isAtencao, isLarge }: { label: string; value: string; meta: string; isQuebra: boolean; isAtencao: boolean; isLarge?: boolean }) {
    return (
        <div className={`rounded-[2rem] border shadow-sm transition-all flex flex-col justify-between ${
            isQuebra 
                ? 'bg-red-50 border-red-100 shadow-red-100/20' 
                : isAtencao
                    ? 'bg-yellow-50 border-yellow-200 shadow-yellow-100/20'
                    : 'bg-white border-slate-100 shadow-slate-100/20'
        } ${isLarge ? 'p-10 min-h-[280px]' : 'p-6'}`}>
            <div>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isQuebra ? 'text-red-400' : isAtencao ? 'text-yellow-600' : 'text-slate-400'}`}>
                            {label}
                        </span>
                        {isLarge && <div className="h-1 w-12 bg-slate-200 rounded-full"></div>}
                    </div>
                    <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        isQuebra ? 'bg-red-100 text-red-600' : isAtencao ? 'bg-yellow-100 text-yellow-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                        {isQuebra ? 'Alerta Crítico' : isAtencao ? 'Atenção' : 'Operação Normal'}
                    </div>
                </div>
                <div className="flex items-baseline gap-3">
                    <h4 className={`font-black tracking-tighter leading-none ${isQuebra ? 'text-red-600' : isAtencao ? 'text-yellow-600' : 'text-slate-900'} ${isLarge ? 'text-7xl' : 'text-3xl'}`}>
                        {value}
                    </h4>
                    <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isQuebra ? 'text-red-300' : isAtencao ? 'text-yellow-500' : 'text-slate-400'}`}>
                            Meta Estabelecida
                        </span>
                        <span className={`text-sm font-black ${isQuebra ? 'text-red-400' : isAtencao ? 'text-yellow-600' : 'text-slate-900'}`}>
                           {meta}
                        </span>
                    </div>
                </div>
            </div>
            <div className={`mt-8 flex items-center gap-4`}>
                <div className={`h-2 flex-1 rounded-full overflow-hidden ${isQuebra ? 'bg-red-100' : isAtencao ? 'bg-yellow-100' : 'bg-slate-100'}`}>
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: isQuebra ? '100%' : '75%' }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${isQuebra ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : isAtencao ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}
                    />
                </div>
                {isQuebra && <AlertCircle className="w-6 h-6 text-red-500 animate-pulse" />}
                {isAtencao && <AlertCircle className="w-6 h-6 text-yellow-500 animate-pulse" />}
            </div>
        </div>
    );
}
