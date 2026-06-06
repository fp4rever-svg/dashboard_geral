import React, { useRef, useState } from 'react';
import { useUserPerformance, UserPerformanceRow } from '../../hooks/useUserPerformance';
import { Upload, Download, Loader2, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function UserPerformanceManager() {
  const { data, loading, updateAllData, addRow, updateRow, deleteRow, clearAllData } = useUserPerformance();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [importLoading, setImportLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Manual form state
  const [newUser, setNewUser] = useState('');
  const [newRecordsUPM, setNewRecordsUPM] = useState('');
  const [newConferredQty, setNewConferredQty] = useState('');
  const [newProdPct, setNewProdPct] = useState('');
  const [newUpmPct, setNewUpmPct] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState('');
  const [editRecordsUPM, setEditRecordsUPM] = useState('');
  const [editConferredQty, setEditConferredQty] = useState('');
  const [editProdPct, setEditProdPct] = useState('');
  const [editUpmPct, setEditUpmPct] = useState('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        // Split by lines and filter empty rows
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        
        const parsedRows: UserPerformanceRow[] = lines
          .slice(1) // Skip headers
          .map((line) => {
            // Support both semicolon and comma
            const cols = line.includes(';') ? line.split(';') : line.split(',');
            if (cols.length < 2) return null;

            return {
              user: cols[0]?.trim() || '',
              recordsUPM: parseInt(cols[1]?.replace(/\./g, '').trim()) || 0,
              conferredQty: parseInt(cols[2]?.replace(/\./g, '').trim()) || 0,
              prodPct: cols[3]?.trim() || '0%',
              upmPct: cols[4]?.trim() || '0%',
            };
          })
          .filter((row): row is UserPerformanceRow => row !== null && row.user !== '');

        if (parsedRows.length > 0) {
          // Keep top rows sorted or ordered naturally
          await updateAllData(parsedRows);
        }
      } catch (err) {
        console.error('Erro ao ler CSV de performance:', err);
      } finally {
        setImportLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const headers = "Usuario;RegistrosUPM;QtdConferida;PercProd;PercUPM";
    const sampleRows = [
      "ISOLIVEIRA;41;14219;7,88%;2,84%",
      "SVANZO;24;10833;6,00%;1,66%",
      "MCFLORIANO;65;9104;5,04%;4,50%",
      "MFJESUS;76;8585;4,76%;5,26%",
      "ALINESOUZA;2;6898;3,82%;0,14%"
    ];
    const csvContent = [headers, ...sampleRows].join("\n");
    // Ensure UTF-8 BOM encoding for correct display in Excel
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_top_performance.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.trim()) return;

    await addRow({
      user: newUser.trim().toUpperCase(),
      recordsUPM: parseInt(newRecordsUPM) || 0,
      conferredQty: parseInt(newConferredQty) || 0,
      prodPct: newProdPct.trim() || '0%',
      upmPct: newUpmPct.trim() || '0%'
    });

    // Reset Form
    setNewUser('');
    setNewRecordsUPM('');
    setNewConferredQty('');
    setNewProdPct('');
    setNewUpmPct('');
    setShowAddForm(false);
  };

  const handleStartEdit = (row: UserPerformanceRow) => {
    setEditingId(row.id || null);
    setEditUser(row.user);
    setEditRecordsUPM(row.recordsUPM.toString());
    setEditConferredQty(row.conferredQty.toString());
    setEditProdPct(row.prodPct);
    setEditUpmPct(row.upmPct);
  };

  const handleSaveEdit = async (id: string) => {
    await updateRow(id, {
      user: editUser.trim().toUpperCase(),
      recordsUPM: parseInt(editRecordsUPM) || 0,
      conferredQty: parseInt(editConferredQty) || 0,
      prodPct: editProdPct.trim() || '0%',
      upmPct: editUpmPct.trim() || '0%'
    });
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Tabela de Performance de Usuários</h3>
          <p className="text-sm text-slate-500">Dados individuais para exibição do TOP 5 de performance.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button 
            type="button"
            onClick={downloadTemplate}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors text-sm font-bold shadow-sm"
          >
            <Download className="w-4 h-4" />
            Baixar Modelo CSV
          </button>

          <input 
            ref={fileInputRef} 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload} 
            className="hidden" 
          />

          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importLoading}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold shadow-lg shadow-blue-600/10 disabled:opacity-50"
          >
            {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importar CSV
          </button>

          <button 
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors text-sm font-bold shadow-lg shadow-slate-900/10"
          >
            <Plus className="w-4 h-4" />
            Lançar Manualmente
          </button>

          {data.length > 0 && (
            <button 
              type="button"
              onClick={clearAllData}
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl border border-red-100 transition-colors text-sm font-bold"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Tudo
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.form 
            onSubmit={handleAddManual}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-4 overflow-hidden"
          >
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Usuário/Código</label>
              <input 
                type="text" 
                required 
                placeholder="Ex: ISOLIVEIRA"
                value={newUser}
                onChange={e => setNewUser(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Qtde Registros UPM</label>
              <input 
                type="number" 
                placeholder="Ex: 41"
                value={newRecordsUPM}
                onChange={e => setNewRecordsUPM(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Qtd Conferida</label>
              <input 
                type="number" 
                placeholder="Ex: 14219"
                value={newConferredQty}
                onChange={e => setNewConferredQty(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">% Prod</label>
              <input 
                type="text" 
                placeholder="Ex: 7,88%"
                value={newProdPct}
                onChange={e => setNewProdPct(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-1 flex-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">% UPM</label>
                <input 
                  type="text" 
                  placeholder="Ex: 2,84%"
                  value={newUpmPct}
                  onChange={e => setNewUpmPct(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-400"
                />
              </div>
              <button 
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm h-[38px] cursor-pointer"
              >
                Adicionar
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Registros UPM</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Qtd Conferida</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">% Prod</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">% UPM</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                    Nenhum colaborador registrado. Importe um arquivo CSV ou realize lançamentos manuais.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      {editingId === row.id ? (
                        <input 
                          type="text" 
                          value={editUser} 
                          onChange={e => setEditUser(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold text-slate-700"
                        />
                      ) : (
                        <span className="text-sm font-bold text-slate-800">{row.user}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === row.id ? (
                        <input 
                          type="number" 
                          value={editRecordsUPM} 
                          onChange={e => setEditRecordsUPM(e.target.value)}
                          className="w-24 bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold text-slate-700"
                        />
                      ) : (
                        <span className="text-sm font-medium text-slate-600">{row.recordsUPM.toLocaleString('pt-BR')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === row.id ? (
                        <input 
                          type="number" 
                          value={editConferredQty} 
                          onChange={e => setEditConferredQty(e.target.value)}
                          className="w-32 bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold text-slate-700"
                        />
                      ) : (
                        <span className="text-sm font-medium text-slate-600">{row.conferredQty.toLocaleString('pt-BR')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === row.id ? (
                        <input 
                          type="text" 
                          value={editProdPct} 
                          onChange={e => setEditProdPct(e.target.value)}
                          className="w-24 bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold text-slate-700"
                        />
                      ) : (
                        <span className="text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1 text-center inline-block min-w-[70px]">
                          {row.prodPct}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === row.id ? (
                        <input 
                          type="text" 
                          value={editUpmPct} 
                          onChange={e => setEditUpmPct(e.target.value)}
                          className="w-24 bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold text-slate-700"
                        />
                      ) : (
                        <span className="text-sm font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1 text-center inline-block min-w-[70px]">
                          {row.upmPct}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {editingId === row.id ? (
                          <>
                            <button 
                              onClick={() => handleSaveEdit(row.id!)}
                              className="p-1 text-emerald-600 bg-emerald-50 rounded border border-emerald-200 hover:bg-emerald-100 transition-colors"
                              title="Salvar"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setEditingId(null)}
                              className="p-1 text-red-600 bg-red-50 rounded border border-red-200 hover:bg-red-100 transition-colors"
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleStartEdit(row)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => deleteRow(row.id!)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
