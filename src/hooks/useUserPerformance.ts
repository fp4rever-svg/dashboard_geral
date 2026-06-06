import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, writeBatch, doc, getDocs, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/utils';

export interface UserPerformanceRow {
  id?: string;
  user: string;
  recordsUPM: number;
  conferredQty: number;
  prodPct: string;
  upmPct: string;
  order?: number;
}

export function useUserPerformance() {
  const [data, setData] = useState<UserPerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    // Fetch user performance collection and sort by order in-memory to be reliable and index-free
    const colRef = collection(db, 'user_performance');
    const unsub = onSnapshot(colRef, (snapshot) => {
      const rows = snapshot.docs.map(doc => ({ 
        id: doc.id,
        ...doc.data() 
      } as UserPerformanceRow));
      // Sort in-memory by order
      rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setData(rows);
      setLoading(false);
      setLastUpdated(new Date());
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'user_performance');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const updateAllData = async (newData: UserPerformanceRow[]) => {
    try {
      const batch = writeBatch(db);
      
      // 1. Delete existing docs
      const snapshot = await getDocs(collection(db, 'user_performance'));
      snapshot.forEach(d => {
        batch.delete(d.ref);
      });

      // 2. Add new docs
      newData.forEach((row, index) => {
        const docRef = doc(collection(db, 'user_performance'));
        const { id, ...rowWithoutId } = row;
        batch.set(docRef, { ...rowWithoutId, order: index });
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'user_performance');
    }
  };

  const addRow = async (row: Omit<UserPerformanceRow, 'id'>) => {
    try {
      const nextOrder = data.length;
      await addDoc(collection(db, 'user_performance'), {
        ...row,
        order: nextOrder
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'user_performance');
    }
  };

  const updateRow = async (id: string, updates: Partial<UserPerformanceRow>) => {
    try {
      const docRef = doc(db, 'user_performance', id);
      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `user_performance/${id}`);
    }
  };

  const deleteRow = async (id: string) => {
    try {
      const docRef = doc(db, 'user_performance', id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `user_performance/${id}`);
    }
  };

  const clearAllData = async () => {
    try {
      const batch = writeBatch(db);
      const snapshot = await getDocs(collection(db, 'user_performance'));
      snapshot.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'user_performance');
    }
  };

  return { data, loading, lastUpdated, updateAllData, addRow, updateRow, deleteRow, clearAllData };
}
