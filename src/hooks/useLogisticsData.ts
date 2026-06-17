import { useState, useEffect, useMemo } from 'react';
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

export function getShiftInfo() {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 1 is Monday, ..., 5 is Friday
  const hour = now.getHours();

  // Weekday night shift: 22:00 to 07:00
  // Mon night (Mon 22 - Tue 07)
  // Tue night (Tue 22 - Wed 07)
  // Wed night (Wed 22 - Thu 07)
  // Thu night (Thu 22 - Fri 07)
  // Fri night (Fri 22 - Sat 07)

  // Is it currently the night shift?
  // Mon night: (day === 1 && hour >= 22) || (day === 2 && hour < 7)
  // Tue night: (day === 2 && hour >= 22) || (day === 3 && hour < 7)
  // We can generalize:
  // Active if day is [1, 2, 3, 4, 5] and hour >= 22
  // OR day is [2, 3, 4, 5, 6] and hour < 7

  const isShift = (day >= 1 && day <= 5 && hour >= 22) || (day >= 2 && day <= 6 && hour < 7);
  
  // Special Monday-Tuesday (Mon night = Mon 22:00 to Tue 07:00)
  const isSpecial = (day === 1 && hour >= 22) || (day === 2 && hour < 7);
  
  return { isActive: isShift, isSpecial };
}

export function isShiftActive() {
  return getShiftInfo().isActive;
}

export function adjustHorarioForShift(horarioStr: string) {
  const { isActive, isSpecial } = getShiftInfo();
  if (!isActive) return horarioStr;
  
  // Apply +1 hour if it's the special Monday-Tuesday shift
  if (!isSpecial) return horarioStr;

  const [h, m, s] = horarioStr.split(':').map(Number);
  const newH = (h + 1) % 24;
  return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function getAutomaticStatus(docsIniciais: number, docsAtuais: number, horarioStr: string) {
  if (!horarioStr) return 'Pendente';
  
  if (docsIniciais > 0 && docsAtuais === 0) {
    return "Finalizado";
  }

  const now = new Date();
  
  const [h, m, s] = horarioStr.split(':').map(Number);
  const targetTime = new Date();
  targetTime.setHours(h, m || 0, s || 0, 0);

  if (now.getHours() >= 22 && h < 10) {
    targetTime.setDate(targetTime.getDate() + 1);
  }

  const { isActive, isSpecial } = getShiftInfo();

  // Shift rule: +1 hour for special Mon-Tue shift
  if (isActive && isSpecial) {
    targetTime.setHours(targetTime.getHours() + 1);
  }

  if (now > targetTime) {
    return "Atrasado";
  }

  return "Pendente";
}

export function useLogisticsData() {
  const [dbData, setDbData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute to refresh status
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Set up Firestore listener ONCE
  useEffect(() => {
    const unsubData = onSnapshot(collection(db, 'logistics_data'), (dataSnapshot) => {
      const customData: Record<string, any> = {};
      dataSnapshot.forEach(doc => customData[doc.id] = doc.data());
      setDbData(customData);
      setLoading(false);
      setLastUpdated(new Date());
    }, (error) => {
      console.error("Erro ao obter dados de logística do Firestore:", error);
      setLoading(false);
    });

    return () => {
      unsubData();
    };
  }, []);

  // Compute rows dynamically on-the-fly whenever dbData or currentTime changes
  const rows = useMemo(() => {
    return FIXED_DATA.map(originalRow => {
      const custom = dbData[originalRow.rotas] || {};
      const docsIniciais = custom.docsIniciais ?? 0;
      const docsAtuais = custom.docsAtuais ?? 0;

      return {
        rotas: originalRow.rotas,
        docsIniciais,
        docsAtuais,
        horarios: adjustHorarioForShift(originalRow.horarios),
        status: getAutomaticStatus(docsIniciais, docsAtuais, originalRow.horarios)
      } as LogisticsRow;
    });
  }, [dbData, currentTime]);

  return { rows, loading, lastUpdated };
}
