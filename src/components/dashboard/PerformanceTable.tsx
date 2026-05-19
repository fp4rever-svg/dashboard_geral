import React, { useRef, useState } from 'react';
import { Upload, Loader2, Download } from 'lucide-react';

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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
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
      setLoading(false);
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
              onChange={handleFileUpload} 
              className="hidden" 
          />
          <button 
             onClick={() => fileInputRef.current?.click()}
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
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50 text-sm">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
