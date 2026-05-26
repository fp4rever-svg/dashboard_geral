import React, { useState, useRef } from 'react';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/utils';
import { Upload, Download, FileSpreadsheet, AlertTriangle, X } from 'lucide-react';
import { useLogisticsData, LogisticsRow } from '../../hooks/useLogisticsData';
import { useAppMetadata } from '../../hooks/useAppMetadata';
import { motion, AnimatePresence } from 'motion/react';

const FIXED_DATA = [
  { rotas: '731', horarios: '01:00:00' },
  { rotas: '732', horarios: '01:00:00' },
  { rotas: '733', horarios: '01:00:00' },
  { rotas: '734', horarios: '01:00:00' },
  { rotas: '764', horarios: '01:30:00' },
  { rotas: '722', horarios: '02:10:00' },
  { rotas: '761', horarios: '02:40:00' },
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

const statusColors: Record<string, string> = {
  'Finalizado': 'bg-green-100 text-green-800',
  'Pendente': 'bg-yellow-100 text-yellow-800',
  'Atrasado': 'bg-red-100 text-red-800',
};

export function LogisticsTable({ isAdmin = false, selectedRoute, onRouteSelect }: { isAdmin?: boolean; selectedRoute: string; onRouteSelect: (route: string) => void }) {
  const { rows: initialRows, loading } = useLogisticsData();
  const { updateLastUploadAt } = useAppMetadata();
  const [rows, setRows] = useState<LogisticsRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ id: number, message: string } | null>(null);

  // Sync rows from hook when they change, but allow local edits before saving
  React.useEffect(() => {
    if (initialRows.length > 0) {
      // Check for status changes to 'Atrasado'
      initialRows.forEach(newRow => {
        const oldRow = rows.find(r => r.rotas === newRow.rotas);
        if (oldRow && oldRow.status !== 'Atrasado' && newRow.status === 'Atrasado') {
          setToast({ id: Date.now(), message: `Rota ${newRow.rotas} está atrasada!` });
          setTimeout(() => setToast(null), 5000);
        }
      });
      setRows(initialRows);
    }
  }, [initialRows]);

  const handleRouteSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
      onRouteSelect(e.target.value);
  };
 
  const handleInputChange = (rotas: string, field: 'docsIniciais' | 'docsAtuais', value: string) => {
      if (!isAdmin) return;
      const numericValue = parseInt(value) || 0;
      setRows(rows.map(r => r.rotas === rotas ? { ...r, [field]: numericValue } : r));
  };

  const handleSaveField = async (rotas: string, field: 'docsIniciais' | 'docsAtuais') => {
    if (!isAdmin) return;
    const row = rows.find(r => r.rotas === rotas);
    if (!row) return;
    const value = row[field];
    try {
      const docRef = doc(db, 'logistics_data', rotas);
      await setDoc(docRef, { [field]: value }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `logistics_data/${rotas}`);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !isAdmin) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
            alert('Arquivo vazio ou inválido.');
            setImporting(false);
            return;
        }

        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        const batch = writeBatch(db);
        let updatedCount = 0;
        let skippedCount = 0;

        // Skip header if it exists (contains "Rota" or "Rota" in different cases)
        const hasHeader = lines[0].toLowerCase().includes('rota');
        const startIndex = hasHeader ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Support multiple separators: comma, semicolon, tab
          let separator = ',';
          if (line.includes(';')) separator = ';';
          else if (line.includes('\t')) separator = '\t';

          const parts = line.split(separator).map(s => s.trim().replace(/^["']|["']$/g, ''));
          
          if (parts.length < 3) {
              skippedCount++;
              continue;
          }

          const [rawRota, rawInicial, rawAtual] = parts;
          
          // Normalize rota: 0731 -> 731
          const normalizedRota = rawRota.replace(/^0+/, '') || rawRota;
          
          const rowExists = FIXED_DATA.some(r => r.rotas === normalizedRota);
          
          if (rowExists) {
            const parseDocCount = (val: string) => {
              // Remove points (1.234) and handle comma as decimal if needed
              const cleaned = val.replace(/\./g, '').replace(',', '.');
              const num = Math.floor(parseFloat(cleaned));
              return isNaN(num) ? 0 : num;
            };

            const docsIniciais = parseDocCount(rawInicial);
            const docsAtuais = parseDocCount(rawAtual);
            
            const docRef = doc(db, 'logistics_data', normalizedRota);
            batch.set(docRef, { docsIniciais, docsAtuais }, { merge: true });
            updatedCount++;
          } else {
            console.warn(`Rota não encontrada: ${normalizedRota}`);
            skippedCount++;
          }
        }

        if (updatedCount > 0) {
          await batch.commit();
          await updateLastUploadAt(new Date());
          alert(`Sucesso! ${updatedCount} rotas atualizadas.${skippedCount > 0 ? ` (${skippedCount} linhas ignoradas)` : ''}`);
        } else {
          alert('Nenhuma rota válida encontrada no arquivo. Verifique se o formato é: Rota, Qtd Inicial, Qtd Atual');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'logistics_batch');
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      alert('Erro ao ler o arquivo.');
      setImporting(false);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const header = "Rota,DocsIniciais,DocsAtuais\n";
    const content = rows.map(r => `${r.rotas},${r.docsIniciais},${r.docsAtuais}`).join('\n');
    const blob = new Blob([header + content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_logistica.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
    </div>
  );

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-red-600 text-white p-4 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
            <AlertTriangle className="w-5 h-5" />
            <p className="font-bold">{toast.message}</p>
            <button onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
        </div>
      )}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-lg text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Fluxo de Documentos</h2>
            <input
                type="text"
                placeholder="Filtrar por Rota..."
                value={selectedRoute}
                onChange={handleRouteSearch}
                className="ml-4 p-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          
          {isAdmin && (
            <div className="flex gap-3">
              <button 
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-all"
              >
                <Download className="w-4 h-4" />
                Modelo CSV
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50"
              >
                {importing ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Importar CSV
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv"
                className="hidden"
              />
            </div>
          )}
        </div>
      <table className="w-full text-sm text-center border-collapse">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="p-3 border">Rotas</th>
            <th className="p-3 border">Qtd Inicial Docs</th>
            <th className="p-3 border">Qtd Docs Faltantes</th>
            <th className="p-3 border">% Conclusão</th>
            <th className="p-3 border">Horários</th>
            <th className="p-3 border">Status</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
          {rows.filter(r => r.rotas.includes(selectedRoute)).map((row, i) => {
            const diff = Math.max(0, row.docsIniciais - row.docsAtuais);
            const percentage = row.docsIniciais > 0 ? ((diff / row.docsIniciais) * 100).toFixed(0) + '%' : '0%';
            
            return (
              <motion.tr 
                key={row.rotas}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
              >
                <td className="p-3 border font-medium">{row.rotas}</td>
                <td className="p-3 border">
                   <input type="number" 
                          value={row.docsIniciais} 
                          disabled={!isAdmin}
                          onChange={(e) => handleInputChange(row.rotas, 'docsIniciais', e.target.value)}
                          onBlur={() => handleSaveField(row.rotas, 'docsIniciais')}
                          className={`w-full text-center p-1 rounded ${isAdmin ? 'bg-slate-50' : 'bg-transparent cursor-default'}`}
                   />
                </td>
                <td className="p-3 border">
                   <input type="number" 
                          value={row.docsAtuais} 
                          disabled={!isAdmin}
                          onChange={(e) => handleInputChange(row.rotas, 'docsAtuais', e.target.value)}
                          onBlur={() => handleSaveField(row.rotas, 'docsAtuais')}
                          className={`w-full text-center p-1 rounded ${isAdmin ? 'bg-slate-50' : 'bg-transparent cursor-default'}`}
                   />
                </td>
                <td className="p-3 border font-bold text-blue-600">{percentage}</td>
                <td className="p-3 border">{row.horarios}</td>
                <td className="p-3 border">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[row.status] || 'bg-slate-100 text-slate-800'}`}>
                    {row.status}
                  </span>
                </td>
              </motion.tr>
            );
          })}
          </AnimatePresence>
          <tr className="bg-slate-200 font-bold">
            <td className="p-3 border">Total</td>
            <td className="p-3 border">{rows.reduce((acc, row) => acc + (row.docsIniciais || 0), 0)}</td>
            <td className="p-3 border">{rows.reduce((acc, row) => acc + (row.docsAtuais || 0), 0)}</td>
            <td className="p-3 border">-</td>
            <td className="p-3 border">-</td>
            <td className="p-3 border">-</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  );
}
