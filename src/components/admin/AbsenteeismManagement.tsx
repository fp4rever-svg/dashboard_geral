import React, { useState, useEffect } from 'react';
import { useAbsenteeismData } from '../../hooks/useAbsenteeismData';
import { 
  Users, AlertCircle, Loader2, FileSpreadsheet, RefreshCw, 
  CheckCircle2, HelpCircle, X, ShieldAlert 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getSheetsConfig, saveSheetsConfig, fetchAndParsePublicCsvData, 
  updateLastSyncedTimestamp, extractSpreadsheetId 
} from '../../lib/googleSheets';

export function AbsenteeismManagement() {
  const { rows, loading, updateRow, totals } = useAbsenteeismData();
  
  // Sheets state
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [sheetTabName, setSheetTabName] = useState('Historico');
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Notification alert state
  const [syncFeedback, setSyncFeedback] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ visible: false, type: 'success', message: '' });

  // Last synced string cached from config
  const [lastSyncedText, setLastSyncedText] = useState('');

  // Load configured sheets info on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await getSheetsConfig();
        if (config.spreadsheetId) {
          setSpreadsheetUrl(`https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`);
        } else {
          // Default provided sheet URL
          setSpreadsheetUrl('https://docs.google.com/spreadsheets/d/1nYm2aRgruykh2YfXTcpCRuHGIqI0TtAFroMEk_p7Ij8');
        }
        setSheetTabName(config.sheetName || 'Historico');
        if (config.lastSyncedAt) {
          const date = new Date(config.lastSyncedAt);
          setLastSyncedText(date.toLocaleString('pt-BR'));
        }
      } catch (err) {
        console.error('Error loading sheets config:', err);
      } finally {
        setIsConfigLoading(false);
      }
    }
    loadConfig();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setSyncFeedback({ visible: true, type, message });
    // auto hide after 7 seconds
    setTimeout(() => {
      setSyncFeedback(prev => ({ ...prev, visible: false }));
    }, 7000);
  };

  const handleSheetsWebSync = async () => {
    if (!spreadsheetUrl.trim()) {
      showNotification('error', 'Por favor, insira o link ou ID da planilha do Google Sheets primeiro.');
      return;
    }

    setIsSyncing(true);

    try {
      const extractedId = extractSpreadsheetId(spreadsheetUrl);
      if (!extractedId) {
        throw new Error('Link ou ID de planilha inválido.');
      }

      // 1. Save metadata configuration in Firestore
      await saveSheetsConfig(extractedId, sheetTabName);

      // 2. Call the new super-fast public CSV processor (No authentication popups or logins required!)
      const parseResult = await fetchAndParsePublicCsvData(extractedId, sheetTabName);

      if (!parseResult.success || !parseResult.data) {
        throw new Error(parseResult.message || 'Erro ao processar planilha de presença.');
      }

      // 3. Write parsed values back to our active sector absenteeism database
      for (const sectorData of parseResult.data) {
        await updateRow(sectorData.sector, 'faltas', sectorData.faltas);
        await updateRow(sectorData.sector, 'total', sectorData.total);
      }

      // 4. Update last sync log
      await updateLastSyncedTimestamp();
      setLastSyncedText(new Date().toLocaleString('pt-BR'));
      showNotification('success', parseResult.message);

    } catch (err: any) {
      console.error('Error syncing Google Sheets:', err);
      showNotification('error', err.message || 'Houve um problema durante a sincronização com o Google Sheets.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading || isConfigLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Pop-up Notification Panel */}
      <AnimatePresence>
        {syncFeedback.visible && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`p-4 rounded-2xl shadow-xl flex items-start gap-3 border ${
              syncFeedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-150 text-emerald-900' 
                : 'bg-rose-50 border-rose-150 text-rose-900'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-600" />
              )}
            </div>
            <div className="flex-1 space-y-0.5">
              <h5 className="text-xs font-black uppercase tracking-wider">
                {syncFeedback.type === 'success' ? 'Importação Concluída' : 'Falha na Sincronização'}
              </h5>
              <p className="text-xs font-semibold leading-relaxed">
                {syncFeedback.message}
              </p>
            </div>
            <button
              onClick={() => setSyncFeedback(prev => ({ ...prev, visible: false }))}
              className="p-1 hover:bg-black/5 rounded-lg text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Gestão de Absenteísmo</h2>
              <p className="text-sm text-slate-500">Controle de faltas e presença por setor</p>
            </div>
          </div>
          
          <div className="text-xs text-slate-400 font-bold bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100 self-start md:self-auto">
            {lastSyncedText ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Última Sincronização: {lastSyncedText}
              </span>
            ) : (
              <span>Nenhum sincronismo Sheets configurado</span>
            )}
          </div>
        </div>

        {/* Dynamic Google Sheets Integration Panel */}
        <div className="mb-8 p-6 bg-emerald-50/40 rounded-3xl border border-emerald-150/60 space-y-5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-500/10">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950">Sincronização Direta Instantânea</h3>
                <p className="text-[11px] text-emerald-700 font-medium">Extraia e sincronize as faltas de forma 100% automatizada e sem login!</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-white border border-emerald-150 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Link de Acesso Livre Ativo
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-7 space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-emerald-950">
                Link ou ID da Planilha Google (Acesso público ativado)
              </label>
              <input
                type="text"
                placeholder="Ex: https://docs.google.com/spreadsheets/d/1v_f4F7G0S2P-K.../edit"
                value={spreadsheetUrl}
                onChange={(e) => setSpreadsheetUrl(e.target.value)}
                disabled={isSyncing}
                className="w-full px-4 py-3 bg-white border border-emerald-150 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-2xs"
              />
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-emerald-950">
                Nome da Aba (Tab)
              </label>
              <input
                type="text"
                placeholder="Historico"
                value={sheetTabName}
                onChange={(e) => setSheetTabName(e.target.value)}
                disabled={isSyncing}
                className="w-full px-4 py-3 bg-white border border-emerald-150 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-2xs"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleSheetsWebSync}
                disabled={isSyncing}
                className={`w-full py-3.5 px-4 rounded-2xl text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg transition-all ${
                  isSyncing 
                    ? 'bg-emerald-700 shadow-none' 
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10 active:scale-97'
                }`}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Sincronizar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/50 rounded-xl flex items-start gap-2.5 text-[10.5px] text-emerald-800 font-medium leading-relaxed border border-emerald-100">
            <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                <strong>Mapeamento por Setor:</strong>
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li><strong>Conferencia</strong></li>
                <li><strong>Expedição</strong></li>
                <li><strong>Separação</strong></li>
                <li><strong>Controlados</strong></li>
                <li><strong>Padrão</strong></li>
                <li><strong>A-Frame</strong></li>
              </ul>
              <p className="mt-2 text-[10px] text-emerald-700 font-bold">
                * Filtra o dia atual considerando a mudança operacional de turno e cai para o registro preenchido mais recente se o dia atual ainda não tiver logs.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Setor / Área</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Faltas</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-black tracking-normal">Total Colaboradores</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">% Absenteísmo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row) => {
                return (
                  <tr key={row.setor} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800">{row.setor}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        min="0"
                        value={row.faltas}
                        onChange={(e) => updateRow(row.setor, 'faltas', parseInt(e.target.value) || 0)}
                        className="w-24 px-3 py-1.5 bg-slate-100 border-none rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        min="1"
                        value={row.total}
                        onChange={(e) => updateRow(row.setor, 'total', parseInt(e.target.value) || 0)}
                        className="w-24 px-3 py-1.5 bg-slate-100 border-none rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`text-lg font-black tracking-tighter ${row.percentage > 5 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {row.percentage.toFixed(2)}%
                        </span>
                        <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div 
                             className={`h-full rounded-full transition-all duration-500 ${row.percentage > 5 ? 'bg-red-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(row.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white border-t-4 border-slate-100">
                <td className="p-5 font-black uppercase text-[11px] tracking-widest rounded-bl-[1.5rem]">Total Geral</td>
                <td className="p-5 font-black text-lg">{totals.faltas}</td>
                <td className="p-5 font-black text-lg">{totals.total}</td>
                <td className="p-5 text-right font-black text-2xl tracking-tighter rounded-br-[1.5rem] text-indigo-400">
                  {totals.percentage.toFixed(2)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl flex gap-4 items-start"
      >
        <AlertCircle className="w-6 h-6 text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-black text-indigo-900 uppercase tracking-widest">Dica de Gestão</h4>
          <p className="text-sm text-indigo-700 leading-relaxed">
            Mantenha os dados de absenteísmo atualizados diariamente para garantir a precisão dos indicadores de <strong>Saúde da Operação</strong>. 
            Uma taxa acima de 5% pode impactar significativamente a produtividade da expedição.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
