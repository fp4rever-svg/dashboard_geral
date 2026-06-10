// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Standard initialization to ensure registration initializes without failing on empty keys
firebase.initializeApp({
  apiKey: "placeholder-api-key",
  authDomain: "placeholder-auth-domain",
  projectId: "placeholder-project-id",
  storageBucket: "placeholder-storage-bucket",
  messagingSenderId: "placeholder-sender-id",
  appId: "placeholder-app-id"
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensagem recebida em segundo plano: ', payload);
  
  const notificationTitle = payload.notification?.title || 'Atualização Crítica!';
  const notificationOptions = {
    body: payload.notification?.body || 'Há novos alertas críticos nos indicadores de Saúde da Operação.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'critical-alert-logistics',
    requireInteraction: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
