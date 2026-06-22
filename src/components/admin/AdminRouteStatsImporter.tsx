import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouteFlowData } from '../../hooks/useRouteFlowData';
import { 
  Upload, 
  Database, 
  FileSpreadsheet, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  Check, 
  X,
  Workflow,
  Sparkles,
  Search,
  BookOpen,
  ArrowRight,
  Info
} from 'lucide-react';

type TableOption = 'zwm' | 'sales' | 'cuts' | 'full';

export function AdminRouteStatsImporter() {
  const { importRouteStats, resetToMockData, loading, allRoutes, getRouteData } = useRouteFlowData();
  const [activeTab, setActiveTab] = useState<TableOption>('zwm');
  const [pastedData, setPastedData] = useState<string>('');
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  
  // Status reporting
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string | null }>({
    type: null,
    message: null
  });
  
  // Parse preview and mapping state
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [errorRows, setErrorRows] = useState<string[]>([]);
  const [isConfirmingReset, setIsConfirmingReset] = useState<boolean>(false);

  // Example CSV instructions and structures
  const templates = {
    zwm: {
      headers: 'rota,caixasSeparacao,cxSepEmUso,recFaltas,separacao,conferencia,postoEmbalagem,expedicao',
      example: 'ROTA 101,150,12,3,45,20,15,55\nROTA 102,80,5,1,22,10,8,34\nROTA 103,120,8,2,30,15,10,55'
    },
    sales: {
      headers: 'rota,vendas',
      example: 'ROTA 101,8400\nROTA 102,5200\nROTA 103,11500'
    },
    cuts: {
      headers: 'rota,cortes',
      example: 'ROTA 101,12\nROTA 102,4\nROTA 103,80'
    },
    full: {
      headers: 'rota,caixasSeparacao,cxSepEmUso,recFaltas,separacao,conferencia,postoEmbalagem,expedicao,vendas,cortes',
      example: 'ROTA 101,150,12,3,45,20,15,55,8400,12\nROTA 102,80,5,1,22,10,8,34,5200,4'
    }
  };

  const downloadPaths = {
    zwm: '/modelos_carga/modelo_zwm.csv',
    sales: '/modelos_carga/modelo_vendas.csv',
    cuts: '/modelos_carga/modelo_cortes.csv',
    full: '/modelos_carga/modelo_completo.csv'
  };

  // Normalizer helper variants
  const normalizeRow = (raw: any, type: TableOption) => {
    // 1. Detect and normalize Rota ID
    const rotaKey = Object.keys(raw).find(k => /rota|route|id/i.test(k));
    const rawRoute = rotaKey ? raw[rotaKey] : Object.values(raw)[0];
    
    if (!rawRoute || typeof rawRoute !== 'string') return null;
    
    // Normalize format: "ROTA 101" or standard format
    let normalizedRoute = rawRoute.trim().toUpperCase();
    if (/^\d+$/.test(normalizedRoute)) {
      normalizedRoute = `ROTA ${normalizedRoute}`;
    }

    const getNum = (regexArr: RegExp[], defaultVal = 0) => {
      const key = Object.keys(raw).find(k => regexArr.some(r => r.test(k)));
      if (key && raw[key] !== undefined && raw[key] !== '') {
        const parsed = Number(raw[key].toString().replace(/[^\d.-]/g, ''));
        return isNaN(parsed) ? defaultVal : parsed;
      }
      return defaultVal;
    };

    if (type === 'zwm') {
      return {
        rota: normalizedRoute,
        caixasSeparacao: getNum([/caix.*separ/i, /total/i, /caixasseparacao/i]),
        cxSepEmUso: getNum([/cx.*uso/i, /em.*uso/i, /cxsepemuso/i]),
        recFaltas: getNum([/rec.*falt/i, /repos.*falt/i, /faltas/i, /recfaltas/i]),
        separacao: getNum([/separacao/i, /em.*sep/i]),
        conferencia: getNum([/confer/i, /em.*conf/i]),
        postoEmbalagem: getNum([/posto.*embal/i, /embal/i]),
        expedicao: getNum([/exped/i, /expedi/i])
      };
    } else if (type === 'sales') {
      return {
        rota: normalizedRoute,
        vendas: getNum([/vendas|sales|volume|unid|qtd/i])
      };
    } else if (type === 'cuts') {
      return {
        rota: normalizedRoute,
        cortes: getNum([/cortes|cuts|perda|cortado/i])
      };
    } else { // full merge
      return {
        rota: normalizedRoute,
        caixasSeparacao: getNum([/caix.*separ/i, /total/i, /caixasseparacao/i]),
        cxSepEmUso: getNum([/cx.*uso/i, /em.*uso/i, /cxsepemuso/i]),
        recFaltas: getNum([/rec.*falt/i, /repos.*falt/i, /faltas/i]),
        separacao: getNum([/separacao/i, /em.*sep/i]),
        conferencia: getNum([/confer/i, /em.*conf/i]),
        postoEmbalagem: getNum([/posto.*embal/i, /embal/i]),
        expedicao: getNum([/exped/i, /expedi/i]),
        vendas: getNum([/vendas|sales|volume|unid|qtd/i]),
        cortes: getNum([/cortes|cuts|perda/i])
      };
    }
  };

  const handleParse = (textToParse: string) => {
    if (!textToParse.trim()) {
      setStatus({ type: 'error', message: 'Por favor, insira o conteúdo CSV/Texto para processamento.' });
      setPreviewRows([]);
      setErrorRows([]);
      return;
    }

    try {
      const lines = textToParse.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setStatus({ type: 'error', message: 'Formato CSV inválido. Deve conter pelo menos o cabeçalho e uma linha de dados.' });
        return;
      }

      // Detect delimiter
      const firstLine = lines[0];
      let delimiter = ',';
      if (firstLine.includes(';')) delimiter = ';';
      else if (firstLine.includes('\t')) delimiter = '\t';

      const headers = firstLine.split(delimiter).map(h => h.replace(/['"]/g, '').trim());
      const parsedRows: any[] = [];
      const errorsList: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter).map(c => c.replace(/['"]/g, '').trim());
        const rowObj: any = {};
        headers.forEach((h, idx) => {
          rowObj[h] = cols[idx] !== undefined ? cols[idx] : '';
        });

        const normalized = normalizeRow(rowObj, activeTab);
        if (normalized) {
          parsedRows.push(normalized);
        } else {
          errorsList.push(`Linha ${i + 1}: Formato de rota ou dados inválido.`);
        }
      }

      setPreviewRows(parsedRows);
      setErrorRows(errorsList);
      setStatus({
        type: errorsList.length > 0 ? 'error' : 'success',
        message: `Análise concluída: ${parsedRows.length} linhas válidas identificadas.${errorsList.length > 0 ? ` ${errorsList.length} erros detectados.` : ''}`
      });
    } catch (e: any) {
      setStatus({ type: 'error', message: `Erro ao analisar dados: ${e.message}` });
    }
  };

  // Trigger import inside firestore via custom hook
  const handleExecuteImport = async () => {
    if (previewRows.length === 0) {
      setStatus({ type: 'error', message: 'Nenhum dado válido para importar. Faça a pré-visualização primeiro.' });
      return;
    }

    try {
      setStatus({ type: null, message: null });
      
      await importRouteStats(activeTab, previewRows, importMode === 'overwrite');
      
      setStatus({
        type: 'success',
        message: `Excelente! Carga de ${previewRows.length} rotas importada com sucesso no Firebase.`
      });
      setPastedData('');
      setPreviewRows([]);
    } catch (err: any) {
      setStatus({
        type: 'error',
        message: `Falha na gravação do Firebase: ${err.message}`
      });
    }
  };

  // Restore defaults
  const handleReset = async () => {
    try {
      await resetToMockData();
      setIsConfirmingReset(false);
      setStatus({
        type: 'success',
        message: 'Todas as 3 tabelas foram reiniciadas com sucesso aos dados originais de fábrica!'
      });
    } catch (err: any) {
      setStatus({
        type: 'error',
        message: `Erro ao restaurar dados: ${err.message}`
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setPastedData(text);
      handleParse(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-650 rounded-2xl">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Importador de Tabelas Operacionais</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1.5">Faça a carga horária de rotas ZWM0255P, faturamento físico e cortes de estoque.</p>
          </div>
        </div>

        <button
          onClick={() => setIsConfirmingReset(true)}
          className="px-3.5 py-1.5 rounded-lg border border-red-200 text-red-650 hover:bg-red-50 text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Restaurar Originais / Reset
        </button>
      </div>

      {/* Database Quick Reset Confirmation */}
      <AnimatePresence>
        {isConfirmingReset && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-5 bg-red-50 rounded-2xl border border-red-150 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 bg-red-500 h-full" />
            <div className="flex items-start gap-3 pl-2.5">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase">Aviso: Restauração de Carga</h4>
                <p className="text-[11px] text-slate-500 font-extrabold mt-1 leading-relaxed">
                  Isso irá apagar todos os dados inseridos manualmente e restaurar os dados de simulação originais das 3 tabelas no Firestore. Deseja continuar?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
              <button
                onClick={() => setIsConfirmingReset(false)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-500 hover:bg-white bg-transparent cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                disabled={loading}
                className="px-3.5 py-1.5 bg-red-655 text-white hover:bg-red-700 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm cursor-pointer flex items-center gap-1 isDisabled"
              >
                {loading ? 'Restaurando...' : 'Confirmar Restauração'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left config side */}
        <div className="lg:col-span-5 space-y-4">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Selecionar o Tipo de Carga</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'zwm', label: 'ZWM0255P (Fluxo)', icon: Workflow },
              { id: 'sales', label: 'Volume Vendas', icon: FileSpreadsheet },
              { id: 'cuts', label: 'Cortes CD', icon: AlertTriangle },
              { id: 'full', label: 'Carga Full / Completa', icon: Sparkles }
            ].map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as TableOption);
                    setPastedData('');
                    setPreviewRows([]);
                    setStatus({ type: null, message: null });
                  }}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between h-20 cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-750 shadow-inner'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-150 text-slate-600'
                  }`}
                >
                  <TabIcon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span className="text-[10px] font-black uppercase tracking-wider">{tab.label}</span>
                  {activeTab === tab.id && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-650 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 text-[10px] text-slate-550 space-y-2.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-150 pb-2 mb-1.5">
              <span className="font-black text-slate-800 uppercase tracking-widest flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                Especificação CSV
              </span>
              <a
                href={downloadPaths[activeTab]}
                download={`modelo_${activeTab}.csv`}
                className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-[9px] font-black uppercase text-emerald-700 hover:text-emerald-800 rounded-lg border border-slate-200 shadow-xs transition-all cursor-pointer hover:border-emerald-200"
                title="Clique para baixar o arquivo .csv padrão de exemplo"
              >
                <FileSpreadsheet className="w-3 h-3 text-emerald-650" />
                Baixar Modelo .csv
              </a>
            </div>
            <div className="bg-slate-900 text-teal-400 p-2.5 rounded-lg font-mono text-[9px] overflow-x-auto whitespace-pre select-all">
              {templates[activeTab].headers}
            </div>
            <div className="bg-slate-100 p-2.5 rounded-lg font-mono text-[8.5px] text-slate-500 overflow-x-auto whitespace-pre">
              {templates[activeTab].example}
            </div>
            <p className="text-[9px] text-slate-400 leading-normal font-bold pt-1">
              Você pode copiar este modelo acima, preencher com seus dados no Excel/Bloco de Notas e colar na área de texto ao lado.
            </p>
          </div>

          {/* Import behavior settings */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-3">
            <span className="block text-[10px] font-black text-slate-450 uppercase tracking-widest">Modo de Gravação</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setImportMode('merge')}
                className={`py-2 px-3 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  importMode === 'merge'
                    ? 'bg-white border-indigo-600 text-indigo-700 shadow-sm'
                    : 'bg-transparent border-slate-200 text-slate-500'
                }`}
              >
                Mesclar / Atualizar
              </button>
              <button
                type="button"
                onClick={() => setImportMode('overwrite')}
                className={`py-2 px-3 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  importMode === 'overwrite'
                    ? 'bg-white border-red-500 text-red-600 shadow-sm'
                    : 'bg-transparent border-slate-200 text-slate-500'
                }`}
              >
                Sobrescrever Tudo
              </button>
            </div>
            <p className="text-[9px] text-slate-400 font-semibold leading-normal">
              {importMode === 'merge' 
                ? 'Os dados enviados irão atualizar apenas as rotas enviadas, preservando as demais.' 
                : 'Substituição destrutiva: removerá todas as rotas atuais no CD do Firestore e carregará apenas as novas.'}
            </p>
          </div>
        </div>

        {/* Column Paste and Preview zone */}
        <div className="lg:col-span-7 space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">2. Inserir Dados (Colar CSV ou Upload)</label>
            
            <label className="flex items-center gap-1.5 text-[9px] font-black text-indigo-650 hover:text-indigo-850 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Escolher Arquivo .csv</span>
              <input 
                type="file" 
                accept=".csv, .txt" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
          </div>

          <div className="relative">
            <textarea
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              placeholder={`Cole aqui o CSV para ${activeTab.toUpperCase()}.\nExemplo:\n${templates[activeTab].example}`}
              rows={8}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all shadow-inner placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleParse(pastedData)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex-1 flex items-center justify-center gap-1.5"
            >
              <Search className="w-4 h-4 text-slate-500" />
              Analisar Dados
            </button>
            
            <button
              onClick={handleExecuteImport}
              disabled={loading || previewRows.length === 0}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex-1 flex items-center justify-center gap-1.5 border border-transparent cursor-pointer shadow-md text-white bg-indigo-600 hover:bg-indigo-700 ${
                (loading || previewRows.length === 0) ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <Check className="w-4 h-4" />
              {loading ? 'Processando Carga...' : 'Confirmar e Gravar'}
            </button>
          </div>

          {/* Feedback states */}
          <AnimatePresence>
            {status.message && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className={`p-4 rounded-xl text-xs font-bold leading-relaxed border ${
                  status.type === 'success'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    : 'bg-amber-50 border-amber-150 text-amber-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  {status.type === 'success' ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                  <span>{status.message}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Render Preview Data */}
          {previewRows.length > 0 && (
            <div className="pt-3 space-y-2 flex-1 flex flex-col min-h-[160px]">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                3. Pré-Visualização das {previewRows.length} linhas normalizadas
              </span>
              
              <div className="flex-1 overflow-x-auto border border-slate-150 rounded-xl max-h-48 overflow-y-auto shadow-inner bg-slate-50">
                <table className="w-full text-[10px] text-slate-650 font-bold">
                  <thead className="bg-slate-100 text-slate-500 uppercase tracking-wider border-b border-slate-150 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Rota</th>
                      {activeTab === 'zwm' && (
                        <>
                          <th className="px-3 py-2 text-right">Carga</th>
                          <th className="px-3 py-2 text-right">Uso</th>
                          <th className="px-3 py-2 text-right">Faltas</th>
                          <th className="px-3 py-2 text-right">Separ.</th>
                          <th className="px-3 py-2 text-right">Conf.</th>
                          <th className="px-3 py-2 text-right">Exp.</th>
                        </>
                      )}
                      {activeTab === 'sales' && <th className="px-3 py-2 text-right">Qtd. Unid Vendas</th>}
                      {activeTab === 'cuts' && <th className="px-3 py-2 text-right">Qtd. Cortes</th>}
                      {activeTab === 'full' && (
                        <>
                          <th className="px-3 py-2 text-right">Carga</th>
                          <th className="px-3 py-2 text-right">Separ.</th>
                          <th className="px-3 py-2 text-right">Exp.</th>
                          <th className="px-3 py-2 text-right">Vendas</th>
                          <th className="px-3 py-2 text-right">Cortes</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 bg-white">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/50">
                        <td className="px-3 py-1.5 font-extrabold text-slate-800 uppercase">{row.rota}</td>
                        {activeTab === 'zwm' && (
                          <>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-600">{row.caixasSeparacao}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-600">{row.cxSepEmUso}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-600">{row.recFaltas}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-600">{row.separacao}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-600">{row.conferencia}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-700">{row.expedicao}</td>
                          </>
                        )}
                        {activeTab === 'sales' && (
                          <td className="px-3 py-1.5 text-right font-mono text-slate-700">{row.vendas.toLocaleString()}</td>
                        )}
                        {activeTab === 'cuts' && (
                          <td className="px-3 py-1.5 text-right font-mono text-red-650">{row.cortes.toLocaleString()}</td>
                        )}
                        {activeTab === 'full' && (
                          <>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-500">{row.caixasSeparacao}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-500">{row.separacao}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-500">{row.expedicao}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-705 font-extrabold">{row.vendas.toLocaleString()}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-red-600 font-extrabold">{row.cortes.toLocaleString()}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
