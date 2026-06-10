import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotificationManager } from '../../hooks/useNotificationManager';
import { NotificationSettingsPanel } from '../logistics/NotificationSettingsPanel';
import { 
  Volume2, 
  VolumeX, 
  Settings, 
  Bell, 
  Info, 
  ShieldCheck, 
  HelpCircle,
  Volume1,
  Sparkles
} from 'lucide-react';

export function AdminSettingsView() {
  const {
    permission: notificationPermission,
    notificationsEnabled,
    fcmStatus,
    fcmToken,
    statusMessage,
    toggleNotifications,
    requestPermission: requestNotificationPermission,
    triggerDelayedSimulation,
    recheckFcm
  } = useNotificationManager();

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('saudeSoundAlert');
      return saved !== 'false';
    } catch (_) {
      return true;
    }
  });

  const [testSuccess, setTestSuccess] = useState(false);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('saudeSoundAlert', String(next));
  };

  const playSoftChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Soft, harmonious pentatonic high-end chime
      const notes = [659.25, 880, 1109.73, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        
        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.05, now + idx * 0.08 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.75);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.85);
      });

      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 2000);
    } catch (e) {
      console.error("Browser audio could not play:", e);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Configuration Header Card */}
      <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </span>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Painel Administrativo</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight uppercase">Configurações de Sistemas & Alertas</h2>
          <p className="text-slate-400 text-xs font-semibold max-w-xl">
            Gerencie as permissões e parâmetros do sistema de monitoramento de saúde operacional, incluindo notificações via canais de som secundários e gateway unificados de Cloud Push FCM.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl shrink-0 z-10 self-start md:self-center">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider">Acesso de Gestão</span>
            <span className="text-xs font-bold text-slate-200">Administrador Autenticado</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* 1. Notifications Setup Panel (FCM) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Bell className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Central de Notificações Cloud & Push API</h3>
          </div>
          
          <NotificationSettingsPanel
            notificationPermission={notificationPermission}
            notificationsEnabled={notificationsEnabled}
            fcmStatus={fcmStatus}
            fcmToken={fcmToken}
            statusMessage={statusMessage}
            toggleNotifications={toggleNotifications}
            requestNotificationPermission={requestNotificationPermission}
            triggerDelayedSimulation={triggerDelayedSimulation}
            recheckFcm={recheckFcm}
          />
        </div>

        {/* 2. Sound Monitor Options Panel */}
        <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Volume2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Configuração do Canal de Alerta Sonoro</h3>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-5 p-5 bg-slate-50 rounded-2xl border border-slate-150 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-500 h-full" />
            
            <div className="flex items-center gap-3.5 pl-2">
              <div className={`p-3 rounded-2xl flex items-center justify-center transition-all shadow-inner ${
                soundEnabled ? 'bg-emerald-50/80 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}>
                {soundEnabled ? <Volume2 className="w-5.5 h-5.5 animate-pulse" /> : <VolumeX className="w-5.5 h-5.5" />}
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 leading-none flex flex-wrap items-center gap-2">
                  Monitoramento de Alerta Sonoro
                  {soundEnabled ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest bg-emerald-100 text-emerald-650 uppercase">
                      <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
                      Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest bg-slate-100 text-slate-500 uppercase">
                      Inativo
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-500 font-extrabold tracking-wider mt-2 max-w-lg leading-relaxed">
                  {soundEnabled 
                    ? "Um sino sonoro harmonioso tocará automaticamente na central sempre que houver quebras de metas operacionais (comercial, operacional ou UPM) para alertar os gestores." 
                    : "Os alertas sonoros automáticos estão silenciados. Ative a cauda sonora para receber instruções auditivas em tempo real no monitor de TV."}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5 shrink-0 w-full lg:w-auto justify-end">
              <button
                type="button"
                onClick={toggleSound}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                  soundEnabled 
                    ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-650' 
                    : 'bg-emerald-500 hover:bg-emerald-600 border-transparent text-white shadow-md'
                }`}
              >
                {soundEnabled ? 'Desativar Som' : 'Ativar Alerta Sonoro'}
              </button>
              
              <button
                type="button"
                onClick={playSoftChime}
                className={`px-4 py-2.5 border rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  testSuccess 
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700' 
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {testSuccess ? (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                    Sucesso!
                  </>
                ) : (
                  <>
                    <Volume1 className="w-4 h-4" />
                    Testar Volume
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Help / Tips area */}
        <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="block text-[10px] font-black uppercase text-indigo-700 tracking-wider">Como funciona o Alerta de Meta?</span>
            <p className="text-xs text-indigo-950 font-medium leading-relaxed">
              O sistema verifica continuamente as projeções atualizadas de cancelamento (operacional/comercial) e unidades por homem-hora (UPM). Sempre que algum indicador exceder a margem admissível, o sistema utiliza o canal de push do navegador no plano secundário, e emite o aviso audível se a caixa sonora estiver ligada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
