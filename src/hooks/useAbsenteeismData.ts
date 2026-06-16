import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { 
  getSheetsConfig, 
  fetchAndParsePublicCsvData, 
  updateLastSyncedTimestamp 
} from '../lib/googleSheets';

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
    // 1. Set up real-time listener for current database state
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

    // 2. Background automatic Google Sheets sync
    let active = true;
    async function triggerSilentSync() {
      try {
        // Prevent concurrent triggers in the same screen load Session
        if ((window as any).__sheets_sync_inprogress) {
          return;
        }
        (window as any).__sheets_sync_inprogress = true;

        const config = await getSheetsConfig();
        if (!config.spreadsheetId) {
          (window as any).__sheets_sync_inprogress = false;
          return;
        }

        // Only auto-sync if has not synced in the last 2 minutes (cooldown throttle)
        const lastSyncedMs = config.lastSyncedAt ? new Date(config.lastSyncedAt).getTime() : 0;
        const nowMs = Date.now();
        if (nowMs - lastSyncedMs < 120000) { 
          (window as any).__sheets_sync_inprogress = false;
          return;
        }

        console.log('Iniciando sincronização automática de presença do Google Sheets...');
        const result = await fetchAndParsePublicCsvData(config.spreadsheetId, config.sheetName);
        
        if (active && result.success && result.data) {
          // Commit parsed values to Firestore
          for (const sData of result.data) {
            const sDocRef = doc(db, 'absenteeism', sData.sector);
            await setDoc(sDocRef, { 
              faltas: sData.faltas,
              total: sData.total,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
          await updateLastSyncedTimestamp();
          console.log(`Sincronização automática concluída: ${result.message}`);
        }
      } catch (err) {
        console.warn('Erro na sincronização automática em segundo plano:', err);
      } finally {
        (window as any).__sheets_sync_inprogress = false;
      }
    }

    triggerSilentSync();

    return () => {
      active = false;
      unsub();
    };
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
