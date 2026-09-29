// Service Worker dedicado para Firebase Cloud Messaging (FCM) em segundo plano
// Marsil-Boraceia Estoque PWA

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: "gen-lang-client-0142154315",
  appId: "1:708064890647:web:f5f07632600225e4513152",
  apiKey: "AIzaSyCS3f_2jggiAvez5S7vqq4x5p24JFAM4i8",
  authDomain: "gen-lang-client-0142154315.firebaseapp.com",
  messagingSenderId: "708064890647"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Notificação Push recebida em segundo plano:', payload);

  const title = payload.notification?.title || payload.data?.title || '📦 Catálogo Marsil Atualizado!';
  const options = {
    body: payload.notification?.body || payload.data?.body || 'Novo estoque disponível. Abra para conferir os itens!',
    icon: '/pwa-192x192.png',
    badge: '/favicon.ico',
    tag: 'marsil-catalog-update',
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: payload.data?.url || '/',
      lastUpdated: payload.data?.lastUpdated || new Date().toISOString()
    }
  };

  self.registration.showNotification(title, options);
});

// Abertura ou foco na janela quando o vendedor clica na notificação push
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se houver uma janela aberta, foca nela e envia evento para recarregar
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'FCM_CATALOG_REFRESH',
            lastUpdated: event.notification.data?.lastUpdated
          });
          return client.focus();
        }
      }

      // Se não houver janela aberta, abre a aplicação
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
