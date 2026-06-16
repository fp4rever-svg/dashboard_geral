import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AlertTriangle, Bell, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseValue } from '../../lib/utils';

interface ProjectionData {
  cancelamentoComercial: { meta: string; valor: number; cenarioAtual: string; limite: number };
  cancelamentoOperacional: { meta: string; valor: number; cenarioAtual: string; limite: number };
  upmEticos: { meta: number; valor: number; cenarioAtual: number; limite: number };
  resumo1: number;
  resumo2: number;
  otsPadrao: number;
}

export function GlobalAlertBar() {
  const [data, setData] = useState<ProjectionData | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'config', 'daily_projection');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setData(docSnap.data() as ProjectionData);
      }
    });
    return () => unsubscribe();
  }, []);

  if (!data) return null;

  const displayVendaTotal = data.resumo1 + data.resumo2;
  const displayConferenciaLinha = data.resumo1;

  // Recalculate statuses for real-time accuracy in the alert bar
  const metaComercialNum = parseValue(data.cancelamentoComercial.meta) / 100;
  const cenarioComercial = displayVendaTotal > 0 ? (data.cancelamentoComercial.valor / displayVendaTotal) * 100 : 0;
  const isComercialQuebra = cenarioComercial > (metaComercialNum * 100);

  const metaOperacionalNum = parseValue(data.cancelamentoOperacional.meta) / 100;
  const cenarioOperacional = displayVendaTotal > 0 ? (data.cancelamentoOperacional.valor / displayVendaTotal) * 100 : 0;
  const isOperacionalQuebra = cenarioOperacional > (metaOperacionalNum * 100);

  const metaUPM = parseValue(data.upmEticos.meta);
  const cenarioUPM = displayConferenciaLinha > 0 ? Math.round((data.upmEticos.valor / displayConferenciaLinha) * 1000000) : 0;
  const isUPMQuebra = cenarioUPM > metaUPM;

  const alerts = [
    { label: 'Cancelamento Comercial', active: isComercialQuebra },
    { label: 'Cancelamento Operacional', active: isOperacionalQuebra },
    { label: 'UPM Éticos', active: isUPMQuebra },
  ].filter(a => a.active);

  if (alerts.length === 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-red-600 text-white overflow-hidden relative"
        >
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }} 
                transition={{ repeat: Infinity, duration: 2 }}
                className="bg-white/20 p-1.5 rounded-full"
              >
                <AlertTriangle className="w-4 h-4" />
              </motion.div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest bg-white text-red-600 px-2 py-0.5 rounded">ALERTA CRÍTICO</span>
                <p className="text-sm font-bold">
                  Indicadores em Quebra: {alerts.map(a => a.label).join(', ')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setVisible(false)}
                className="text-[10px] font-black uppercase tracking-widest hover:bg-white/20 px-2 py-1 rounded transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
          
          {/* Animated Background Line */}
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/20">
            <motion.div 
              animate={{ x: ['100%', '-100%'] }} 
              transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
              className="w-1/2 h-full bg-white/40"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
