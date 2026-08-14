const CACHE_NAME = 'pfh-v6';

// 1. Install Event (Instant Takeover)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Activate Event (Fixed clients.claim)
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

// 3. Fetch Event (Safe HTTP/HTTPS only bypass)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests with HTTP/HTTPS (Avoid chrome-extension:// & POST requests)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});