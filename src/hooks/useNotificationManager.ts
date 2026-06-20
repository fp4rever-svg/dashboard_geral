import { useState, useEffect, useRef } from 'react';
import { getFCM } from '../lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';

export type FCMStatusType = 'idle' | 'checking' | 'active' | 'denied' | 'iframe_blocked' | 'unsupported' | 'error';

const showDynamicInAppToast = (title: string, body: string) => {
  if (typeof document === 'undefined') return;
  
  let container = document.getElementById('in-app-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'in-app-toast-container';
    container.className = 'fixed top-4 right-4 z-[99999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl border border-slate-800 shadow-2xl pointer-events-auto flex items-start gap-4 transition-all duration-300 transform translate-x-12 opacity-0 font-sans';
  
  toast.innerHTML = `
    <div class="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl shrink-0 mt-0.5 border border-indigo-500/10">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between gap-2">
        <h5 class="text-[10px] font-black uppercase tracking-widest text-indigo-300">Notificação Push (Mock / Tab)</h5>
        <button class="text-slate-400 hover:text-white transition-colors cursor-pointer inline-flex p-0.5 rounded-lg hover:bg-white/10" onclick="this.parentElement.parentElement.parentElement.remove()">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      <p class="text-xs font-black text-white mt-1 leading-snug">${title}</p>
      <p class="text-[11px] text-slate-300 font-bold mt-1 leading-tight">${body}</p>
      <div class="mt-3 flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
        <span class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Canal Ativo</span>
        <span class="h-1 w-1 bg-slate-600 rounded-full"></span>
        <span>Gateway FCM</span>
      </div>
    </div>
  `;

  container.appendChild(toast);

  // Trigger animation after next tick
  setTimeout(() => {
    toast.className = 'bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl border border-slate-800 shadow-2xl pointer-events-auto flex items-start gap-4 transition-all duration-300 transform translate-x-0 opacity-100 font-sans';
  }, 50);

  // Auto-remove after 6 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.className = 'bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl border border-slate-800 shadow-2xl pointer-events-auto flex items-start gap-4 transition-all duration-300 transform translate-x-12 opacity-0 font-sans';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }
  }, 6000);
};

export function useNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [fcmStatus, setFcmStatus] = useState<FCMStatusType>('idle');
  const [fcmToken, setFcmToken] = useState<string>('');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('saudeNotificationsEnabled');
      return saved === 'true';
    } catch (_) {
      return false;
    }
  });
  const [statusMessage, setStatusMessage] = useState<string>('');
  const isMounted = useRef(true);

  // Sync notification permissions on mount
  useEffect(() => {
    isMounted.current = true;
    if ('Notification' in window) {
      setPermission(Notification.permission);
    } else {
      setFcmStatus('unsupported');
      setStatusMessage('Este navegador não suporta notificações de área de trabalho.');
    }
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Attempt to initialize FCM
  const initializeFCM = async () => {
    if (!('Notification' in window)) {
      setFcmStatus('unsupported');
      return;
    }

    setFcmStatus('checking');
    setStatusMessage('Verificando compatibilidade com Firebase Cloud Messaging...');

    try {
      const messaging = await getFCM();
      if (!messaging) {
        setFcmStatus('unsupported');
        setStatusMessage('FCM não é compatível com este navegador.');
        return;
      }

      // Check if registration is blocked by sandboxing
      if (window.self !== window.top) {
        // We are in an iframe. Service workers are blocked in sandboxed iframes by default.
        setFcmStatus('iframe_blocked');
        setStatusMessage('Iframe Sandbox: O registro de Service Worker para push FCM é restrito no preview do AI Studio. Utilizando canais de notificação locais do navegador como alternativa.');
        return;
      }

      // If notification permission is default, request it
      let currentPermission = Notification.permission;
      if (currentPermission === 'default') {
        currentPermission = await Notification.requestPermission();
        if (isMounted.current) setPermission(currentPermission);
      }

      if (currentPermission === 'denied') {
        setFcmStatus('denied');
        setStatusMessage('Permissão de notificações de navegador negada pelo usuário.');
        return;
      }

      // Try registering the service worker and getting the token
      // Using a standard public VAPID key placeholder. Managers can configure this.
      const vapidKey = 'BJuXvE-gUonw2V-P4YvR0B4WvP5Xl1q_X8V6Yn_E_f_gZ9_f_Z9Z9Z'; 
      
      const token = await getToken(messaging, { vapidKey });
      
      if (isMounted.current) {
        if (token) {
          setFcmToken(token);
          setFcmStatus('active');
          setStatusMessage('FCM integrado com sucesso! Token de registro gerado.');
        } else {
          setFcmStatus('error');
          setStatusMessage('Nenhum token FCM retornado. Verifique suas credenciais.');
        }
      }

      // Listen for foreground notifications
      onMessage(messaging, (payload) => {
        console.log('Mensagem FCM recebida em primeiro plano:', payload);
        // Show an in-browser custom alert/toast or system notification
        if (payload.notification) {
          triggerBrowserNotification(
            payload.notification.title || 'Alerta FCM',
            payload.notification.body || 'Nova atualização crítica recebida.'
          );
        }
      });

    } catch (err: any) {
      console.error('Erro na inicialização do FCM:', err);
      if (isMounted.current) {
        if (err.message && err.message.includes('sandbox')) {
          setFcmStatus('iframe_blocked');
          setStatusMessage('Iframe Sandbox: Não é possível registrar o Service Worker FCM dentro do iframe do AI Studio. O sistema utilizará notificações nativas do navegador como fallback automático.');
        } else {
          setFcmStatus('error');
          setStatusMessage(`FCM Status: ${err.message || 'Erro inesperado na conexão com FCM.'}`);
        }
      }
    }
  };

  // Trigger registration depending on settings & permissions
  useEffect(() => {
    if (notificationsEnabled) {
      if (Notification.permission === 'granted') {
        initializeFCM();
      } else if (Notification.permission === 'default') {
        requestNotificationPermission();
      }
    }
  }, [notificationsEnabled]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    try {
      const resp = await Notification.requestPermission();
      if (isMounted.current) {
        setPermission(resp);
        if (resp === 'granted' && notificationsEnabled) {
          initializeFCM();
        }
      }
    } catch (e) {
      console.error('Erro ao pedir permissão de notificações:', e);
    }
  };

  const toggleNotifications = () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    try {
      localStorage.setItem('saudeNotificationsEnabled', String(next));
    } catch (_) {}

    if (next && Notification.permission !== 'granted') {
      requestNotificationPermission();
    }
  };

  // Core helper to trigger native browser notification (especially useful in background/out of focus)
  const triggerBrowserNotification = (title: string, body: string, force: boolean = false) => {
    if (!notificationsEnabled) return;

    // Always trigger the in-app floating Toast (as a beautiful fallback, especially for iframe sandbox)
    showDynamicInAppToast(title, body);

    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    // Standard behavior: alert when tab is hidden, or if forced (for demonstration tests)
    if (document.hidden || force) {
      try {
        const options: NotificationOptions = {
          body: body,
          icon: '/favicon.ico', // fallback icon
          tag: 'saude-alert-critical',
          requireInteraction: true, // keeps notification active until user clicks it
          silent: false,
        };

        const notification = new Notification(title, options);
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (err) {
        console.warn('Falha ao instanciar notificação nativa do navegador:', err);
      }
    }
  };

  // Simulated background push sender (runs with 3-second delay, so managers can minimize and test)
  const triggerDelayedSimulation = (title: string, body: string, delayMs: number = 3000) => {
    if (!notificationsEnabled) {
      toggleNotifications();
    }

    setTimeout(() => {
      triggerBrowserNotification(title, body, true); // true forces trigger even if document is visible
    }, delayMs);
  };

  return {
    permission,
    notificationsEnabled,
    fcmStatus,
    fcmToken,
    statusMessage,
    toggleNotifications,
    requestPermission: requestNotificationPermission,
    triggerBrowserNotification,
    triggerDelayedSimulation,
    recheckFcm: initializeFCM,
  };
}
