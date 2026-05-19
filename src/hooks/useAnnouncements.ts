import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/utils';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: any;
  active: boolean;
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
      setAnnouncements(data);
      setLoading(false);
      setLastUpdated(new Date());
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'announcements');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const addAnnouncement = async (title: string, content: string, type: Announcement['type']) => {
    try {
      await addDoc(collection(db, 'announcements'), {
        title,
        content,
        type,
        timestamp: serverTimestamp(),
        active: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'announcements');
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'announcements');
    }
  };

  const toggleAnnouncement = async (id: string, active: boolean) => {
    try {
      await updateDoc(doc(db, 'announcements', id), { active });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'announcements');
    }
  };

  return { announcements, loading, lastUpdated, addAnnouncement, deleteAnnouncement, toggleAnnouncement };
}
