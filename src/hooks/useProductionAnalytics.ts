import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, writeBatch, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/utils';

export interface ProductionAnalyticsRow {
  id?: string;
  hora: string;
  cubagem: string;
  separaACS: string;
  separaUND: string;
  cFrac: string;
  order?: number;
}

export function useProductionAnalytics() {
  const [data, setData] = useState<ProductionAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'production_analytics'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const rows = snapshot.docs.map(doc => ({ 
        id: doc.id,
        ...doc.data() 
      } as ProductionAnalyticsRow));
      setData(rows);
      setLoading(false);
      setLastUpdated(new Date());
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'production_analytics');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const updateAllData = async (newData: ProductionAnalyticsRow[]) => {
    try {
      const batch = writeBatch(db);
      
      // 1. Delete existing docs
      const snapshot = await getDocs(collection(db, 'production_analytics'));
      snapshot.forEach(d => {
        batch.delete(d.ref);
      });

      // 2. Add new docs
      newData.forEach((row, index) => {
        const docRef = doc(collection(db, 'production_analytics'));
        const { id, ...rowWithoutId } = row;
        batch.set(docRef, { ...rowWithoutId, order: index });
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'production_analytics');
    }
  };

  const updateRow = async (id: string, updates: Partial<ProductionAnalyticsRow>) => {
    try {
      const docRef = doc(db, 'production_analytics', id);
      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `production_analytics/${id}`);
    }
  };

  return { data, loading, lastUpdated, updateAllData, updateRow };
}
