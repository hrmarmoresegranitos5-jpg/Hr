// firebase-messaging-sw.js
// Service worker dedicado ao Firebase Cloud Messaging.
// Precisa ficar na RAIZ do site (mesmo nível do index.html) pra funcionar.
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Mesmos valores de FCM_CFG do app-core.js — mantenha os dois em sincronia.
firebase.initializeApp({
  apiKey: "AIzaSyCplqbYAl1eOKbNnM9rqHmDa47zB4ec9hQ",
  authDomain: "orcamento-hr-marmoraria.firebaseapp.com",
  projectId: "orcamento-hr-marmoraria",
  messagingSenderId: "450670328636",
  appId: "1:450670328636:web:a673a81c755436dccd7c39"
});

var messaging = firebase.messaging();

// Dispara a notificação do sistema quando o app está fechado/em background.
messaging.onBackgroundMessage(function(payload) {
  var n = payload.notification || {};
  var title = n.title || 'HR Mármores';
  var options = {
    body: n.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: (payload.data && payload.data.tag) || 'hr-boleto',
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});

// Ao tocar na notificação, abre/foca o app
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
