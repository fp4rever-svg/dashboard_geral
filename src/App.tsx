import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { SideNavBar } from './components/layout/SideNavBar';
import { MinimalHeader } from './components/layout/MinimalHeader';
import { KPICard } from './components/dashboard/KPICard';
import { HourlyTrendChart } from './components/dashboard/HourlyTrendChart';
import { PerformanceTable } from './components/dashboard/PerformanceTable';
import { LogisticsDashboardView } from './components/logistics/LogisticsDashboardView';
import { LogisticsTable } from './components/logistics/LogisticsTable';
import { LoginForm } from './components/auth/LoginForm';
import { ProductionDashboardView } from './components/dashboard/ProductionDashboardView';
import { DailyProjectionView } from './components/admin/DailyProjectionView';
import { AbsenteeismManagement } from './components/admin/AbsenteeismManagement';
import { AdminSettingsView } from './components/admin/AdminSettingsView';
import { ProductivityReportView } from './components/admin/ProductivityReportView';
import { AIBaseManagementView } from './components/admin/AIBaseManagementView';
import FloatingAIAssistant from './components/views/FloatingAIAssistant';
import { Package, Clock, Box, LayoutGrid, Lock, LogOut, User as UserIcon, LineChart, Users, Maximize, Minimize2, Tv } from 'lucide-react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { handleFirestoreError, OperationType, parseValue } from './lib/utils';

const initialData = [
  { hora: '17:00:00', cubagem: '4.577,00', separaACS: '4,00', separaUND: '27,00', cFrac: '—' },
  { hora: '18:00:00', cubagem: '738,00', separaACS: '586,00', separaUND: '2.361,00', cFrac: '157,00' },
  { hora: '19:00:00', cubagem: '2.489,00', separaACS: '843,00', separaUND: '3.250,00', cFrac: '1.052,00' },
  { hora: '20:00:00', cubagem: '5.412,00', separaACS: '1.103,00', separaUND: '2.871,00', cFrac: '1.075,00' },
  { hora: '21:00:00', cubagem: '4.429,00', separaACS: '1.014,00', separaUND: '2.674,00', cFrac: '2.499,00' },
  { hora: '22:00:00', cubagem: '23,00', separaACS: '1.214,00', separaUND: '3.376,00', cFrac: '3.543,00' },
  { hora: '23:00:00', cubagem: '—', separaACS: '2.015,00', separaUND: '8.062,00', cFrac: '5.093,00' },
  { hora: '00:00:00', cubagem: '—', separaACS: '1.141,00', separaUND: '2.796,00', cFrac: '1.255,00' },
];

import { useLogisticsData } from './hooks/useLogisticsData';
import { useProjectionData } from './hooks/useProjectionData';
import { useProductionAnalytics } from './hooks/useProductionAnalytics';
import { useAbsenteeismData } from './hooks/useAbsenteeismData';
import { useAnnouncements } from './hooks/useAnnouncements';
import { useAppMetadata } from './hooks/useAppMetadata';
import { GlobalAlertBar } from './components/common/GlobalAlertBar';
import { StatusClocks } from './components/common/StatusClocks';
import AnnouncementsView from './components/views/AnnouncementsView';

export default function App() {
  const { data: persistentData, updateAllData: updateAnalytics, updateRow: updateAnalyticsRow, lastUpdated: analyticsUpdate } = useProductionAnalytics();
  const { lastUpdated: announcementsUpdate } = useAnnouncements();
  const { lastUpdated: logisticsUpdate } = useLogisticsData();
  const { lastUpdated: projectionUpdate } = useProjectionData();
  const { lastUpdated: absenteeismUpdate } = useAbsenteeismData();
  const { lastUpdated: manualUpdate, updateLastUpdated, lastUploadAt } = useAppMetadata();
  
  const [activeTab, setActiveTab] = useState('log_analytics');
  const [isMaximized, setIsMaximized] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [isGenericAdmin, setIsGenericAdmin] = useState(() => localStorage.getItem('isGenericAdmin') === 'true');
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [tvModeInterval, setTvModeInterval] = useState<number>(() => {
    const saved = localStorage.getItem('tv_mode_rotation_interval');
    return saved ? parseInt(saved, 10) : 15000; // default 15 seconds
  });

  const ADMIN_EMAIL = 'fp4rever@gmail.com';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Efeito para alternância automática das abas de Operações no Modo TV (com intervalo customizado)
  useEffect(() => {
    if (!isMaximized) return;

    const rotatableTabs = ['log_analytics', 'painel', 'saude', 'productivity_ops', 'avisos'];
    
    // Se estiver em uma aba que não faz parte das abas rotacionáveis de Operações,
    // redefine imediatamente para a primeira aba da lista.
    if (!rotatableTabs.includes(activeTab)) {
      setActiveTab('log_analytics');
    }

    const interval = setInterval(() => {
      setActiveTab((current) => {
        const currentIndex = rotatableTabs.indexOf(current);
        const nextIndex = (currentIndex === -1 ? 0 : currentIndex + 1) % rotatableTabs.length;
        return rotatableTabs[nextIndex];
      });
    }, tvModeInterval); // Alternar visualização a cada tvModeInterval milissegundos

    return () => clearInterval(interval);
  }, [isMaximized, activeTab, tvModeInterval]);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleGenericLogin = (username: string) => {
    setIsGenericAdmin(true);
    localStorage.setItem('isGenericAdmin', 'true');
    setShowLogin(false);
  };

  const handleLogout = async () => {
    if (user) await signOut(auth);
    setIsGenericAdmin(false);
    localStorage.removeItem('isGenericAdmin');
  };

  const isAdmin = (user?.email === ADMIN_EMAIL) || isGenericAdmin;

  const data = persistentData.length > 0 ? persistentData : initialData;

  const { data: projectionData } = useProjectionData();

  const totals = data.reduce((acc, item) => {
    acc.totalCubagem += parseValue(item.cubagem);
    acc.totalSeparaACS += parseValue(item.separaACS);
    acc.totalSeparaUND += parseValue(item.separaUND);
    acc.totalCFracUND += parseValue(item.cFrac);
    return acc;
  }, { totalCubagem: 0, totalSeparaACS: 0, totalSeparaUND: 0, totalCFracUND: 0 });

  const totalsWithAvg = {
      ...totals,
      averageSeparaACS: data.length > 0 ? totals.totalSeparaACS / data.length : 0
  };

  const formatValue = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const now = new Date();
  const prevHour = new Date(now.getTime() - 60 * 60 * 1000); // 1h ago
  const prevHourStr = `${prevHour.getHours().toString().padStart(2, '0')}:00:00`;
  const targetEntry = data.find(item => item.hora === prevHourStr);
  const lastHourACS = targetEntry?.separaACS || '0,00';

  const sortedData = [...data].sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    const getHourVal = (row: any) => {
      if (!row || !row.hora) return 0;
      const parts = row.hora.split(':');
      if (parts.length === 0) return 0;
      const h = parseInt(parts[0], 10);
      return isNaN(h) ? 0 : (h < 12 ? h + 24 : h);
    };
    return getHourVal(a) - getHourVal(b);
  });
  const chartData = sortedData.map(item => {
    const horaStr = item.hora?.substring(0, 5) || '00:00';
    return {
      name: horaStr,
      SeparaUND: parseValue(item.separaUND),
      CFracUND: parseValue(item.cFrac),
      SeparaACS: parseValue(item.separaACS)
    };
  });

  const getEffectiveLastUpdated = () => {
    switch (activeTab) {
      case 'painel':
        return analyticsUpdate || manualUpdate;
      case 'log_analytics':
        return lastUploadAt || logisticsUpdate || manualUpdate;
      case 'absenteismo':
        return absenteeismUpdate || manualUpdate;
      case 'daily_projection':
        return projectionUpdate || manualUpdate;
      case 'avisos':
        return announcementsUpdate || manualUpdate;
      default:
        return manualUpdate;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const publicTabs = ['log_analytics', 'painel', 'saude', 'avisos', 'productivity_ops'];

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden relative">
      <GlobalAlertBar />
      {!isMaximized && (
        <MinimalHeader isAdmin={isAdmin} onLoginClick={() => setShowLogin(true)} onLogoutClick={handleLogout} />
      )}
      <div className="flex flex-1 overflow-hidden">
        {!isMaximized && (
          <SideNavBar activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin} />
        )}
        <main className={`flex-1 overflow-y-auto ${isMaximized ? 'p-4' : 'p-8'}`}>
          <div className="max-w-[1440px] mx-auto space-y-8">
            <div className={`flex justify-between items-center ${isMaximized ? 'hidden' : ''}`}>
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-slate-900">
                  {activeTab === 'painel' && 'Desempenho Operacional'}
                  {activeTab === 'log_dashboard' && 'Log. Analytics - Tabela'}
                  {activeTab === 'saude' && 'Saúde da Operação'}
                  {activeTab === 'avisos' && 'Comunicados Operacionais'}
                  {activeTab === 'log_analytics' && (
                    <div className="flex items-center gap-4">
                       Log. Analytics - Dashboard
                       {isAdmin && (
                         <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                           <UserIcon className="w-3 h-3" />
                           Painel Administrativo
                         </div>
                       )}
                    </div>
                  )}
                  {activeTab === 'analytics' && 'Analytics'}
                  {activeTab === 'daily_projection' && 'Projeção Diária'}
                  {activeTab === 'absenteismo' && 'Gestão de Absenteísmo'}
                  {activeTab === 'relatorios' && 'Controle de Produtividade (Admin)'}
                  {activeTab === 'productivity_ops' && 'Indicadores de Produtividade'}
                  {activeTab === 'configuracoes' && 'Configurações Globais'}
                  {activeTab === 'ai_chat' && 'Assistente de IA & Inteligência Coletiva'}
                  {activeTab === 'ai_admin' && 'Base de Conhecimento (IA)'}
                </h1>
                <p className="text-sm text-slate-500">
                  {activeTab === 'painel' && 'Monitoramento em Tempo Real de Volume.'}
                  {activeTab === 'saude' && 'Monitoramento de indicators críticos e absenteísmo.'}
                  {activeTab === 'avisos' && 'Atualizações e alertas da equipe operacional.'}
                  {activeTab === 'log_analytics' && 'Visão geral das operações de transporte e retenção.'}
                  {activeTab === 'configuracoes' && 'Gerencie canais de push e de alertas sonoros desta estação de controle.'}
                  {activeTab === 'relatorios' && 'Carga de relatórios (Excel/CSV) e visualização de tabelas dinâmicas da operação.'}
                  {activeTab === 'productivity_ops' && 'Visão operacional de cumprimento de metas de produtividade, volumetria horária e rankings.'}
                  {activeTab === 'ai_chat' && 'Esclareça dúvidas sobre metas por hora, regras de layout e procedimentos com inteligência artificial.'}
                  {activeTab === 'ai_admin' && 'Gerencie, faça upload de PDFs ou digite as regras oficiais para alimentar o assistente de IA.'}
                </p>
              </div>
              
                <div className="flex items-center gap-4">
                  <StatusClocks 
                    lastUpdated={getEffectiveLastUpdated()} 
                    isAdmin={isAdmin}
                    onUpdateLastUpdated={updateLastUpdated}
                  />
                  
                  {isAdmin && (
                    <button 
                      onClick={handleLogout}
                      className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-red-500 transition-colors border-l border-slate-200 pl-4 ml-4"
                    >
                      <LogOut className="w-4 h-4" />
                      Sair
                    </button>
                  )}
                </div>
            </div>
            
            {activeTab === 'painel' && (
              <ProductionDashboardView 
                totals={totalsWithAvg}
                lastHourACS={lastHourACS}
                chartData={chartData}
                formatValue={formatValue}
                otsPadrao={projectionData.otsPadrao}
              />
            )}

            {activeTab === 'analytics' && isAdmin && (
              <PerformanceTable 
                rows={data} 
                onFileUpload={updateAnalytics} 
                onRowUpdate={updateAnalyticsRow}
              />
            )}

            {activeTab === 'log_dashboard' && isAdmin && (
              <LogisticsTable isAdmin={isAdmin} selectedRoute={selectedRoute} onRouteSelect={setSelectedRoute} />
            )}

            {activeTab === 'daily_projection' && isAdmin && (
              <DailyProjectionView />
            )}

            {activeTab === 'absenteismo' && isAdmin && (
              <AbsenteeismManagement />
            )}

            {activeTab === 'saude' && (
               <LogisticsDashboardView 
                 forcedView="health"
                 externalTVMode={isMaximized}
                 productionData={{
                   totals: totalsWithAvg,
                   lastHourACS,
                   chartData,
                   formatValue
                 }}
                 selectedRoute={selectedRoute}
               />
            )}

            {activeTab === 'configuracoes' && isAdmin && (
              <AdminSettingsView 
                tvModeInterval={tvModeInterval}
                setTvModeInterval={setTvModeInterval}
              />
            )}

            {activeTab === 'relatorios' && isAdmin && (
              <ProductivityReportView isAdmin={true} />
            )}

            {activeTab === 'productivity_ops' && (
              <ProductivityReportView isAdmin={false} />
            )}

            {activeTab === 'avisos' && (
               <AnnouncementsView isAdmin={isAdmin} />
            )}

            {activeTab === 'ai_admin' && isAdmin && (
              <AIBaseManagementView />
            )}

            {activeTab === 'log_analytics' && (
              <LogisticsDashboardView 
                forcedView="logistics"
                externalTVMode={isMaximized}
                productionData={{
                  totals: totalsWithAvg,
                  lastHourACS,
                  chartData,
                  formatValue
                }}
                selectedRoute={selectedRoute}
              />
            )}
            
            {!isAdmin && !publicTabs.includes(activeTab) && (
              <div className="flex flex-col items-center justify-center p-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <Lock className="w-16 h-16 text-slate-200 mb-4" />
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Acesso Restrito</h2>
                <p className="text-slate-500 max-w-sm mt-2">Esta funcionalidade está reservada para gestores autenticados. Por favor, faça login para continuar.</p>
                <button 
                  onClick={() => setShowLogin(true)}
                  className="mt-8 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
                >
                  Fazer Login
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Central fixed TV Mode button at the top */}
      <div className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[150] flex items-center justify-center">
        <button
          onClick={() => setIsMaximized(!isMaximized)}
          className={`group flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-[0.12em] transition-all duration-300 shadow-md hover:shadow-xl border cursor-pointer ${
            isMaximized 
              ? 'bg-rose-600 border-rose-500 hover:bg-rose-500 text-white shadow-rose-900/20' 
              : 'bg-slate-900 border-slate-950 hover:bg-slate-800 text-white shadow-slate-900/10'
          }`}
          title={isMaximized ? "Sair do Modo TV" : "Ativar Modo TV"}
        >
          <Tv className={`w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110 ${isMaximized ? 'animate-pulse' : ''}`} />
          <span>{isMaximized ? 'Sair do Modo TV' : 'Modo TV'}</span>
        </button>
      </div>

      {showLogin && (
        <LoginForm 
          onLogin={handleGenericLogin}
          onClose={() => setShowLogin(false)}
        />
      )}

      {/* Floating spiral assistant character active only for Admins */}
      {isAdmin && <FloatingAIAssistant />}
    </div>
  );
}
