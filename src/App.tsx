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
import { Package, Clock, Box, LayoutGrid, Lock, LogOut, User as UserIcon, LineChart, Users, Maximize, Minimize2 } from 'lucide-react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/utils';

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

  const ADMIN_EMAIL = 'fp4rever@gmail.com';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  const parseValue = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = val.toString().trim();
    if (str === '—' || str === '') return 0;
    
    // Check if comma is used as decimal separator
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    
    if (lastComma > lastDot) {
        // Treat comma as decimal, remove dots
        return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
        // Treat dot as decimal, remove commas
        return parseFloat(str.replace(/,/g, '')) || 0;
    }
  };

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

  const sortedData = [...data].sort((a, b) => a.hora.localeCompare(b.hora));
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

  const publicTabs = ['log_analytics', 'painel', 'saude', 'avisos'];

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
                  {activeTab === 'relatorios' && 'Relatórios'}
                </h1>
                <p className="text-sm text-slate-500">
                  {activeTab === 'painel' && 'Monitoramento em Tempo Real de Volume.'}
                  {activeTab === 'saude' && 'Monitoramento de indicadores críticos e absenteísmo.'}
                  {activeTab === 'avisos' && 'Atualizações e alertas da equipe operacional.'}
                  {activeTab === 'log_analytics' && 'Visão geral das operações de transporte e retenção.'}
                </p>
              </div>
              
                <div className="flex items-center gap-4">
                  <StatusClocks 
                    lastUpdated={getEffectiveLastUpdated()} 
                    isAdmin={isAdmin}
                    onUpdateLastUpdated={updateLastUpdated}
                  />
                  
                  <button 
                    onClick={() => setIsMaximized(true)}
                    className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
                    title="Maximizar visualização"
                  >
                    <Maximize className="w-5 h-5" />
                  </button>
                  
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

            {activeTab === 'avisos' && (
               <AnnouncementsView isAdmin={isAdmin} />
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

      {isMaximized && (
        <button 
          onClick={() => setIsMaximized(false)}
          className="fixed bottom-8 right-8 z-50 p-4 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95 group"
          title="Sair do modo tela cheia"
        >
          <Minimize2 className="w-6 h-6" />
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Sair do modo tela cheia
          </span>
        </button>
      )}

      {showLogin && (
        <LoginForm 
          onLogin={handleGenericLogin}
          onClose={() => setShowLogin(false)}
        />
      )}
    </div>
  );
}
