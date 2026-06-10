import { useState, useEffect, useRef } from 'react';
import { getFCM } from '../lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';

export type FCMStatusType = 'idle' | 'checking' | 'active' | 'denied' | 'iframe_blocked' | 'unsupported' | 'error';

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
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (!notificationsEnabled) return;

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
    if (!('Notification' in window)) {
      alert('Seu navegador não suporta notificações de desktop.');
      return;
    }
    if (Notification.permission !== 'granted') {
      requestNotificationPermission();
      return;
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
