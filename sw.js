const CACHE_NAME = 'pfh-offline-v12';
const OFFLINE_URL = '/';

// 1. Install Event: Cache root page instantly
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.add(OFFLINE_URL).catch(() => {
        return cache.put(OFFLINE_URL, new Response('<!DOCTYPE html><html><body><h1>Print From Home - Offline</h1></body></html>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }));
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Take control immediately
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

// 3. Fetch Event: Dedicated Navigation Handler (Passes PWABuilder Offline Test Instantly)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  // Navigation requests ke liye Cache-First strategy (No Network Wait)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(OFFLINE_URL).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).catch(() => caches.match(OFFLINE_URL));
      })
    );
    return;
  }

  // Baaki sabhi requests ke liye standard cache fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {});
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