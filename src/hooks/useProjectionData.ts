import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface ProjectionData {
  horaAtual: string;
  vendaTotal: number;
  conferenciaLinha: number;
  otsPadrao: number;
  resumo1: number;
  resumo2: number;
  cancelamentoComercial: { meta: string; valor: number; cenarioAtual: string; limite: number };
  cancelamentoOperacional: { meta: string; valor: number; cenarioAtual: string; limite: number };
  upmEticos: { meta: number; valor: number; cenarioAtual: number; limite: number };
  volumeDiario: { meta: number; valor: number; cenarioAtual: string; limite: number };
  previsaoHora: string;
}

const DEFAULT_DATA: ProjectionData = {
  horaAtual: '05:00:42',
  vendaTotal: 156840,
  conferenciaLinha: 118063,
  otsPadrao: 12929,
  resumo1: 118063,
  resumo2: 38777,
  cancelamentoComercial: { meta: '2,08%', valor: 3130, cenarioAtual: '2,00%', limite: 3262 },
  cancelamentoOperacional: { meta: '0,06%', valor: 40, cenarioAtual: '0,03%', limite: 94 },
  upmEticos: { meta: 1530, valor: 54, cenarioAtual: 457, limite: 181 },
  volumeDiario: { meta: 2000, valor: 0, cenarioAtual: '#DIV/0!', limite: 1847 },
  previsaoHora: '#DIV/0!',
};

export function useProjectionData() {
  const [data, setData] = useState<ProjectionData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const docRef = doc(db, 'config', 'daily_projection');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setData(docSnap.data() as ProjectionData);
      }
      setLoading(false);
      setLastUpdated(new Date());
    });

    return () => unsubscribe();
  }, []);

  return { data, loading, lastUpdated };
}
