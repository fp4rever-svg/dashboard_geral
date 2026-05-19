import React, { useState, useEffect } from 'react';
import { Clock, RefreshCcw } from 'lucide-react';

interface StatusClocksProps {
  lastUpdated: Date | null;
  isAdmin?: boolean;
  onUpdateLastUpdated?: (date: Date) => Promise<void>;
}

export function StatusClocks({ lastUpdated, isAdmin, onUpdateLastUpdated }: StatusClocksProps) {
  const [now, setNow] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (lastUpdated) {
      const hours = lastUpdated.getHours().toString().padStart(2, '0');
      const minutes = lastUpdated.getMinutes().toString().padStart(2, '0');
      const seconds = lastUpdated.getSeconds().toString().padStart(2, '0');
      setEditValue(`${hours}:${minutes}:${seconds}`);
    }
  }, [lastUpdated]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleUpdate = async () => {
    if (!onUpdateLastUpdated) return;

    const [hours, minutes, seconds] = editValue.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return;

    const newDate = new Date();
    newDate.setHours(hours, minutes, seconds, 0);
    
    await onUpdateLastUpdated(newDate);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-blue-100 group">
        <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
          <Clock className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Hora Atual</p>
          <p className="text-sm font-bold text-slate-700 tabular-nums">{formatTime(now)}</p>
        </div>
      </div>

      <div 
        onClick={() => isAdmin && setIsEditing(true)}
        className={`flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition-all group ${isAdmin ? 'cursor-pointer hover:border-emerald-500' : 'hover:border-emerald-100'}`}
      >
        <div className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-emerald-500' : 'bg-emerald-50 group-hover:bg-emerald-100'}`}>
          <RefreshCcw className={`w-4 h-4 ${isEditing ? 'text-white' : 'text-emerald-600'}`} />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Última Atualização</p>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input 
                type="text"
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdate();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                className="text-sm font-bold text-slate-700 tabular-nums w-20 bg-slate-50 border border-slate-200 rounded px-1 outline-none focus:border-emerald-500"
              />
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpdate();
                }}
                className="text-[10px] font-bold text-emerald-600 uppercase"
              >
                OK
              </button>
            </div>
          ) : (
            <p className="text-sm font-bold text-slate-700 tabular-nums">
              {lastUpdated ? formatTime(lastUpdated) : '--:--:--'}
              {isAdmin && <span className="ml-2 opacity-0 group-hover:opacity-100 text-[8px] font-black text-emerald-500">EDITAR</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
