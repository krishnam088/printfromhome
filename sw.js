const CACHE_NAME = 'pfh-v3';

// Network-First Strategy: Pehle live server se latest data layega,
// agar internet offline ho tabhi cache use karega.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});