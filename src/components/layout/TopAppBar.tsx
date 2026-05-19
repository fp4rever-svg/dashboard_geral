import { Package2, Bell, Settings, Calendar, Lock, User as UserIcon } from 'lucide-react';

interface TopAppBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin: boolean;
  onLoginClick: () => void;
}

export function TopAppBar({ activeTab, onTabChange, isAdmin, onLoginClick }: TopAppBarProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm flex justify-between items-center w-full px-8 py-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-xl">
                <Package2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tighter">GSC</span>
        </div>
        
        <nav className="hidden lg:flex items-center ml-12 gap-6 text-sm">
          <button 
            onClick={() => onTabChange('log_analytics')} 
            className={`px-3 py-1.5 rounded-lg transition-all font-bold ${activeTab === 'log_analytics' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
          >
            Log. Dashboard
          </button>
          <button 
            onClick={() => onTabChange('painel')} 
            className={`px-3 py-1.5 rounded-lg transition-all font-bold ${activeTab === 'painel' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
          >
            Produção
          </button>
          
          {isAdmin && (
            <div className="h-4 w-px bg-slate-200 mx-2"></div>
          )}

          {isAdmin && (
            <>
              <button 
                onClick={() => onTabChange('log_dashboard')} 
                className={`px-3 py-1.5 rounded-lg transition-all font-bold ${activeTab === 'log_dashboard' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                Tabela
              </button>
              <button 
                onClick={() => onTabChange('daily_projection')} 
                className={`px-3 py-1.5 rounded-lg transition-all font-bold ${activeTab === 'daily_projection' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                Projeção
              </button>
              <button 
                onClick={() => onTabChange('analytics')} 
                className={`px-3 py-1.5 rounded-lg transition-all font-bold ${activeTab === 'analytics' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                Analytics
              </button>
            </>
          )}
        </nav>
      </div>
      
      <div className="flex items-center gap-4">
        {!isAdmin ? (
          <button 
            onClick={onLoginClick}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
          >
            <Lock className="w-3 h-3" />
            Admin
          </button>
        ) : (
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg">
            <UserIcon className="w-3 h-3" />
            Control Mode
          </div>
        )}

        <div className="hidden md:flex items-center bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
          <Calendar className="w-4 h-4 text-slate-700 mr-2" />
          <span className="text-sm text-slate-600 font-bold">16/05/2026</span>
        </div>
        <button className="p-2 hover:bg-slate-100 rounded-full"><Bell className="w-5 h-5 text-slate-600" /></button>
        <button className="p-2 hover:bg-slate-100 rounded-full"><Settings className="w-5 h-5 text-slate-600" /></button>
      </div>
    </header>
  );
}
