const ADMIN_CACHE = 'pfh-admin-cache-v1';

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== ADMIN_CACHE) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);

    // 🛑 CRITICAL FIX: Bypass all API requests so they never hit service worker caching errors
    if (url.pathname.startsWith('/api/')) {
        return; 
    }

    if (url.pathname.includes('/admin')) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            return cached || fetch(event.request).catch(() => new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } }));
        })
    );
});