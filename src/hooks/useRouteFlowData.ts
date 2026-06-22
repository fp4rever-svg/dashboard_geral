import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc, writeBatch, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { 
  ZWM0255P_RAW, 
  SALES_RAW, 
  CUTS_RAW, 
  ALL_ROUTES, 
  RouteCombinedData, 
  ZWM0255PData, 
  RouteSalesCutsData
} from '../data/routeFlowData';

export function useRouteFlowData() {
  const [dbRoutes, setDbRoutes] = useState<Record<string, RouteCombinedData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pathRef = 'route_stats';
    const unsubscribe = onSnapshot(
      collection(db, pathRef),
      (snapshot) => {
        const data: Record<string, RouteCombinedData> = {};
        snapshot.forEach((docSnapshot) => {
          const docData = docSnapshot.data();
          const routeId = docSnapshot.id;
          
          let zwm: ZWM0255PData | undefined = undefined;
          if (
            docData.caixasSeparacao !== undefined ||
            docData.cxSepEmUso !== undefined ||
            docData.recFaltas !== undefined ||
            docData.separacao !== undefined ||
            docData.conferencia !== undefined ||
            docData.postoEmbalagem !== undefined ||
            docData.expedicao !== undefined
          ) {
            zwm = {
              caixasSeparacao: Number(docData.caixasSeparacao || 0),
              cxSepEmUso: Number(docData.cxSepEmUso || 0),
              recFaltas: Number(docData.recFaltas || 0),
              separacao: Number(docData.separacao || 0),
              conferencia: Number(docData.conferencia || 0),
              postoEmbalagem: Number(docData.postoEmbalagem || 0),
              expedicao: Number(docData.expedicao || 0),
            };
          }

          let salesCuts: RouteSalesCutsData | undefined = undefined;
          if (docData.vendas !== undefined || docData.cortes !== undefined) {
             const vendas = Number(docData.vendas || 0);
             const cortes = Number(docData.cortes || 0);
             const percentCorte = vendas > 0 ? (cortes / vendas) * 100 : 0;
             salesCuts = {
               vendas,
               cortes,
               percentCorte
             };
          }

          data[routeId] = {
            rota: routeId,
            zwm,
            salesCuts
          };
        });
        setDbRoutes(data);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, pathRef);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Compute merged routes list and details
  const routesData = useMemo<Record<string, RouteCombinedData>>(() => {
    const hasDbData = Object.keys(dbRoutes).length > 0;
    
    // If no db records exist, fall back completely to static mock data
    if (!hasDbData) {
      const fallback: Record<string, RouteCombinedData> = {};
      ALL_ROUTES.forEach((route) => {
        const zwmRaw = ZWM0255P_RAW[route];
        const vendas = SALES_RAW[route] || 0;
        const cortes = CUTS_RAW[route] || 0;
        const percentCorte = vendas > 0 ? (cortes / vendas) * 100 : 0;

        fallback[route] = {
          rota: route,
          zwm: zwmRaw ? {
            caixasSeparacao: zwmRaw.caixasSeparacao,
            cxSepEmUso: zwmRaw.cxSepEmUso,
            recFaltas: zwmRaw.recFaltas,
            separacao: zwmRaw.separacao,
            conferencia: zwmRaw.conferencia,
            postoEmbalagem: zwmRaw.postoEmbalagem,
            expedicao: zwmRaw.expedicao || 0,
          } : undefined,
          salesCuts: {
            vendas,
            cortes,
            percentCorte
          }
        };
      });
      return fallback;
    }

    return dbRoutes;
  }, [dbRoutes]);

  const allRoutes = useMemo(() => {
    return Object.keys(routesData).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
      return numA - numB;
    });
  }, [routesData]);

  // Dynamic aggregates based on current data
  const zwmTotals = useMemo<ZWM0255PData>(() => {
    const total: ZWM0255PData = {
      caixasSeparacao: 0,
      cxSepEmUso: 0,
      recFaltas: 0,
      separacao: 0,
      conferencia: 0,
      postoEmbalagem: 0,
      expedicao: 0,
    };
    
    (Object.values(routesData) as RouteCombinedData[]).forEach((r) => {
      if (r.zwm) {
        total.caixasSeparacao += r.zwm.caixasSeparacao;
        total.cxSepEmUso += r.zwm.cxSepEmUso;
        total.recFaltas += r.zwm.recFaltas;
        total.separacao += r.zwm.separacao;
        total.conferencia += r.zwm.conferencia;
        total.postoEmbalagem += r.zwm.postoEmbalagem;
        total.expedicao += r.zwm.expedicao;
      }
    });

    return total;
  }, [routesData]);

  const salesTotal = useMemo(() => {
    return (Object.values(routesData) as RouteCombinedData[]).reduce((sum, r) => sum + (r.salesCuts?.vendas || 0), 0);
  }, [routesData]);

  const cutsTotal = useMemo(() => {
    return (Object.values(routesData) as RouteCombinedData[]).reduce((sum, r) => sum + (r.salesCuts?.cortes || 0), 0);
  }, [routesData]);

  const percentCutsGlobal = useMemo(() => {
    return salesTotal > 0 ? (cutsTotal / salesTotal) * 100 : 0;
  }, [salesTotal, cutsTotal]);

  const getRouteData = (rota: string | undefined): RouteCombinedData | null => {
    if (!rota) return null;
    return routesData[rota] || null;
  };

  /**
   * Imports parsed routes data into Firebase.
   * Compiles list of records and writes them using writeBatch to avoid too many small writes.
   */
  const importRouteStats = async (
    type: 'zwm' | 'sales' | 'cuts' | 'full',
    records: any[],
    clearExisting = false
  ) => {
    try {
      const pathRef = 'route_stats';
      
      // If requested to clear, delete present items from database first
      if (clearExisting) {
        const querySnapshot = await getDocs(collection(db, pathRef));
        const batch = writeBatch(db);
        querySnapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      }

      const batch = writeBatch(db);
      
      // We can upload in batches of 500
      let count = 0;
      
      for (const record of records) {
        const rotaStr = String(record.rota || record.Rota || '').trim();
        if (!rotaStr) continue;

        const docRef = doc(db, pathRef, rotaStr);
        let updatePayload: any = { updatedAt: new Date().toISOString() };

        if (type === 'zwm') {
          updatePayload.caixasSeparacao = Number(record.caixasSeparacao ?? record.CaixasSeparacao ?? 0);
          updatePayload.cxSepEmUso = Number(record.cxSepEmUso ?? record.CxSepEmUso ?? 0);
          updatePayload.recFaltas = Number(record.recFaltas ?? record.RecFaltas ?? 0);
          updatePayload.separacao = Number(record.separacao ?? record.Separacao ?? 0);
          updatePayload.conferencia = Number(record.conferencia ?? record.Conferencia ?? 0);
          updatePayload.postoEmbalagem = Number(record.postoEmbalagem ?? record.PostoEmbalagem ?? 0);
          updatePayload.expedicao = Number(record.expedicao ?? record.Expedicao ?? 0);
        } else if (type === 'sales') {
          updatePayload.vendas = Number(record.vendas ?? record.Vendas ?? 0);
        } else if (type === 'cuts') {
          updatePayload.cortes = Number(record.cortes ?? record.Cortes ?? 0);
        } else {
          // Full payload override merging everything
          if (record.caixasSeparacao !== undefined) updatePayload.caixasSeparacao = Number(record.caixasSeparacao);
          if (record.cxSepEmUso !== undefined) updatePayload.cxSepEmUso = Number(record.cxSepEmUso);
          if (record.recFaltas !== undefined) updatePayload.recFaltas = Number(record.recFaltas);
          if (record.separacao !== undefined) updatePayload.separacao = Number(record.separacao);
          if (record.conferencia !== undefined) updatePayload.conferencia = Number(record.conferencia);
          if (record.postoEmbalagem !== undefined) updatePayload.postoEmbalagem = Number(record.postoEmbalagem);
          if (record.expedicao !== undefined) updatePayload.expedicao = Number(record.expedicao);
          if (record.vendas !== undefined) updatePayload.vendas = Number(record.vendas);
          if (record.cortes !== undefined) updatePayload.cortes = Number(record.cortes);
        }

        // Use merge setDoc to combine fields if not clearing
        batch.set(docRef, updatePayload, { merge: !clearExisting });
        count++;

        if (count >= 400) {
          await batch.commit();
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'route_stats');
    }
  };

  /**
   * Resets route_stats to the original mock/static database data
   */
  const resetToMockData = async () => {
    try {
      // 1. Delete all database documents in route_stats
      const pathRef = 'route_stats';
      const querySnapshot = await getDocs(collection(db, pathRef));
      const deleteBatch = writeBatch(db);
      querySnapshot.forEach((docSnap) => {
        deleteBatch.delete(docSnap.ref);
      });
      await deleteBatch.commit();

      // 2. Generate and write the mock representation to Firestore
      const insertBatch = writeBatch(db);
      let count = 0;

      for (const route of ALL_ROUTES) {
        const docRef = doc(db, pathRef, route);
        const zwmRaw = ZWM0255P_RAW[route];
        const vendas = SALES_RAW[route] || 0;
        const cortes = CUTS_RAW[route] || 0;

        const payload: any = {
          updatedAt: new Date().toISOString()
        };

        if (zwmRaw) {
          payload.caixasSeparacao = zwmRaw.caixasSeparacao;
          payload.cxSepEmUso = zwmRaw.cxSepEmUso;
          payload.recFaltas = zwmRaw.recFaltas;
          payload.separacao = zwmRaw.separacao;
          payload.conferencia = zwmRaw.conferencia;
          payload.postoEmbalagem = zwmRaw.postoEmbalagem;
          payload.expedicao = zwmRaw.expedicao || 0;
        }

        if (vendas !== undefined) payload.vendas = vendas;
        if (cortes !== undefined) payload.cortes = cortes;

        insertBatch.set(docRef, payload);
        count++;
      }

      if (count > 0) {
        await insertBatch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'route_stats');
    }
  };

  return {
    loading,
    routesData,
    allRoutes,
    zwmTotals,
    salesTotal,
    cutsTotal,
    percentCutsGlobal,
    getRouteData,
    importRouteStats,
    resetToMockData
  };
}
