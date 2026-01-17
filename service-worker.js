// ============= StockPro Service Worker =============
const CACHE_NAME = 'stockpro-v1';
const OFFLINE_URL = '/mobile';

// Files to cache for offline
const STATIC_ASSETS = [
    '/mobile',
    '/mobile.html',
    '/mobile.css',
    '/mobile.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // API requests - network first, queue if offline
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    return response;
                })
                .catch((error) => {
                    // Queue for later sync if it's a mutation
                    if (event.request.method !== 'GET') {
                        return queueOfflineRequest(event.request);
                    }
                    // For GET, try cache
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Static assets - cache first
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Update cache in background
                fetch(event.request).then((response) => {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, response);
                    });
                });
                return cachedResponse;
            }

            return fetch(event.request).then((response) => {
                // Cache successful responses
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            }).catch(() => {
                // Offline fallback
                if (event.request.mode === 'navigate') {
                    return caches.match(OFFLINE_URL);
                }
            });
        })
    );
});

// Queue offline requests for background sync
async function queueOfflineRequest(request) {
    const data = await request.clone().json();

    // Store in IndexedDB for later sync
    const syncData = {
        url: request.url,
        method: request.method,
        body: data,
        timestamp: Date.now()
    };

    // Notify client about offline queue
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({
            type: 'OFFLINE_QUEUED',
            data: syncData
        });
    });

    return new Response(JSON.stringify({
        success: true,
        offline: true,
        message: 'Requête mise en file d\'attente pour synchronisation'
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

// Background sync
self.addEventListener('sync', (event) => {
    if (event.tag === 'stockpro-sync') {
        event.waitUntil(syncOfflineData());
    }
});

async function syncOfflineData() {
    // Notify clients to sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({ type: 'SYNC_REQUIRED' });
    });
}

// Push notifications for reminders
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};

    const options = {
        body: data.body || 'Rappel StockPro',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'stockpro-reminder',
        data: data
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'StockPro', options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/mobile')
    );
});

console.log('[SW] Service Worker loaded');
