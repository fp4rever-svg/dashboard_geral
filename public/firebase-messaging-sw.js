// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Real initialization using actual Firebase Config
firebase.initializeApp({
  apiKey: "AIzaSyD-hmnx3yMOaY9FeF9rNKmhMYkI3Y7qtKc",
  authDomain: "generated-envoy-q07pf.firebaseapp.com",
  projectId: "generated-envoy-q07pf",
  storageBucket: "generated-envoy-q07pf.firebasestorage.app",
  messagingSenderId: "964751365274",
  appId: "1:964751365274:web:74683f7d0d14b2154e7b23"
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
