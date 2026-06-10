import { useState, useEffect } from 'react';

export function DashboardClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="font-mono text-xs font-black text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
      {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </div>
  );
}
