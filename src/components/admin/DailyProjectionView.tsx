import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/utils';
import { Save, Clock, TrendingDown, Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useProjectionData, ProjectionData } from '../../hooks/useProjectionData';

const DEFAULT_DATA: ProjectionData = {
  horaAtual: '05:00:42',
  vendaTotal: 156840,
  conferenciaLinha: 118063,
  otsPadrao: 12929,
  resumo1: 118063,
  resumo2: 38777,
  cancelamentoComercial: { meta: '2,08%', valor: 3130, cenarioAtual: '2,00%', limite: 3262 },
  cancelamentoOperacional: { meta: '0,06%', valor: 40, cenarioAtual: '0,03%', limite: 94 },
  upmEticos: { meta: 1530, valor: 54, cenarioAtual: 457, limite: 181 },
  volumeDiario: { meta: 2000, valor: 0, cenarioAtual: '#DIV/0!', limite: 1847 },
  previsaoHora: '#DIV/0!',
};

export function DailyProjectionView() {
  const { data: initialData, loading } = useProjectionData();
  const [data, setData] = useState<ProjectionData>(initialData);
  const [saving, setSaving] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('pt-BR'));

  // Live Clock Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('pt-BR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync with remote data when it changes, but allow local edits
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleUpdate = async (field: keyof ProjectionData | string, value: any) => {
    const newData = { ...data };
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      (newData as any)[parent][child] = value;
    } else {
      (newData as any)[field] = value;
    }
    setData(newData);
  };

  const saveToFirebase = async () => {
    setSaving(true);
    try {
      // Sync calculated fields before saving
      const dataToSave = {
        ...data,
        horaAtual: currentTime,
        vendaTotal: displayVendaTotal,
        conferenciaLinha: displayConferenciaLinha,
        cancelamentoComercial: { 
          ...data.cancelamentoComercial, 
          cenarioAtual: displayCenarioComercial,
          limite: calcLimiteComercial 
        },
        cancelamentoOperacional: { 
          ...data.cancelamentoOperacional, 
          cenarioAtual: displayCenarioOperacional,
          limite: calcLimiteOperacional 
        },
        upmEticos: { 
          ...data.upmEticos, 
          cenarioAtual: calcUPMEticos,
          limite: calcLimiteUPM
        },
        volumeDiario: {
          ...data.volumeDiario,
          limite: calcLimiteVolumeDiario,
          cenarioAtual: calcPrevisao.toString()
        },
        previsaoHora: calcPrevisao.toString()
      };
      await setDoc(doc(db, 'config', 'daily_projection'), dataToSave);
      alert('Alterações salvas com sucesso!');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'config/daily_projection');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const formatNumber = (val: number) => val.toLocaleString('pt-BR');

  // Calculated fields for display
  const displayVendaTotal = data.resumo1 + data.resumo2;
  const displayConferenciaLinha = data.resumo1;

  // Helper to parse percentage strings or numbers
  const parseValue = (val: string | number) => {
    if (typeof val === 'number') return val;
    return parseFloat(val.replace(',', '.').replace('%', '')) || 0;
  };

  // Row 1: Cancelamento Comercial
  const metaComercialNum = parseValue(data.cancelamentoComercial.meta) / 100;
  const calcCenarioComercial = displayVendaTotal > 0 
    ? ((data.cancelamentoComercial.valor / displayVendaTotal) * 100)
    : 0;
  const displayCenarioComercial = calcCenarioComercial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  const calcLimiteComercial = Math.round(metaComercialNum * displayVendaTotal);
  const statusComercial = calcCenarioComercial > (metaComercialNum * 100) ? 'Quebra' : 'OK';

  // Row 2: Cancelamento Operacional
  const metaOperacionalNum = parseValue(data.cancelamentoOperacional.meta) / 100;
  const calcCenarioOperacional = displayVendaTotal > 0 
    ? ((data.cancelamentoOperacional.valor / displayVendaTotal) * 100)
    : 0;
  const displayCenarioOperacional = calcCenarioOperacional.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  const calcLimiteOperacional = Math.round(metaOperacionalNum * displayVendaTotal);
  const statusOperacional = calcCenarioOperacional > (metaOperacionalNum * 100) ? 'Quebra' : 'OK';

  // Row 3: UPM Éticos
  const metaUPM = parseValue(data.upmEticos.meta);
  const calcUPMEticos = displayConferenciaLinha > 0 
    ? Math.round((data.upmEticos.valor / displayConferenciaLinha) * 1000000) 
    : 0;
  const calcLimiteUPM = Math.round((displayConferenciaLinha * metaUPM) / 1000000);
  const statusUPM = calcUPMEticos > metaUPM ? 'Quebra' : 'OK';

  // Volume Diário Calculations
  const calcLimiteVolumeDiario = data.otsPadrao > 0 ? Math.round(data.otsPadrao / 7) : 0;
  
  const getPrevisaoValor = () => {
    const now = new Date();
    const currentMinutes = now.getMinutes() || 1;
    return Math.round((data.volumeDiario.valor / currentMinutes) * 60);
  };

  const calcPrevisao = getPrevisaoValor();

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Projeção Diária</h2>
          <p className="text-slate-500 text-sm">Ajuste as metas e acompanhe os indicadores operacionais.</p>
        </div>
        <button 
          onClick={saveToFirebase}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Alterações
        </button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatInputCard label="Hora Atual" value={currentTime} disabled icon={Clock} type="text" />
        <StatInputCard label="Venda Total" value={displayVendaTotal} disabled icon={TrendingDown} />
        <StatInputCard label="Conferência Linha" value={displayConferenciaLinha} disabled icon={CheckCircle2} />
        <StatInputCard label="OT's Padrão" value={data.otsPadrao} onChange={v => handleUpdate('otsPadrao', Number(v))} icon={Target} />
      </div>

      {/* Summary Markers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-3xl p-8 text-center">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Indicador Base 1</label>
            <input 
                type="number" 
                value={data.resumo1} 
                onChange={e => handleUpdate('resumo1', Number(e.target.value))}
                className="bg-transparent text-5xl font-black text-white text-center w-full focus:outline-none"
            />
        </div>
        <div className="bg-slate-100 rounded-3xl p-8 text-center border border-slate-200">
            <label className="text-xs font-black text-red-400 uppercase tracking-widest block mb-2">Indicador Base 2</label>
            <input 
                type="number" 
                value={data.resumo2} 
                onChange={e => handleUpdate('resumo2', Number(e.target.value))}
                className="bg-transparent text-5xl font-black text-red-500 text-center w-full focus:outline-none"
            />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Indicador</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Meta</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Valor</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Cenário Atual</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Limite</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                <TableRow 
                    label="Cancelamento Comercial" 
                    data={data.cancelamentoComercial} 
                    calculatedCenario={displayCenarioComercial}
                    calculatedLimite={calcLimiteComercial}
                    calculatedStatus={statusComercial}
                    onUpdate={(f, v) => handleUpdate(`cancelamentoComercial.${f}`, v)} 
                />
                <TableRow 
                    label="Cancelamento Operacional" 
                    data={data.cancelamentoOperacional} 
                    calculatedCenario={displayCenarioOperacional}
                    calculatedLimite={calcLimiteOperacional}
                    calculatedStatus={statusOperacional}
                    onUpdate={(f, v) => handleUpdate(`cancelamentoOperacional.${f}`, v)} 
                />
                <TableRow 
                    label="UPM Éticos" 
                    data={data.upmEticos} 
                    calculatedCenario={calcUPMEticos}
                    calculatedLimite={calcLimiteUPM}
                    calculatedStatus={statusUPM}
                    onUpdate={(f, v) => handleUpdate(`upmEticos.${f}`, v)} 
                />
            </tbody>
        </table>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-4">Volume Diário</label>
              <div className="grid grid-cols-3 gap-4">
                  <div>
                      <span className="text-[10px] text-indigo-300 font-bold">META</span>
                      <input 
                        type="number" 
                        value={data.volumeDiario.meta} 
                        onChange={e => handleUpdate('volumeDiario.meta', Number(e.target.value))}
                        className="w-full bg-white border border-indigo-200 rounded-lg p-2 text-sm font-bold text-indigo-600 mt-1" 
                      />
                  </div>
                  <div>
                      <span className="text-[10px] text-indigo-300 font-bold">VALOR</span>
                      <input 
                        type="number" 
                        value={data.volumeDiario.valor} 
                        onChange={e => handleUpdate('volumeDiario.valor', Number(e.target.value))}
                        className="w-full bg-white border border-indigo-200 rounded-lg p-2 text-sm font-bold text-indigo-600 mt-1" 
                      />
                  </div>
                  <div>
                      <span className="text-[10px] text-indigo-300 font-bold">LIMITE</span>
                      <div className="w-full bg-indigo-100/50 border border-indigo-200 rounded-lg p-2 text-sm font-bold text-indigo-400 mt-1 h-9 flex items-center">
                        {calcLimiteVolumeDiario}
                      </div>
                  </div>
              </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-3xl">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Projeção</label>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-xl font-black text-blue-400">
                {calcPrevisao.toLocaleString('pt-BR')}
              </div>
          </div>

          <div className="flex items-center justify-center bg-white p-6 rounded-3xl border border-slate-100 italic text-slate-400 text-sm font-medium text-center">
              * Fórmulas automáticas baseadas nos valores de entrada
          </div>
      </div>
    </div>
  );
}

function StatInputCard({ label, value, onChange, icon: Icon, type = 'number', disabled = false }: any) {
    return (
        <div className={`p-6 rounded-3xl border border-slate-100 shadow-sm transition-all group ${disabled ? 'bg-slate-50 opacity-80' : 'bg-white hover:shadow-md'}`}>
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg transition-colors ${disabled ? 'bg-slate-100 text-slate-300' : 'bg-slate-50 text-slate-400 group-hover:text-blue-500'}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            </div>
            <input 
                type={type} 
                value={value} 
                disabled={disabled}
                onChange={e => onChange?.(e.target.value)}
                className={`text-2xl font-black w-full focus:outline-none p-0 bg-transparent ${disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-900'}`}
            />
        </div>
    );
}

function TableRow({ label, data, onUpdate, calculatedCenario, calculatedLimite, calculatedStatus }: any) {
    const isQuebra = calculatedStatus === 'Quebra';
    
    return (
        <tr className="hover:bg-slate-50/50 transition-colors">
            <td className="px-6 py-4">
                <span className="text-sm font-bold text-slate-700">{label}</span>
            </td>
            <td className="px-6 py-4">
                <input 
                    type="text" 
                    value={data.meta} 
                    onChange={e => onUpdate('meta', e.target.value)}
                    className="w-20 bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-xs font-bold text-slate-600"
                />
            </td>
            <td className="px-6 py-4">
                <input 
                    type="number" 
                    value={data.valor} 
                    onChange={e => onUpdate('valor', Number(e.target.value))}
                    className="w-24 bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-xs font-bold text-slate-600"
                />
            </td>
            <td className="px-6 py-4">
                <div className="w-20 bg-blue-50 border border-blue-100 rounded-lg p-1.5 text-xs font-black text-blue-600 text-center">
                    {calculatedCenario}
                </div>
            </td>
            <td className="px-6 py-4">
                <div className="w-24 bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-xs font-bold text-slate-500 text-center">
                    {calculatedLimite}
                </div>
            </td>
            <td className="px-6 py-4">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit ${
                    isQuebra 
                        ? 'bg-red-50 text-red-600 border border-red-100' 
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                }`}>
                    {isQuebra ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{calculatedStatus}</span>
                </div>
            </td>
        </tr>
    );
}
