import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotificationManager } from '../../hooks/useNotificationManager';
import { NotificationSettingsPanel } from '../logistics/NotificationSettingsPanel';
import { AdminRouteStatsImporter } from './AdminRouteStatsImporter';
import { 
  Volume2, 
  VolumeX, 
  Settings, 
  Bell, 
  Info, 
  ShieldCheck, 
  HelpCircle,
  Volume1,
  Sparkles,
  Clock,
  Tv,
  Play,
  Pause,
  TrendingUp,
  Activity,
  CheckSquare,
  LayoutGrid
} from 'lucide-react';

interface AdminSettingsProps {
  tvModeInterval?: number;
  setTvModeInterval?: (interval: number) => void;
}

export function AdminSettingsView({ tvModeInterval = 15000, setTvModeInterval }: AdminSettingsProps) {
  const {
    permission: notificationPermission,
    notificationsEnabled,
    fcmStatus,
    fcmToken,
    statusMessage,
    toggleNotifications,
    requestPermission: requestNotificationPermission,
    triggerDelayedSimulation,
    recheckFcm
  } = useNotificationManager();

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('saudeSoundAlert');
      return saved !== 'false';
    } catch (_) {
      return true;
    }
  });

  // Carousel Desempenho Operacional States
  const [productionTvModeActive, setProductionTvModeActive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('production_tv_mode_active');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [productionTvModeInterval, setProductionTvModeInterval] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('production_tv_mode_interval');
      return saved ? parseInt(saved, 10) : 15000;
    } catch {
      return 15000;
    }
  });

  // Dashboard de Produtividade States
  const [productivityTvMode, setProductivityTvMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('productivity_tv_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [productivityTvModeInterval, setProductivityTvModeInterval] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('productivity_tv_mode_interval');
      return saved ? parseInt(saved, 10) : 10000;
    } catch {
      return 10000;
    }
  });

  // Seleção de Abas do Modo TV
  const [tvModeSelectedTabs, setTvModeSelectedTabs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tv_mode_selected_tabs');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return ['log_analytics', 'painel', 'route_dashboard', 'saude', 'productivity_ops', 'avisos'];
  });

  const toggleTvTab = (tabId: string) => {
    const isSelected = tvModeSelectedTabs.includes(tabId);
    let next;
    if (isSelected) {
      next = tvModeSelectedTabs.filter(id => id !== tabId);
    } else {
      next = [...tvModeSelectedTabs, tabId];
    }
    setTvModeSelectedTabs(next);
    localStorage.setItem('tv_mode_selected_tabs', JSON.stringify(next));
    window.dispatchEvent(new Event('storage'));
  };

  const tvTabOptions = [
    { id: 'log_analytics', name: 'Log. Analytics - Dashboard (Logística)', desc: 'Gráficos de volumetria, de faturamento e cubagem expedida.' },
    { id: 'painel', name: 'Desempenho Operacional (Produção)', desc: 'Comparativos horários, metas e indicadores de expedição.' },
    { id: 'route_dashboard', name: 'Cortes & Fluxo de Caixa por Rota', desc: 'Rastreamento de caixas em circulação (ZWM), vendas e cortes por rota.' },
    { id: 'saude', name: 'Saúde da Operação (Presença / Absenteeismo)', desc: 'Avisos de absentismo e taxa de rotação operacional.' },
    { id: 'productivity_ops', name: 'Painel de Produtividade', desc: 'Metas e performance horária detalhada por setor.' },
    { id: 'avisos', name: 'Mural de Avisos / Comunicados', desc: 'Mapeamento de comunicados internos do CD.' }
  ];

  const [testSuccess, setTestSuccess] = useState(false);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('saudeSoundAlert', String(next));
  };

  const toggleProductionTvMode = () => {
    const next = !productionTvModeActive;
    setProductionTvModeActive(next);
    localStorage.setItem('production_tv_mode_active', String(next));
    window.dispatchEvent(new Event('storage'));
  };

  const handleProductionIntervalChange = (val: number) => {
    setProductionTvModeInterval(val);
    localStorage.setItem('production_tv_mode_interval', String(val));
    window.dispatchEvent(new Event('storage'));
  };

  const toggleProductivityTvMode = () => {
    const next = !productivityTvMode;
    setProductivityTvMode(next);
    localStorage.setItem('productivity_tv_mode', String(next));
    window.dispatchEvent(new Event('storage'));
  };

  const handleProductivityIntervalChange = (val: number) => {
    setProductivityTvModeInterval(val);
    localStorage.setItem('productivity_tv_mode_interval', String(val));
    window.dispatchEvent(new Event('storage'));
  };

  const playSoftChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Soft, harmonious pentatonic high-end chime
      const notes = [659.25, 880, 1109.73, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        
        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.05, now + idx * 0.08 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.75);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.85);
      });

      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 2000);
    } catch (e) {
      console.error("Browser audio could not play:", e);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Configuration Header Card */}
      <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </span>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Painel Administrativo</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight uppercase">Configurações de Sistemas & Alertas</h2>
          <p className="text-slate-400 text-xs font-semibold max-w-xl">
            Gerencie as permissões e parâmetros do sistema de monitoramento de saúde operacional, incluindo notificações via canais de som secundários e gateway unificados de Cloud Push FCM.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl shrink-0 z-10 self-start md:self-center">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Acesso de Gestão</span>
            <span className="text-xs font-bold text-slate-200">Administrador Autenticado</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* 1. Notifications Setup Panel (FCM) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Bell className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Central de Notificações Cloud & Push API</h3>
          </div>
          
          <NotificationSettingsPanel
            notificationPermission={notificationPermission}
            notificationsEnabled={notificationsEnabled}
            fcmStatus={fcmStatus}
            fcmToken={fcmToken}
            statusMessage={statusMessage}
            toggleNotifications={toggleNotifications}
            requestNotificationPermission={requestNotificationPermission}
            triggerDelayedSimulation={triggerDelayedSimulation}
            recheckFcm={recheckFcm}
          />
        </div>

        {/* 2. Sound Monitor Options Panel */}
        <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Volume2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Configuração do Canal de Alerta Sonoro</h3>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-5 p-5 bg-slate-50 rounded-2xl border border-slate-150 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-500 h-full" />
            
            <div className="flex items-center gap-3.5 pl-2">
              <div className={`p-3 rounded-2xl flex items-center justify-center transition-all shadow-inner ${
                soundEnabled ? 'bg-emerald-50/80 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}>
                {soundEnabled ? <Volume2 className="w-5.5 h-5.5 animate-pulse" /> : <VolumeX className="w-5.5 h-5.5" />}
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 leading-none flex flex-wrap items-center gap-2">
                  Monitoramento de Alerta Sonoro
                  {soundEnabled ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest bg-emerald-100 text-emerald-650 uppercase">
                      <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
                      Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest bg-slate-100 text-slate-500 uppercase">
                      Inativo
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-500 font-extrabold tracking-wider mt-2 max-w-lg leading-relaxed">
                  {soundEnabled 
                    ? "Um sino sonoro harmonioso tocará automaticamente na central sempre que houver quebras de metas operacionais (comercial, operacional ou UPM) para alertar os gestores." 
                    : "Os alertas sonoros automáticos estão silenciados. Ative a cauda sonora para receber instruções auditivas em tempo real no monitor de TV."}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5 shrink-0 w-full lg:w-auto justify-end">
              <button
                type="button"
                onClick={toggleSound}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  soundEnabled 
                    ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-650' 
                    : 'bg-emerald-500 hover:bg-emerald-600 border-transparent text-white shadow-md'
                }`}
              >
                {soundEnabled ? 'Desativar Som' : 'Ativar Alerta Sonoro'}
              </button>
              
              <button
                type="button"
                onClick={playSoftChime}
                className={`px-4 py-2.5 border rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  testSuccess 
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700' 
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {testSuccess ? (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                    Sucesso!
                  </>
                ) : (
                  <>
                    <Volume1 className="w-4 h-4" />
                    Testar Volume
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 2.5 Carga de Tabelas das Rotas (ZWM, Vendas e Cortes) */}
        <AdminRouteStatsImporter />

        {/* 3. TV Mode Rotation Setup Panel */}
        <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Tv className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Configuração Avançada do Modo TV</h3>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* 3.1 Transição Geral de Painéis */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-5 p-5 bg-slate-50 rounded-2xl border border-slate-150 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-indigo-500 to-violet-500 h-full" />
              
              <div className="flex items-center gap-3.5 pl-2">
                <div className="p-3 rounded-2xl flex items-center justify-center bg-indigo-50/80 text-indigo-600 border border-indigo-100 shadow-inner shrink-0">
                  <Clock className="w-5.5 h-5.5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 leading-none flex flex-wrap items-center gap-2">
                    Rotação Geral entre Painéis de Operações
                  </h4>
                  <p className="text-xs text-slate-500 font-extrabold tracking-wider mt-2 max-w-lg leading-relaxed">
                    Define o tempo de permanência em cada aba principal (Logística, Produção, Presença, Produtividade, Avisos) antes de avançar para a próxima quando maximizado.
                  </p>
                </div>
              </div>
              
              <div className="w-full lg:w-64 shrink-0">
                <select
                  value={tvModeInterval}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (setTvModeInterval) {
                      setTvModeInterval(val);
                    }
                    localStorage.setItem('tv_mode_rotation_interval', String(val));
                    window.dispatchEvent(new Event('storage'));
                  }}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={10000}>10 segundos</option>
                  <option value={15000}>15 segundos</option>
                  <option value={20000}>20 segundos</option>
                  <option value={30000}>30 segundos</option>
                  <option value={60000}>1 minuto</option>
                  <option value={300000}>5 minutos</option>
                </select>
              </div>
            </div>

            {/* 3.2 Desempenho Operacional (Gráficos vs. Top 5 Performance) */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-5 p-5 bg-slate-50 rounded-2xl border border-slate-150 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-amber-500 to-orange-500 h-full" />
              
              <div className="flex items-center gap-3.5 pl-2 w-full lg:w-auto">
                <div className="p-3 rounded-2xl flex items-center justify-center bg-amber-50/80 text-amber-600 border border-amber-100 shadow-inner shrink-0">
                  <TrendingUp className="w-5.5 h-5.5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 leading-none flex flex-wrap items-center gap-2">
                    Desempenho Operacional: Gráficos vs. Top 5 Performance
                  </h4>
                  <p className="text-xs text-slate-500 font-extrabold tracking-wider mt-2 max-w-lg leading-relaxed">
                    Intervalo de troca automática de tela e controle de atividade na aba "Desempenho Operacional" (entre Gráficos Gerais e Rankings TOP 5).
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full lg:w-64 shrink-0">
                <button
                  type="button"
                  onClick={toggleProductionTvMode}
                  className={`p-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center cursor-pointer ${
                    productionTvModeActive 
                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                      : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                  }`}
                  title={productionTvModeActive ? "Pausar Alternância" : "Iniciar Alternância"}
                >
                  {productionTvModeActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <select
                  value={productionTvModeInterval}
                  onChange={(e) => handleProductionIntervalChange(parseInt(e.target.value, 10))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={5000}>5 segundos</option>
                  <option value={10000}>10 segundos</option>
                  <option value={15000}>15 segundos</option>
                  <option value={20000}>20 segundos</option>
                  <option value={30000}>30 segundos</option>
                  <option value={60000}>1 minuto</option>
                </select>
              </div>
            </div>

            {/* 3.3 Dashboard de Produtividade (CONFERENCIA E SEPARAÇÃO) */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-5 p-5 bg-slate-50 rounded-2xl border border-slate-150 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 h-full" />
              
              <div className="flex items-center gap-3.5 pl-2 w-full lg:w-auto">
                <div className="p-3 rounded-2xl flex items-center justify-center bg-blue-50/80 text-blue-600 border border-blue-100 shadow-inner shrink-0">
                  <Activity className="w-5.5 h-5.5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 leading-none flex flex-wrap items-center gap-2">
                    Dashboard de Produtividade: Conferência vs. Separação
                  </h4>
                  <p className="text-xs text-slate-500 font-extrabold tracking-wider mt-2 max-w-lg leading-relaxed">
                    Intervalo de troca automática e controle de reprodução no "Painel de Produtividade" (entre as visões de Conferência e Separação).
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full lg:w-64 shrink-0">
                <button
                  type="button"
                  onClick={toggleProductivityTvMode}
                  className={`p-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center cursor-pointer ${
                    productivityTvMode 
                      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' 
                      : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                  }`}
                  title={productivityTvMode ? "Pausar Alternância" : "Iniciar Alternância"}
                >
                  {productivityTvMode ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <select
                  value={productivityTvModeInterval}
                  onChange={(e) => handleProductivityIntervalChange(parseInt(e.target.value, 10))}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={5000}>5 segundos</option>
                  <option value={10000}>10 segundos</option>
                  <option value={15000}>15 segundos</option>
                  <option value={20000}>20 segundos</option>
                  <option value={30000}>30 segundos</option>
                  <option value={60000}>1 minuto</option>
                </select>
              </div>
            </div>

            {/* 3.4 Seleção de Abas Inclusas na Rotação */}
            <div className="flex flex-col p-5 bg-slate-50 rounded-2xl border border-slate-150 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-purple-500 to-indigo-600 h-full" />
              
              <div className="flex items-start gap-3.5 pl-2 mb-4">
                <div className="p-3 rounded-2xl flex items-center justify-center bg-purple-50/80 text-purple-600 border border-purple-100 shadow-inner shrink-0 mt-0.5">
                  <LayoutGrid className="w-5.5 h-5.5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 leading-none flex items-center gap-2">
                    Abas Inclusas na Rotação Geral (Modo TV)
                  </h4>
                  <p className="text-xs text-slate-500 font-extrabold tracking-wider mt-2 max-w-xl leading-relaxed">
                    Marque quais painéis principais do CD devem fazer parte da rotação cíclica no Modo TV. Caso nenhuma esteja selecionada, todas serão rotacionadas como padrão.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pl-2">
                {tvTabOptions.map((opt) => {
                  const isChecked = tvModeSelectedTabs.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleTvTab(opt.id)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all hover:shadow-xs cursor-pointer ${
                        isChecked
                          ? 'bg-white border-indigo-200 shadow-sm'
                          : 'bg-slate-50/50 border-slate-200 text-slate-400 opacity-75'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} 
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                      />
                      <div className="space-y-1">
                        <span className={`block text-xs font-bold leading-none ${isChecked ? 'text-slate-800' : 'text-slate-500'}`}>
                          {opt.name}
                        </span>
                        <p className="text-[10px] whitespace-normal text-slate-400 font-semibold leading-relaxed">
                          {opt.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* Help / Tips area */}
        <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="block text-[10px] font-black uppercase text-indigo-700 tracking-wider">Como funciona o Alerta de Meta?</span>
            <p className="text-xs text-indigo-950 font-medium leading-relaxed">
              O sistema verifica continuamente as projeções atualizadas de cancelamento (operacional/comercial) e unidades por homem-hora (UPM). Sempre que algum indicador exceder a margem admissível, o sistema utiliza o canal de push do navegador no plano secundário, e emite o aviso audível se a caixa sonora estiver ligada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
