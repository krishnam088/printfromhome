const CACHE_NAME = 'pfh-offline-v14';

// 0. Firebase Background Push Messaging Integration
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_FIREBASE_AUTH_DOMAIN",
  projectId: "YOUR_FIREBASE_PROJECT_ID",
  storageBucket: "YOUR_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "YOUR_FIREBASE_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID"
});

const messaging = firebase.messaging();

// Background message handler (Jab app band ya background mein ho)
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/app_icon_192.png',
    badge: '/app_icon_192.png',
    tag: 'print-from-home-alert',
    requireInteraction: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 1. Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

// 2. Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => clients.claim())
  );
});

// 3. Clean Fetch Event (No forced redirects & safe response fallbacks)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // 🛑 CRITICAL FIX: Bypass all API requests completely so they never hit service worker caching/response errors
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/api/')) {
    return;
  }

  // Admin routes
  if (url.pathname.includes('/admin')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request) || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } }))
    );
    return;
  }

  // Standard cache-first or network fallback for normal assets/pages with safe Response fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } }));
    })
  );
});

// 4. Background Sync Event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-print-orders') {
    event.waitUntil(Promise.resolve());
  }
});

// 5. Periodic Background Sync Event
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-store-status') {
    event.waitUntil(Promise.resolve());
  }
});

// 6. Web Push Notifications Event
self.addEventListener('push', (event) => {
  let data = { title: 'Print From Home', body: 'New update regarding your print order!' };
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data.body = event.data.text(); }
  }
  const options = {
    body: data.body,
    icon: '/app_icon_192.png',
    badge: '/app_icon_192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 7. Notification Click Event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});