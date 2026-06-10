import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface DashboardClockProps {
  size?: 'sm' | 'lg' | 'tv';
  variant?: 'dark' | 'light';
  className?: string;
  lastSynced?: Date | null;
}

export function DashboardClock({ size = 'sm', variant = 'dark', className = '', lastSynced = null }: DashboardClockProps) {
  const [time, setTime] = useState(new Date());
  const [isVisualSyncActive, setIsVisualSyncActive] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (lastSynced) {
      setIsVisualSyncActive(true);
      const timer = setTimeout(() => {
        setIsVisualSyncActive(false);
      }, 2500); // 2.5 seconds pulse visual feedback
      return () => clearTimeout(timer);
    }
  }, [lastSynced]);

  const timeStr = time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = time.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

  if (size === 'tv') {
    return (
      <div className={`inline-flex items-center gap-3 bg-slate-950 border-2 text-white px-5 py-2.5 rounded-2xl transition-all duration-500 hover:border-emerald-400 relative ${
        isVisualSyncActive
          ? 'border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.5)] scale-105 ring-2 ring-emerald-500/20'
          : 'border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.25)]'
      } ${className}`}>
        {/* Subtle radial light ring that expands on sync */}
        {isVisualSyncActive && (
          <div className="absolute inset-0 rounded-2xl border border-emerald-400 animate-ping opacity-25 pointer-events-none" />
        )}
        
        <div className={`flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-300 ${
          isVisualSyncActive
            ? 'bg-emerald-400 text-slate-950 scale-110 shadow-[0_0_12px_rgba(16,185,129,0.6)]'
            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-inner'
        }`}>
          <Clock className={`w-4 h-4 ${isVisualSyncActive ? 'animate-none' : 'animate-pulse'}`} />
        </div>
        <div className="flex flex-col items-start leading-none gap-1">
          <span className="font-mono text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 via-white to-emerald-300 drop-shadow-[0_2px_8px_rgba(16,185,129,0.2)]">
            {timeStr}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">
              {dateStr}
            </span>
            {isVisualSyncActive ? (
              <span className="text-[9px] font-extrabold text-emerald-300 uppercase tracking-widest flex items-center gap-0.5 px-1 bg-emerald-500/20 rounded border border-emerald-400/30 animate-bounce leading-none py-[1px]">
                • SYNCED
              </span>
            ) : (
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1 leading-none py-[1px]">
                • <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse inline-block"></span> REALTIME
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <div className={`flex items-center gap-4.5 bg-slate-900 border border-slate-800 text-white p-4 px-6 rounded-[2rem] shadow-2xl relative overflow-hidden ${className}`}>
        {/* Ambient background glow inside the clock */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-12 translate-x-12"></div>
        
        <div className="relative z-10 p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400 shrink-0 shadow-lg flex items-center justify-center animate-pulse">
          <Clock className="w-5 h-5" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-baseline gap-1 md:gap-3">
          <span className="font-mono text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300 drop-shadow-sm">
            {timeStr}
          </span>
          <span className="text-[11px] font-extrabold text-blue-400/80 uppercase tracking-widest leading-none">
            • {dateStr}
          </span>
        </div>
      </div>
    );
  }

  const baseStyles = "font-mono text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-2 shadow";
  const variantStyles = variant === 'light'
    ? "text-slate-800 bg-white border border-slate-200/80"
    : "text-slate-200 bg-slate-900/40 border border-white/5";

  return (
    <div className={`${baseStyles} ${variantStyles} ${className}`}>
      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
      {timeStr}
    </div>
  );
}
