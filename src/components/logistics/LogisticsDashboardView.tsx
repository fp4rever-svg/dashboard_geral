import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductionDashboardView } from '../dashboard/ProductionDashboardView';
import AnnouncementsView from '../views/AnnouncementsView';
import { useLogisticsData } from '../../hooks/useLogisticsData';
import { useProjectionData } from '../../hooks/useProjectionData';
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
    Users
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
    { rotas: '722', horarios: '02:10:00' },
    { rotas: '761', horarios: '02:40:00' },
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
}

interface ProjectionData {
  cancelamentoComercial: { meta: string; valor: number; cenarioAtual: string; limite: number };
  cancelamentoOperacional: { meta: string; valor: number; cenarioAtual: string; limite: number };
  upmEticos: { meta: number; valor: number; cenarioAtual: number; limite: number };
}

export function LogisticsDashboardView({ productionData, forcedView, externalTVMode }: LogisticsDashboardViewProps) {
    const { rows, loading: loadingLogistics } = useLogisticsData();
    const { data: projection, loading: loadingProjection } = useProjectionData();
    const { totals: absenteeismTotals } = useAbsenteeismData();
    const [searchQuery, setSearchQuery] = useState('');
    const [isTVMode, setIsTVMode] = useState(false);
    const [tvView, setTvView] = useState<'logistics' | 'production' | 'health' | 'avisos'>(forcedView || 'logistics');
    
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
            setTvView(forcedView);
        }
    }, [forcedView, isTVMode]);

    // TV Mode Rotation Effect
    useEffect(() => {
        if (!isTVMode) return;

        const interval = setInterval(() => {
            setTvView(current => {
                if (current === 'logistics') return 'production';
                if (current === 'production') return 'health';
                if (current === 'health') return 'avisos';
                return 'logistics';
            });
        }, 10000); // 10 seconds per view

        return () => clearInterval(interval);
    }, [isTVMode]);

    const loading = loadingLogistics || loadingProjection;

    const filteredRows = rows
        .filter(row => row.rotas.includes(searchQuery))
        .sort((a, b) => {
            if (a.status === 'Finalizado' && b.status !== 'Finalizado') return 1;
            if (a.status !== 'Finalizado' && b.status === 'Finalizado') return -1;
            return 0;
        });
    const totalDocsIniciais = rows.reduce((acc, row) => acc + row.docsIniciais, 0);
    const totalDocsAtuais = rows.reduce((acc, row) => acc + row.docsAtuais, 0);
    const globalCompletion = getCompletionInfo(totalDocsIniciais, totalDocsAtuais);
    
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
                        onClick={() => setTvView('production')}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${tvView === 'production' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
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
                            isLarge={tvView === 'health'}
                        />
                        <HealthCard 
                            label="Cancelamento Operacional" 
                            value={projection.cancelamentoOperacional.cenarioAtual} 
                            meta={projection.cancelamentoOperacional.meta}
                            isQuebra={parseBrValue(projection.cancelamentoOperacional.cenarioAtual) > parseBrValue(projection.cancelamentoOperacional.meta)}
                            isLarge={tvView === 'health'}
                        />
                        <HealthCard 
                            label="UPM Éticos" 
                            value={projection.upmEticos.cenarioAtual.toString()} 
                            meta={projection.upmEticos.meta.toString()}
                            isQuebra={projection.upmEticos.cenarioAtual > projection.upmEticos.meta}
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

            {tvView === 'production' && productionData && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="h-0.5 flex-1 bg-slate-200"></div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Insights de Produção</h3>
                        <div className="h-0.5 flex-1 bg-slate-200"></div>
                    </div>
                    <ProductionDashboardView 
                        totals={productionData.totals}
                        lastHourACS={productionData.lastHourACS}
                        chartData={productionData.chartData}
                        formatValue={productionData.formatValue}
                        otsPadrao={projection.otsPadrao}
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
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="md:col-span-2 lg:col-span-4 lg:row-span-2 bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-2xl shadow-slate-900/30"
                        >
                            <div className="relative z-10">
                                <div className="flex justify-between items-start">
                                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                                        <Activity className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <span className="text-[10px] font-black px-3 py-1 bg-white/10 rounded-full uppercase tracking-[0.2em] backdrop-blur-md border border-white/10">Live Flow</span>
                                </div>
                                <div className="mt-8">
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-6xl font-black tracking-tighter text-blue-400">{globalCompletion.display.replace('%', '')}<span className="text-2xl text-white/40">%</span></h3>
                                    </div>
                                    <p className="text-slate-400 text-sm font-bold mt-2 uppercase tracking-widest">Conclusão Global</p>
                                </div>
                            </div>

                            <div className="relative z-10 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-500 uppercase">Processados</p>
                                        <p className="text-xl font-black text-white">{(totalDocsIniciais - totalDocsAtuais).toLocaleString()}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[9px] font-black text-slate-500 uppercase">Pendentes</p>
                                        <p className="text-xl font-black text-white">{totalDocsAtuais.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: globalCompletion.display }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                                    ></motion.div>
                                </div>
                            </div>
                            
                            {/* Decorative background elements */}
                            <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.3),transparent_70%)]"></div>
                            </div>
                        </motion.div>

                        {/* 2. Volume Summary Block (2x1) */}
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="md:col-span-1 lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 shadow-inner">
                                <FileSpreadsheet className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Carga Inicial</p>
                                <p className="text-3xl font-black text-slate-900 tracking-tight">{totalDocsIniciais.toLocaleString()}</p>
                            </div>
                        </motion.div>

                        {/* 3. Alerts Block (2x1) */}
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="md:col-span-1 lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl shadow-inner">
                                <AlertCircle className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Docs Atuais</p>
                                <p className="text-3xl font-black text-slate-900 tracking-tight">{totalDocsAtuais.toLocaleString()}</p>
                            </div>
                        </motion.div>

                        {/* 4. Units Summary Block (2x1) */}
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="md:col-span-1 lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 shadow-inner">
                                <TrendingUp className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Processados</p>
                                <p className="text-3xl font-black text-slate-900 tracking-tight">{(totalDocsIniciais - totalDocsAtuais).toLocaleString()}</p>
                            </div>
                        </motion.div>

                        {/* 5. Next Window Block (2x1) */}
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="md:col-span-1 lg:col-span-4 bg-slate-900 rounded-3xl p-6 shadow-xl flex items-center gap-5 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group"
                        >
                            <div className="p-4 bg-blue-500 rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform">
                                <Clock className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Próxima Janela</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-black text-white">{nextRoute?.horarios.substring(0, 5) || '--:--'}</p>
                                    <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">Rota {nextRoute?.rotas || 'N/A'}</span>
                                </div>
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
                                                className={`bg-white p-5 rounded-2xl border ${row.status === 'Finalizado' ? 'border-slate-100 opacity-60' : 'border-slate-200'} hover:border-blue-400 transition-all hover:shadow-2xl group relative cursor-pointer active:scale-95`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="space-y-0.5">
                                                        <span className="text-[10px] font-black text-slate-300 group-hover:text-blue-400 transition-colors uppercase tracking-[0.1em]">Rota</span>
                                                        <h4 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{row.rotas}</h4>
                                                    </div>
                                                    <div className={`w-3 h-3 rounded-full shadow-inner ${
                                                        row.status === 'Finalizado' 
                                                        ? 'bg-emerald-500 ring-4 ring-emerald-50' 
                                                        : row.status === 'Atrasado' 
                                                        ? 'bg-red-500 animate-pulse ring-4 ring-red-100'
                                                        : 'bg-yellow-400 ring-4 ring-yellow-50'
                                                    }`}></div>
                                                </div>

                                                <div className="space-y-4">
                                                     {/* Documents Stats */}
                                                     <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl group-hover:bg-blue-50/30 transition-colors">
                                                         <div className="text-center flex-1">
                                                             <p className="text-[8px] font-black text-slate-400 uppercase">Inicial</p>
                                                             <p className="text-xs font-black text-slate-700">{row.docsIniciais}</p>
                                                         </div>
                                                         <div className="w-px h-6 bg-slate-200"></div>
                                                         <div className="text-center flex-1">
                                                             <p className="text-[8px] font-black text-slate-400 uppercase">Atual</p>
                                                             <p className="text-xs font-black text-blue-600">{row.docsAtuais}</p>
                                                         </div>
                                                     </div>

                                                     {/* Processed Count */}
                                                     <div className="flex justify-between items-end border-t border-slate-50 pt-2">
                                                         <span className="text-[10px] font-black text-slate-400 uppercase">Processados</span>
                                                         <span className="text-sm font-black text-emerald-600">{(row.docsIniciais - row.docsAtuais).toLocaleString()}</span>
                                                     </div>

                                                     {/* Progress Bar */}
                                                     <div className="space-y-1.5">
                                                         <div className="flex justify-between items-end">
                                                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Conclusão</span>
                                                             <span className={`text-xs font-black ${completion.percentage >= 100 ? 'text-emerald-600' : 'text-slate-900'}`}>{completion.display}</span>
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

                                            <div className="flex justify-between items-center pt-3 border-t border-slate-50 mt-2">
                                                <div className={`flex items-center gap-1.5 text-[10px] font-black tracking-tight ${row.status === 'Atrasado' ? 'text-red-500' : 'text-slate-400'}`}>
                                                    <Clock className={`w-3.5 h-3.5 ${row.status === 'Atrasado' ? 'text-red-400' : 'text-slate-300'}`} />
                                                    {row.horarios.substring(0, 5)}
                                                    {row.status === 'Atrasado' && <span className="ml-1 uppercase text-[8px] px-1 bg-red-100 rounded">Atrasado</span>}
                                                </div>
                                                <div className="p-1 px-2 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-transform group-hover:translate-x-0.5" />
                                                </div>
                                            </div>
                                        </div>

                                        {row.status === 'Finalizado' && (
                                            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-2xl flex items-center justify-center pointer-events-none">
                                                <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Finalizado</span>
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

function HealthCard({ label, value, meta, isQuebra, isLarge }: { label: string; value: string; meta: string; isQuebra: boolean; isLarge?: boolean }) {
    return (
        <div className={`rounded-[2rem] border shadow-sm transition-all flex flex-col justify-between ${
            isQuebra 
                ? 'bg-red-50 border-red-100 shadow-red-100/20' 
                : 'bg-white border-slate-100 shadow-slate-100/20'
        } ${isLarge ? 'p-10 min-h-[280px]' : 'p-6'}`}>
            <div>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isQuebra ? 'text-red-400' : 'text-slate-400'}`}>
                            {label}
                        </span>
                        {isLarge && <div className="h-1 w-12 bg-slate-200 rounded-full"></div>}
                    </div>
                    <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        isQuebra ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                        {isQuebra ? 'Alerta Crítico' : 'Operação Normal'}
                    </div>
                </div>
                <div className="flex items-baseline gap-3">
                    <h4 className={`font-black tracking-tighter leading-none ${isQuebra ? 'text-red-600' : 'text-slate-900'} ${isLarge ? 'text-7xl' : 'text-3xl'}`}>
                        {value}
                    </h4>
                    <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isQuebra ? 'text-red-300' : 'text-slate-400'}`}>
                            Meta Estabelecida
                        </span>
                        <span className={`text-sm font-black ${isQuebra ? 'text-red-400' : 'text-slate-900'}`}>
                           {meta}
                        </span>
                    </div>
                </div>
            </div>
            <div className={`mt-8 flex items-center gap-4`}>
                <div className={`h-2 flex-1 rounded-full overflow-hidden ${isQuebra ? 'bg-red-100' : 'bg-slate-100'}`}>
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: isQuebra ? '100%' : '75%' }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${isQuebra ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}
                    />
                </div>
                {isQuebra && <AlertCircle className="w-6 h-6 text-red-500 animate-pulse" />}
            </div>
        </div>
    );
}
