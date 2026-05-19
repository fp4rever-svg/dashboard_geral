import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/utils';

export interface AbsenteeismRow {
  setor: string;
  faltas: number;
  total: number;
  percentage: number;
}

const DEFAULT_SECTORS = [
  'Conferencia',
  'Expedição',
  'Separação',
  'Controlados',
  'Padrão',
  'A-frame'
];

export function useAbsenteeismData() {
  const [rows, setRows] = useState<AbsenteeismRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'absenteeism'), (snapshot) => {
      const data: Record<string, any> = {};
      snapshot.forEach(doc => data[doc.id] = doc.data());

      const processedRows = DEFAULT_SECTORS.map(setor => {
        const docData = data[setor] || { faltas: 0, total: 0 };
        const faltas = docData.faltas || 0;
        const total = docData.total || 0;
        const percentage = total > 0 ? (faltas / total) * 100 : 0;

        return {
          setor,
          faltas,
          total,
          percentage
        };
      });

      setRows(processedRows);
      setLoading(false);
      setLastUpdated(new Date());
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'absenteeism');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const updateRow = async (setor: string, field: 'faltas' | 'total', value: number) => {
    try {
      const docRef = doc(db, 'absenteeism', setor);
      await setDoc(docRef, { [field]: value }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `absenteeism/${setor}`);
    }
  };

  const totals = rows.reduce((acc, row) => {
    acc.faltas += row.faltas;
    acc.total += row.total;
    return acc;
  }, { faltas: 0, total: 0 });

  const totalPercentage = totals.total > 0 ? (totals.faltas / totals.total) * 100 : 0;

  return { rows, loading, lastUpdated, updateRow, totals: { ...totals, percentage: totalPercentage } };
}
