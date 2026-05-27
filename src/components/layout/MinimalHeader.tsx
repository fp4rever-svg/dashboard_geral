import { Calendar, Clock, Lock, User as UserIcon, LogOut } from 'lucide-react';
import { isShiftActive } from '../../hooks/useLogisticsData';

interface MinimalHeaderProps {
  isAdmin: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

export function MinimalHeader({ isAdmin, onLoginClick, onLogoutClick }: MinimalHeaderProps) {
  const shiftActive = isShiftActive();
  const today = new Date().toLocaleDateString('pt-BR');

  return (
    <header className="flex justify-end items-center gap-6 w-full px-8 py-3 bg-white border-b border-slate-100">
      <div className="flex items-center gap-6">
        <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${shiftActive ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
          <Clock className="w-3 h-3" />
          {shiftActive ? 'Turno Ativo' : 'Turno Inativo'}
        </div>
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
           <Calendar className="w-3 h-3" />
           {today}
        </div>
      </div>
      
      <div className="h-4 w-px bg-slate-200"></div>

      <div className="flex items-center gap-2">
      {!isAdmin ? (
          <button 
            onClick={onLoginClick}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
          >
            <Lock className="w-3 h-3" />
            Admin
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg">
                <UserIcon className="w-3 h-3" />
                Control Mode
            </div>
            <button 
                onClick={onLogoutClick}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors"
            >
                <LogOut className="w-3 h-3" />
                Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
