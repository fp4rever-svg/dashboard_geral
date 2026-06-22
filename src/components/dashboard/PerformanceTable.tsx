import React, { useRef, useState, useEffect } from 'react';
import { Upload, Loader2, Download, Sliders, Activity, AlertTriangle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PerformanceTableProps {
  rows: any[];
  onFileUpload: (data: any[]) => void;
  onRowUpdate?: (id: string, updates: any) => Promise<void>;
}

export function PerformanceTable({ rows, onFileUpload, onRowUpdate }: PerformanceTableProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // States for simulation settings in localStorage
  const [productivity, setProductivity] = useState(() => {
    const saved = localStorage.getItem('simulation_productivity');
    return saved ? parseInt(saved, 10) : 150;
  });

  const [penalty, setPenalty] = useState(() => {
    const saved = localStorage.getItem('simulation_rec_falta_penalty');
    return saved ? parseInt(saved, 10) : 10;
  });

  useEffect(() => {
    const handleStorage = () => {
      const prod = localStorage.getItem('simulation_productivity');
      if (prod) setProductivity(parseInt(prod, 10));

      const pen = localStorage.getItem('simulation_rec_falta_penalty');
      if (pen) setPenalty(parseInt(pen, 10));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleProductivityChange = (val: number) => {
    setProductivity(val);
    localStorage.setItem('simulation_productivity', String(val));
    window.dispatchEvent(new Event('storage'));
  };

  const handlePenaltyChange = (val: number) => {
    setPenalty(val);
    localStorage.setItem('simulation_rec_falta_penalty', String(val));
    window.dispatchEvent(new Event('storage'));
  };

  const resetSimulationParams = () => {
    handleProductivityChange(150);
    handlePenaltyChange(10);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const newData = lines.slice(1).map(line => {
          const cols = line.split(';');
          return { 
            hora: cols[2] || '', 
            cubagem: cols[3] || '0', 
            separaACS: cols[4] || '0', 
            separaUND: cols[5] || '0', 
            cFrac: cols[6] || '0' 
          };
        }).filter(row => row.hora); // Basic filtering
        onFileUpload(newData);
      } catch (err) {
        console.error("Erro ao processar arquivo:", err);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleStartEdit = (row: any) => {
    if (!onRowUpdate) return;
    setEditingId(row.id);
    setEditValue(row.separaACS);
  };

  const handleSaveEdit = async () => {
    if (editingId && onRowUpdate) {
      await onRowUpdate(editingId, { separaACS: editValue });
      setEditingId(null);
    }
  };

  const downloadTemplate = () => {
    const headers = "ID;USUARIO;HORA;CUBAGEM;SEPARA_ACS;SEPARA_UND;C_FRAC";
    const sampleRows = [
      "1;SISTEMA;18:00:00;738,00;586,00;2.361,00;157,00",
      "2;SISTEMA;19:00:00;2.489,00;843,00;3.250,00;1.052,00"
    ];
    const csvContent = [headers, ...sampleRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_analytics.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Seção de Coeficientes da Projeção de Saídas */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Sliders className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Ajuste de Coeficientes para Projeção de Saídas</h3>
            </div>
            <p className="text-xs text-slate-400">
              Parametrizador que calibra a produtividade de processamento e as penalidades para o cálculo de estimativa de saída das rotas na aba <strong className="text-blue-500 font-bold">Projeção de Saídas</strong>.
            </p>
          </div>
          <button
            onClick={resetSimulationParams}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 transition text-xs font-bold self-start sm:self-auto shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Valores
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Slider 1 */}
          <div className="space-y-2 border border-slate-100 p-4 rounded-xl bg-slate-50/50">
            <div className="flex justify-between items-center">
              <label className="text-slate-700 text-xs font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                Produtividade de Separação de Caixas
              </label>
              <span className="text-xs font-bold font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                {productivity} caixas / hora
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="600"
              step="10"
              value={productivity}
              onChange={(e) => handleProductivityChange(parseInt(e.target.value))}
              className="w-full accent-emerald-505 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>50 cx/h</span>
              <span>150 cx/h (Padrão)</span>
              <span>600 cx/h</span>
            </div>
          </div>

          {/* Slider 2 */}
          <div className="space-y-2 border border-slate-100 p-4 rounded-xl bg-slate-50/50">
            <div className="flex justify-between items-center">
              <label className="text-slate-700 text-xs font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Penalidade sobre Rec. Faltas
              </label>
              <span className="text-xs font-bold font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                +{penalty} minutos / pacote
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="1"
              value={penalty}
              onChange={(e) => handlePenaltyChange(parseInt(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Sem penalidade (0m)</span>
              <span>10m / falta (Padrão)</span>
              <span>60 minutos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela do Detalhamento Horário */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center sm:flex-row flex-col gap-4">
        <h2 className="text-lg font-bold text-slate-900 text-center sm:text-left">Detalhamento de Desempenho Horário</h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={downloadTemplate}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Baixar Modelo
          </button>
          <input 
              ref={fileInputRef} 
              type="file" 
              accept=".csv" 
              disabled={loading}
              onChange={handleFileUpload} 
              className="hidden" 
          />
          <button 
             onClick={() => !loading && fileInputRef.current?.click()}
             disabled={loading}
             className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
               <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando...
               </>
            ) : (
               <>
                  <Upload className="w-4 h-4" />
                  Importar CSV
               </>
            )}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Hora</th>
              <th className="px-6 py-4">Cubagem ACS</th>
              <th className="px-6 py-4">Separa.ACS</th>
              <th className="px-6 py-4">Separa.UND</th>
              <th className="px-6 py-4">C.Frac.UND</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <AnimatePresence>
            {rows.map((row, i) => (
              <motion.tr 
                key={row.id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className="hover:bg-slate-50 text-sm"
              >
                <td className="px-6 py-4 font-semibold text-slate-900">{row.hora}</td>
                <td className="px-6 py-4 text-slate-600">{row.cubagem}</td>
                <td 
                  className={`px-6 py-4 text-slate-600 ${onRowUpdate ? 'cursor-pointer hover:bg-blue-50 transition-colors group' : ''}`}
                  onClick={() => handleStartEdit(row)}
                >
                  {editingId === row.id ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="text"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="w-24 bg-white border border-blue-400 rounded px-2 py-1 outline-none text-sm font-bold text-blue-700"
                      />
                      <button 
                        onClick={handleSaveEdit}
                        className="text-[10px] font-bold text-blue-600 uppercase"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span>{row.separaACS}</span>
                      {onRowUpdate && (
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-blue-500 uppercase ml-2 transition-opacity">Editar</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-600">{row.separaUND}</td>
                <td className="px-6 py-4 text-slate-600">{row.cFrac}</td>
              </motion.tr>
            ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
