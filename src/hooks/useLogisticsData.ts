import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface LogisticsRow {
  rotas: string;
  docsIniciais: number;
  docsAtuais: number;
  horarios: string;
  status: string;
}

const FIXED_DATA = [
  { rotas: '731', horarios: '01:00:00' },
  { rotas: '732', horarios: '01:00:00' },
  { rotas: '733', horarios: '01:00:00' },
  { rotas: '734', horarios: '01:00:00' },
  { rotas: '764', horarios: '01:30:00' },
  { rotas: '722', horarios: '02:40:00' },
  { rotas: '761', horarios: '02:10:00' },
  { rotas: '741', horarios: '03:00:00' },
  { rotas: '742', horarios: '03:00:00' },
  { rotas: '720', horarios: '04:20:00' },
  { rotas: '721', horarios: '04:20:00' },
  { rotas: '783', horarios: '04:40:00' },
  { rotas: '754', horarios: '05:10:00' },
  { rotas: '700', horarios: '08:00:00' },
  { rotas: '723', horarios: '08:00:00' },
  { rotas: '725', horarios: '08:00:00' },
  { rotas: '750', horarios: '08:00:00' },
  { rotas: '756', horarios: '08:00:00' },
  { rotas: '727', horarios: '08:00:00' },
];

export function isShiftActive() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  // Shift is active if:
  // Monday >= 22:00 OR Tuesday < 07:00
  return (day === 1 && hour >= 22) || (day === 2 && hour < 7);
}

export function adjustHorarioForShift(horarioStr: string) {
  if (!isShiftActive()) return horarioStr;
  
  const [h, m, s] = horarioStr.split(':').map(Number);
  const newH = (h + 1) % 24;
  return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function getAutomaticStatus(docsIniciais: number, docsAtuais: number, horarioStr: string) {
  if (!horarioStr) return 'Pendente';
  
  // 100% completion rule
  if (docsIniciais > 0 && docsAtuais === 0) {
    return "Finalizado";
  }

  const now = new Date();
  
  const [h, m, s] = horarioStr.split(':').map(Number);
  const targetTime = new Date();
  targetTime.setHours(h, m || 0, s || 0, 0);

  // Fix: If it's the shift start (after 22:00) and the route is in the early morning (before 10 AM), 
  // it belongs to the next day, not the current day.
  if (now.getHours() >= 22 && h < 10) {
    targetTime.setDate(targetTime.getDate() + 1);
  }

  // Shift rule: +1 hour
  if (isShiftActive()) {
    targetTime.setHours(targetTime.getHours() + 1);
  }

  if (now > targetTime) {
    return "Atrasado";
  }

  return "Pendente";
}

export function useLogisticsData() {
  const [rows, setRows] = useState<LogisticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute to refresh status
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Initial state
    const initialRows = FIXED_DATA.map(r => ({
      ...r,
      docsIniciais: 0,
      docsAtuais: 0,
      status: 'Pendente'
    }));
    setRows(initialRows);

    const unsubData = onSnapshot(collection(db, 'logistics_data'), (dataSnapshot) => {
      const customData: Record<string, any> = {};
      dataSnapshot.forEach(doc => customData[doc.id] = doc.data());

      setRows(prevRows => prevRows.map(row => {
        const custom = customData[row.rotas] || {};
        const docsIniciais = custom.docsIniciais ?? row.docsIniciais;
        const docsAtuais = custom.docsAtuais ?? row.docsAtuais;
        const originalRow = FIXED_DATA.find(fr => fr.rotas === row.rotas);
        const originalHorarios = originalRow ? originalRow.horarios : row.horarios;
        
        return {
          ...row,
          docsIniciais,
          docsAtuais,
          horarios: adjustHorarioForShift(originalHorarios),
          status: getAutomaticStatus(docsIniciais, docsAtuais, originalHorarios)
        } as LogisticsRow;
      }));
      setLoading(false);
      setLastUpdated(new Date());
    });

    return () => {
      unsubData();
    };
  }, [currentTime]); // Re-compute when time changes

  return { rows, loading, lastUpdated };
}
