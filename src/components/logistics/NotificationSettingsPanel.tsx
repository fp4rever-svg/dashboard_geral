import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  BellOff, 
  Check, 
  Copy, 
  AlertCircle, 
  Cpu, 
  ShieldAlert, 
  ExternalLink,
  Play,
  RotateCw
} from 'lucide-react';
import { FCMStatusType } from '../../hooks/useNotificationManager';

interface NotificationSettingsPanelProps {
  notificationPermission: NotificationPermission;
  notificationsEnabled: boolean;
  fcmStatus: FCMStatusType;
  fcmToken: string;
  statusMessage: string;
  toggleNotifications: () => void;
  requestNotificationPermission: () => void;
  triggerDelayedSimulation: (title: string, body: string, delayMs?: number) => void;
  recheckFcm: () => void;
}

export function NotificationSettingsPanel({
  notificationPermission,
  notificationsEnabled,
  fcmStatus,
  fcmToken,
  statusMessage,
  toggleNotifications,
  requestNotificationPermission,
  triggerDelayedSimulation,
  recheckFcm
}: NotificationSettingsPanelProps) {
  const [copied, setCopied] = useState(false);
  const [simulatedCount, setSimulatedCount] = useState(0);

  const handleCopy = () => {
    if (!fcmToken) return;
    navigator.clipboard.writeText(fcmToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulate = () => {
    setSimulatedCount(prev => prev + 1);
    triggerDelayedSimulation(
      `🔔 Monitoramento Crítico (Simulado #${simulatedCount + 1})`,
      'Atenção Gestor: Quebra crítica de meta detectada nos indicadores de Saúde Comercial/Operacional!',
      3000
    );
  };

  // Build beautiful status badges
  const getStatusBadge = () => {
    switch (fcmStatus) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-emerald-100 text-emerald-700 uppercase">
            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
            PUSH FCM ATIVO
          </span>
        );
      case 'iframe_blocked':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-amber-100 text-amber-700 uppercase">
            Notificador Local (Fallback)
          </span>
        );
      case 'checking':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-blue-100 text-blue-700 uppercase">
            <RotateCw className="w-3 h-3 animate-spin" />
            CONECTANDO...
          </span>
        );
      case 'unsupported':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-red-100 text-red-700 uppercase">
            NÃO SUPORTADO
          </span>
        );
      case 'denied':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-red-100 text-red-700 uppercase">
            BLOQUEADO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-slate-100 text-slate-500 uppercase">
            INATIVO
          </span>
        );
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
    >
      {/* Top Banner Stripe */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 px-6 py-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-black text-sm uppercase tracking-wider text-white">Central de Notificações Cloud & Push API</h3>
            <p className="text-xs text-blue-100 font-medium">Alertas inteligentes integrados ao Firebase Cloud Messaging (FCM) e sistema operacional</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge()}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Main controls row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Funcionamento do Sistema</h4>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                Sempre que a dashboard receber atualizações de dados que causem quebra de meta em nossos indicadores, o navegador enviará uma notificação nativa para a central de alertas do seu Mac, Windows, Linux ou Celular.
              </p>
            </div>

            {/* Config & Support indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Permissão do Navegador</span>
                <p className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${
                    notificationPermission === 'granted' ? 'bg-emerald-500' :
                    notificationPermission === 'denied' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  {notificationPermission === 'granted' ? 'Permitido (Granted)' :
                   notificationPermission === 'denied' ? 'Bloqueado (Denied)' : 'Não solicitado'}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Integração Remota</span>
                <p className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                  {fcmStatus === 'active' ? 'Token FCM Associado' : 'FCM em canal local'}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-4 bg-blue-50/40 rounded-2xl border border-blue-100/30">
              <div>
                <span className="block text-xs font-black text-blue-900 uppercase tracking-wider">Ativar Alertas Push</span>
                <span className="block text-[11px] text-slate-500 font-semibold mt-0.5">Autoriza o canal de notificações nativas da dashboard</span>
              </div>
              <button
                type="button"
                onClick={toggleNotifications}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notificationsEnabled ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl text-white space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Painel de Testes do Gestor</h4>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                Configure os alertas no modo de segundo plano. Agende uma simulação, minimize o navegador ou mude de aba e assista a notificação se estender fora do foco.
              </p>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleSimulate}
                  disabled={!notificationsEnabled}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-400 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all shadow-md active:scale-[0.98]"
                >
                  <Play className="w-4 h-4" />
                  Testar Alerta de 3 Segundos
                </button>
                <p className="text-[10px] text-slate-400 text-center font-bold">
                  {!notificationsEnabled ? '⚠️ Habilite os alertas acima para testar' : 'Dica: Clique para testar! (Simulador Ativo)'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sandbox explanation & Vapid Key Details inside expandable structure if FCM Token is generated or if in sandbox */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          {fcmStatus === 'iframe_blocked' && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/50 flex gap-3 text-amber-800">
              <ShieldAlert className="w-5.5 h-5.5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <h5 className="text-xs font-black uppercase tracking-wider text-amber-900">Privacidade do Iframe Sandbox Detectada</h5>
                <p className="text-xs leading-relaxed font-semibold mt-1">
                  Os navegadores modernos restringem o registro de Service Workers em sandboxes de iframes por motivos de segurança. 
                  Para testar em produção, abra a dashboard em uma aba separada. 
                  Enquanto isso, implementamos um <strong className="font-extrabold text-amber-950">Sistema de Observadores de Atualização Local</strong> que garante que você receba todos os popups de metas nativos quando a aba estiver em segundo plano!
                </p>
                <a 
                  href={window.location.href} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider mt-3.5 text-indigo-700 hover:text-indigo-800"
                >
                  Abrir em Nova Aba Externa
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {statusMessage && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {fcmToken && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Token de Dispositivo FCM (Seguro)</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-600 hover:text-indigo-700 uppercase"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado!' : 'Copiar Token'}
                </button>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-mono text-[10px] text-slate-600 overflow-x-auto select-all max-h-24 leading-relaxed">
                {fcmToken}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
