import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/utils';

export function useAppMetadata() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'config', 'metadata');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.lastUpdated) {
          setLastUpdated(data.lastUpdated.toDate());
        }
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'config/metadata');
    });

    return () => unsubscribe();
  }, []);

  const updateLastUpdated = async (date: Date) => {
    const docRef = doc(db, 'config', 'metadata');
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          lastUpdated: Timestamp.fromDate(date)
        });
      } else {
        await setDoc(docRef, {
          lastUpdated: Timestamp.fromDate(date)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'config/metadata');
    }
  };

  return { lastUpdated, updateLastUpdated, loading };
}
