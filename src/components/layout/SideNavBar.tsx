import { Factory, Truck, BarChart3, FileText, TableProperties, LineChart, Users, HeartPulse, LayoutDashboard, Megaphone } from 'lucide-react';

interface SideNavBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin: boolean;
}

export function SideNavBar({ activeTab, onTabChange, isAdmin }: SideNavBarProps) {
  return (
    <aside className="hidden md:flex flex-col h-full w-64 bg-slate-50 border-r border-slate-200 p-6 gap-8 shrink-0 overflow-y-auto">
      <div className="px-2">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Operações</h2>
        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => onTabChange('avisos')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${activeTab === 'avisos' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <Megaphone className="w-5 h-5" />
            <span className="text-sm font-bold">Avisos</span>
          </button>
          <button 
            onClick={() => onTabChange('log_analytics')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${activeTab === 'log_analytics' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <Truck className="w-5 h-5" />
            <span className="text-sm font-bold">Log. Dashboard</span>
          </button>
          <button 
            onClick={() => onTabChange('painel')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${activeTab === 'painel' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <Factory className="w-5 h-5" />
            <span className="text-sm font-bold">Produção</span>
          </button>
          <button 
            onClick={() => onTabChange('saude')}
            className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${activeTab === 'saude' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <HeartPulse className="w-5 h-5" />
            <span className="text-sm font-bold">Saúde</span>
          </button>
        </nav>
      </div>

      {isAdmin && (
        <div className="px-2">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Gestão</h2>
          <nav className="flex flex-col gap-2">
            <button 
              onClick={() => onTabChange('log_dashboard')}
              className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${activeTab === 'log_dashboard' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <TableProperties className="w-5 h-5" />
              <span className="text-sm font-bold">Log. Tabela</span>
            </button>
            <button 
              onClick={() => onTabChange('daily_projection')}
              className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${activeTab === 'daily_projection' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <LineChart className="w-5 h-5" />
              <span className="text-sm font-bold">Projeção Diária</span>
            </button>
            <button 
              onClick={() => onTabChange('absenteismo')}
              className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${activeTab === 'absenteismo' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <Users className="w-5 h-5" />
              <span className="text-sm font-bold">Absenteísmo</span>
            </button>
            <button 
              onClick={() => onTabChange('analytics')}
              className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${activeTab === 'analytics' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-sm font-bold">Analytics</span>
            </button>
          </nav>
        </div>
      )}

      <div className="mt-auto px-4 py-6 border-t border-slate-200 flex flex-col items-center">
        <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest italic text-center leading-relaxed">
          Logistics Control <br /> System
        </p>
      </div>
    </aside>
  );
}
