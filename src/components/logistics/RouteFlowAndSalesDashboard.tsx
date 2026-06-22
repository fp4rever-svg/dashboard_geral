import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, 
  TrendingDown, 
  TrendingUp, 
  ChevronRight, 
  Search, 
  Layers, 
  FileSpreadsheet, 
  Workflow, 
  Package, 
  AlertTriangle,
  Flame,
  CheckCircle2,
  Box,
  Truck
} from 'lucide-react';
import { useRouteFlowData } from '../../hooks/useRouteFlowData';

export function RouteFlowAndSalesDashboard() {
  const { 
    allRoutes, 
    getRouteData, 
    zwmTotals, 
    salesTotal, 
    cutsTotal, 
    percentCutsGlobal,
    loading 
  } = useRouteFlowData();

  const [activeSubTab, setActiveSubTab] = useState<'boxes' | 'sales_cuts'>('boxes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  const filteredRoutes = allRoutes.filter(route => 
    route.includes(searchQuery)
  );

  // ZWM totalizer metrics helper
  const maxZwmMetric = Math.max(
    zwmTotals.caixasSeparacao || 1,
    zwmTotals.separacao || 1,
    zwmTotals.conferencia || 1,
    zwmTotals.postoEmbalagem || 1,
    zwmTotals.expedicao || 1
  );

  const formatPercent = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  };

  const getPercentColor = (pct: number) => {
    if (pct === 0) return 'text-slate-400 bg-slate-100';
    if (pct < 0.5) return 'text-emerald-600 bg-emerald-50 border border-emerald-100';
    if (pct <= 1.5) return 'text-amber-600 bg-amber-50 border border-amber-100';
    return 'text-red-600 bg-red-50 border border-red-100 animate-pulse';
  };

  const currentRouteData = selectedRoute ? getRouteData(selectedRoute) : null;

  return (
    <div className="space-y-6">
      {/* 1. Global Performance Metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-8 -mt-8 -z-0 opacity-50" />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Volume de Vendas (CD)</span>
            <span className="text-3xl font-black text-slate-900 mt-2">{salesTotal.toLocaleString('pt-BR')} <span className="text-xs text-slate-400 font-extrabold font-mono">unid</span></span>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 font-bold">
              <Package className="w-4 h-4 text-blue-500" />
              <span>Faturamento e cubagem consolidada</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full -mr-8 -mt-8 -z-0 opacity-50" />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total de Cortes</span>
            <span className="text-3xl font-black text-red-600 mt-2">{cutsTotal.toLocaleString('pt-BR')} <span className="text-xs text-slate-400 font-extrabold font-mono font-sans font-sans">unid</span></span>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 font-bold">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span>Itens com corte físico na expedição</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-8 -mt-8 -z-0 opacity-50" />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Índice Geral de Cortes</span>
            <span className="text-3xl font-black text-indigo-600 mt-2">{formatPercent(percentCutsGlobal)}</span>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 font-bold">
              <TrendingDown className="w-4 h-4 text-indigo-500" />
              <span>Meta estipulada de corte: &lt; 0.50%</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-8 -mt-8 -z-0 opacity-50" />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Status Fluxo ZWM0255P</span>
            <span className="text-3xl font-black text-slate-800 mt-2">{(zwmTotals.caixasSeparacao).toLocaleString('pt-BR')} <span className="text-xs text-slate-400 font-normal">cx</span></span>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 font-bold">
              <Workflow className="w-4 h-4 text-amber-500" />
              <span>Caixas ativas em circulação</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 2. Controls and Sub tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 bg-slate-100 rounded-2xl">
        <div className="flex items-center gap-1 w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('boxes')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'boxes' 
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
                : 'text-slate-500 hover:text-slate-900 bg-transparent'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Workflow className="w-4 h-4" />
              <span>Fluxo de Caixas (ZWM0255P)</span>
            </div>
          </button>
          <button
            onClick={() => setActiveSubTab('sales_cuts')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'sales_cuts' 
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
                : 'text-slate-500 hover:text-slate-900 bg-transparent'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span>Vendas vs Cortes</span>
            </div>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar por Rota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* 3. Sub Tabs Rendering */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main interactive panel */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-150 shadow-xs space-y-6">
          {activeSubTab === 'boxes' ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Mapeamento de Fluxo Operacional de Caixas</h3>
                <p className="text-xs text-slate-400 font-bold">Distribuição atualizada de caixas por setor conforme ZWM0255P.</p>
              </div>

              {/* Box flow map widget */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-1">Passo 1</span>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase">Em Uso</span>
                  </div>
                  <span className="text-2xl font-black text-indigo-700 mt-2 font-mono">{zwmTotals.cxSepEmUso.toLocaleString()} <span className="text-xs text-slate-400 font-bold">cx</span></span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-1">Passo 2</span>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase">Faltas</span>
                  </div>
                  <span className="text-2xl font-black text-blue-600 mt-2 font-mono">{zwmTotals.recFaltas.toLocaleString()} <span className="text-xs text-slate-400 font-bold">cx</span></span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-1">Passo 3</span>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase">Em Separação</span>
                  </div>
                  <span className="text-2xl font-black text-amber-600 mt-2 font-mono">{zwmTotals.separacao.toLocaleString()} <span className="text-xs text-slate-400 font-bold">cx</span></span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-black text-sky-500 uppercase tracking-widest block mb-1">Passo 4</span>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase">Em Conferência</span>
                  </div>
                  <span className="text-2xl font-black text-sky-600 mt-2 font-mono">{zwmTotals.conferencia.toLocaleString()} <span className="text-xs text-slate-400 font-bold">cx</span></span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between col-span-2 md:col-span-1">
                  <div>
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Passo 5</span>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase">Expedição</span>
                  </div>
                  <span className="text-2xl font-black text-emerald-600 mt-2 font-mono">{zwmTotals.expedicao.toLocaleString()} <span className="text-xs text-slate-400 font-bold">cx</span></span>
                </div>
              </div>

              {/* Progress Pipelines visual comparison */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Carga Operacional Relativa por Canal Principal</h4>
                
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[10px] font-extrabold text-slate-500 mb-1">
                      <span>CAIXA DE SEPARAÇÃO (TOTAL CARGA)</span>
                      <span className="font-mono text-slate-700">{zwmTotals.caixasSeparacao.toLocaleString()} / {(zwmTotals.caixasSeparacao).toLocaleString()} (100%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-extrabold text-slate-500 mb-1">
                      <span>EM SEPARAÇÃO</span>
                      <span className="font-mono text-slate-700">{zwmTotals.separacao.toLocaleString()} ({zwmTotals.caixasSeparacao > 0 ? Math.round(zwmTotals.separacao / zwmTotals.caixasSeparacao * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${zwmTotals.caixasSeparacao > 0 ? (zwmTotals.separacao / zwmTotals.caixasSeparacao * 100) : 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-extrabold text-slate-500 mb-1">
                      <span>CONFERÊNCIA</span>
                      <span className="font-mono text-slate-700">{zwmTotals.conferencia.toLocaleString()} ({zwmTotals.caixasSeparacao > 0 ? Math.round(zwmTotals.conferencia / zwmTotals.caixasSeparacao * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-sky-500 h-full rounded-full" style={{ width: `${zwmTotals.caixasSeparacao > 0 ? (zwmTotals.conferencia / zwmTotals.caixasSeparacao * 100) : 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-extrabold text-slate-500 mb-1">
                      <span>POSTO EMBALAGEM</span>
                      <span className="font-mono text-slate-700">{zwmTotals.postoEmbalagem.toLocaleString()} ({zwmTotals.caixasSeparacao > 0 ? Math.round(zwmTotals.postoEmbalagem / zwmTotals.caixasSeparacao * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${zwmTotals.caixasSeparacao > 0 ? (zwmTotals.postoEmbalagem / zwmTotals.caixasSeparacao * 100) : 0}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-extrabold text-slate-500 mb-1">
                      <span>EXPEDIÇÃO (FALTA EXPEDIR)</span>
                      <span className="font-mono text-slate-700">{zwmTotals.expedicao.toLocaleString()} ({zwmTotals.caixasSeparacao > 0 ? Math.round(zwmTotals.expedicao / zwmTotals.caixasSeparacao * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${zwmTotals.caixasSeparacao > 0 ? (zwmTotals.expedicao / zwmTotals.caixasSeparacao * 100) : 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Visão de Cortes vs Volume de Unidades de Vendas</h3>
                <p className="text-xs text-slate-400 font-bold">Correlação direta entre o volume vendido e os cortes por rota, destacando o impacto percentual real.</p>
              </div>

              {/* Gauge design for global ratio and explanation of cutoff */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1.5 text-center md:text-left">
                  <span className="text-[10px] font-black text-indigo-600 bg-white border border-indigo-100 px-2 py-0.5 rounded-md uppercase tracking-wider">Métrica de Qualidade</span>
                  <p className="text-sm font-bold text-slate-800 mt-2">Índice Máximo Recomendável de Cortes</p>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm font-medium">A perda de vendas por corte interfere diretamente na lucratividade e no tempo de atendimento das rotas. Rotas com índices acima de 1.5% requerem análise imediata pela administração.</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-xs flex flex-col items-center shrink-0 w-40 text-center">
                  <span className="text-[8px] font-black text-slate-400 block uppercase">Limite Crítico</span>
                  <span className="text-2xl font-black text-indigo-600 mt-1">1.50%</span>
                  <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden my-3">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: '40%' }} />
                  </div>
                  <span className="text-[9px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md font-bold uppercase">Meta Consolidada</span>
                </div>
              </div>

              {/* Performance rankings of Cuts vs Sales */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span>Rotas Oficiais com Alta Razão de Corte (&gt; 1.5%)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allRoutes.map(route => {
                    const info = getRouteData(route);
                    if (!info || !info.salesCuts || info.salesCuts.percentCorte <= 1.5) return null;
                    return (
                      <div 
                        key={route}
                        onClick={() => setSelectedRoute(route)}
                        className="bg-white p-3 rounded-xl border border-red-150 hover:border-red-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <span className="text-[9px] font-black text-slate-300 block uppercase tracking-widest leading-none">Rota</span>
                          <span className="text-sm font-black text-slate-800 leading-none">{route}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-red-600 font-mono block leading-none">{info.salesCuts.percentCorte.toFixed(2)}%</span>
                          <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">({info.salesCuts.cortes} cortes)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Table list of Route details */}
          <div className="border border-slate-150 rounded-2xl overflow-hidden mt-6">
            <div className="bg-slate-50 border-b border-indigo-50 px-4 py-3 flex items-center justify-between">
              <span className="text-[10px] font-black text-indigo-900 uppercase tracking-wider">Listagem Detalhada por Rotas</span>
              <span className="text-[9px] text-slate-400 font-black font-mono">Total de {filteredRoutes.length} rotas filtradas</span>
            </div>
            
            <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] text-slate-500 font-black uppercase tracking-widest border-b border-slate-150">
                    <th className="p-3">Rota</th>
                    {activeSubTab === 'boxes' ? (
                      <>
                        <th className="p-3 text-right">Mapeamento Caixas</th>
                        <th className="p-3 text-right">Uso</th>
                        <th className="p-3 text-right">Faltas</th>
                        <th className="p-3 text-right">Separação</th>
                        <th className="p-3 text-right">Conferência</th>
                        <th className="p-3 text-right">Posto</th>
                        <th className="p-3 text-right">Expedição</th>
                      </>
                    ) : (
                      <>
                        <th className="p-3 text-right">Volume Unidades Vendidas</th>
                        <th className="p-3 text-right">Quantidade Cortes</th>
                        <th className="p-3 text-center">Impacto (% Cortes)</th>
                        <th className="p-3 text-center">Status Alerta</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRoutes.map((route) => {
                    const rData = getRouteData(route);
                    if (!rData) return null;
                    const isSelected = selectedRoute === route;

                    return (
                      <tr 
                        key={route}
                        onClick={() => setSelectedRoute(route)}
                        className={`hover:bg-indigo-50/40 transition-colors cursor-pointer group ${
                          isSelected ? 'bg-indigo-50/70 hover:bg-indigo-50/80 font-semibold' : ''
                        }`}
                      >
                        <td className="p-3 font-black text-slate-800">
                          <div className="flex items-center gap-1">
                            <ChevronRight className={`w-3.5 h-3.5 text-indigo-500 transition-transform ${isSelected ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
                            <span>{route}</span>
                          </div>
                        </td>
                        {activeSubTab === 'boxes' ? (
                          <>
                            <td className="p-3 text-right font-mono text-slate-800 font-bold">
                              {rData.zwm?.caixasSeparacao ? rData.zwm.caixasSeparacao.toLocaleString() : '-'}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-600">
                              {rData.zwm?.cxSepEmUso ? rData.zwm.cxSepEmUso.toLocaleString() : '-'}
                            </td>
                            <td className="p-3 text-right font-mono text-red-500 font-bold">
                              {rData.zwm?.recFaltas ? rData.zwm.recFaltas.toLocaleString() : '-'}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-600">
                              {rData.zwm?.separacao ? rData.zwm.separacao.toLocaleString() : '-'}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-600">
                              {rData.zwm?.conferencia ? rData.zwm.conferencia.toLocaleString() : '-'}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-600">
                              {rData.zwm?.postoEmbalagem ? rData.zwm.postoEmbalagem.toLocaleString() : '-'}
                            </td>
                            <td className="p-3 text-right font-mono text-emerald-600 font-bold">
                              {rData.zwm?.expedicao ? rData.zwm.expedicao.toLocaleString() : '-'}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 text-right font-mono text-slate-800 font-bold">
                              {rData.salesCuts?.vendas ? rData.salesCuts.vendas.toLocaleString() : '0'}
                            </td>
                            <td className="p-3 text-right font-mono text-red-600 font-bold">
                              {rData.salesCuts?.cortes ? rData.salesCuts.cortes.toLocaleString() : '0'}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black font-mono inline-block ${
                                getPercentColor(rData.salesCuts?.percentCorte || 0)
                              }`}>
                                {rData.salesCuts?.percentCorte ? rData.salesCuts.percentCorte.toFixed(2) + '%' : '0,00%'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {(rData.salesCuts?.percentCorte || 0) > 1.5 ? (
                                <span className="text-[9px] font-black uppercase text-red-600 bg-red-100/50 px-2 py-0.5 rounded-full border border-red-200">
                                  Crítico
                                </span>
                              ) : (rData.salesCuts?.percentCorte || 0) > 0.5 ? (
                                <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-100/50 px-2 py-0.5 rounded-full border border-amber-200">
                                  Atenção
                                </span>
                              ) : (
                                <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  Normal
                                </span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Selected Route sidebar dynamic display */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-xs">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Investigador Detalhado</h3>

            {currentRouteData ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.15em] block leading-none">Ficha da Operação</span>
                    <h4 className="text-2xl font-black text-slate-900 mt-2">Rota {currentRouteData.rota}</h4>
                  </div>
                  <span className="text-xs text-indigo-600 bg-indigo-50 font-black px-3 py-1 rounded-xl border border-indigo-100">CD Ativo</span>
                </div>

                {/* 1. ZWM Box Distribution workflow */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Distribuição de Caixas (ZWM0255P)</span>
                  
                  {currentRouteData.zwm ? (
                    <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-extrabold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                          Caixas Totais
                        </span>
                        <span className="font-black text-slate-800 font-mono">{currentRouteData.zwm.caixasSeparacao}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-extrabold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Em Uso
                        </span>
                        <span className="font-black text-slate-800 font-mono">{currentRouteData.zwm.cxSepEmUso}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-extrabold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Soma Rec Faltas
                        </span>
                        <span className="font-black text-red-650 font-mono">{currentRouteData.zwm.recFaltas}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-extrabold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Em Separação
                        </span>
                        <span className="font-black text-slate-800 font-mono">{currentRouteData.zwm.separacao}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-extrabold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                          Em Conferência
                        </span>
                        <span className="font-black text-slate-800 font-mono">{currentRouteData.zwm.conferencia}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-extrabold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          Posto Embalagem
                        </span>
                        <span className="font-black text-slate-800 font-mono">{currentRouteData.zwm.postoEmbalagem}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-extrabold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Finalizado Expedição
                        </span>
                        <span className="font-black text-emerald-600 font-mono">{currentRouteData.zwm.expedicao}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-2xl text-center text-xs border border-slate-100 text-slate-400 font-semibold py-6">
                      Mapeamento ZWM indisponível para esta rota especifica
                    </div>
                  )}
                </div>

                {/* 2. Sales vs Cuts with correlation index */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Volume de Unidades de Venda e Cortes</span>
                  
                  {currentRouteData.salesCuts ? (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 block uppercase">Uni. Vendas</span>
                          <span className="text-lg font-black text-slate-800 font-mono">{currentRouteData.salesCuts.vendas.toLocaleString()}</span>
                        </div>
                        <div className="space-y-1 text-right">
                          <span className="text-[9px] font-black text-slate-400 block uppercase">Qtd. Cortes</span>
                          <span className="text-lg font-black text-red-600 font-mono">{currentRouteData.salesCuts.cortes.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-extrabold">% Cortes em Relação Vendas</span>
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono ${
                          getPercentColor(currentRouteData.salesCuts.percentCorte)
                        }`}>
                          {currentRouteData.salesCuts.percentCorte.toFixed(2)}%
                        </span>
                      </div>

                      {/* Visual gauge bar comparing cuts with safety thresholds */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-extrabold text-slate-400 uppercase">
                          <span>Indicador Gravidade</span>
                          <span>{(currentRouteData.salesCuts.percentCorte) > 1.5 ? 'Crítico (Excede 1.5%)' : 'Dentro do Limite'}</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              currentRouteData.salesCuts.percentCorte > 1.5 ? 'bg-red-500' : 'bg-indigo-600'
                            }`} 
                            style={{ width: `${Math.min(100, currentRouteData.salesCuts.percentCorte * 20)}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-2xl text-center text-xs border border-slate-100 text-slate-400 font-semibold py-6">
                      Métricas de vendas indisponíveis
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 px-4">
                <Box className="w-10 h-10 text-slate-300 mx-auto stroke-[1.5] mb-3" />
                <p className="text-xs text-slate-500 font-black uppercase">Nenhuma Rota Selecionada</p>
                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold mt-1">Selecione uma rota da tabela de listagem ao lado para obter um diagnóstico aprofundado dos processos logísticos.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
