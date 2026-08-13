// Unified Service Worker for banmao.fun
// Consolidates: sw-main, sw-hub, sw-gamefi, sw-rps, sw-snake, and collection cache
// Single SW reduces Google Safe Browsing suspicion from multiple SW files

const CACHE_VERSION = 'v3';
const MAIN_CACHE = `banmao-main-${CACHE_VERSION}`;
const STATIC_CACHE = `banmao-static-${CACHE_VERSION}`;
const COLLECTION_CACHE = `banmao-collection-${CACHE_VERSION}`;

// Cloudinary thumbnail pattern (from old sw.js collection cache)
const CLOUDINARY_THUMB = /res\.cloudinary\.com.*\/image\/upload\/c_fill,w_400,h_400,f_auto,q_auto/;

// Assets to precache on install
const PRECACHE_ASSETS = [
    '/',
    '/manifest.json',
    '/pwa/main/icon-192x192.png',
    '/pwa/main/icon-512x512.png',
    '/gamefi',
    '/pwa/gamefi/gamefi-icon-192x192.png',
    '/pwa/gamefi/gamefi-icon-512x512.png',
    '/gamefi/banmaorps',
    '/games/rps/rps-icon-192x192.png',
    '/games/rps/rps-icon-512x512.png',
    '/games/rps/logo.jpg',
    '/gamefi/banmaosnake',
    '/games/snake/snake-icon-96x96.png',
    '/games/snake/snake-icon-192x192.png',
    '/games/snake/snake-icon-512x512.png',
];

// ─── Install ───────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Precaching static assets');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch((err) => console.error('[SW] Precache failed:', err))
    );
});

// ─── Activate ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    const VALID_CACHES = [MAIN_CACHE, STATIC_CACHE, COLLECTION_CACHE];
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name.startsWith('banmao-') && !VALID_CACHES.includes(name))
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// ─── Push Notifications (from sw-hub.js) ───────────────────
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || '🐱 BanmaoHub';
    const options = {
        body: data.body || 'You have a new notification',
        icon: '/banmao-icon-192.png',
        badge: '/banmao-icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/collection',
        },
        actions: data.actions || [],
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// ─── Notification Click ────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/collection';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if (client.url.includes('/collection') && 'focus' in client) {
                    return client.focus();
                }
            }
            return self.clients.openWindow(url);
        })
    );
});

// ─── Fetch: Route-Based Caching ────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET
    if (request.method !== 'GET') return;

    // Skip non-http(s) (e.g. chrome-extension://)
    if (!url.protocol.startsWith('http')) return;

    // ── Cloudinary thumbnail cache (cache-first) ──
    if (CLOUDINARY_THUMB.test(request.url)) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
                        return response;
                    }
                    const clone = response.clone();
                    caches.open(COLLECTION_CACHE).then((cache) => cache.put(request, clone));
                    return response;
                }).catch(() => new Response());
            })
        );
        return;
    }

    // Skip external hosts for remaining strategies
    if (url.hostname !== self.location.hostname) return;

    // ── Determine fallback page based on pathname ──
    let fallbackPage = '/';
    if (url.pathname.startsWith('/gamefi/banmaosnake')) fallbackPage = '/gamefi/banmaosnake';
    else if (url.pathname.startsWith('/gamefi/banmaorps')) fallbackPage = '/gamefi/banmaorps';
    else if (url.pathname.startsWith('/gamefi')) fallbackPage = '/gamefi';

    // ── Navigation requests: network-first with cache fallback ──
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(MAIN_CACHE).then((cache) => cache.put(request, clone));
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then((cached) => {
                        return cached || caches.match(fallbackPage);
                    });
                })
        );
        return;
    }

    // ── Static assets: cache-first with background refresh ──
    if (
        request.destination === 'image' ||
        request.destination === 'font' ||
        request.destination === 'style' ||
        request.destination === 'script'
    ) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) {
                    // Stale-while-revalidate: serve cache, update in background
                    fetch(request)
                        .then((response) => {
                            caches.open(STATIC_CACHE).then((cache) => cache.put(request, response));
                        })
                        .catch(() => { });
                    return cached;
                }

                return fetch(request).then((response) => {
                    const clone = response.clone();
                    caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
                    return response;
                });
            })
        );
        return;
    }

    // ── Everything else: network-first ──
    event.respondWith(
        fetch(request)
            .then((response) => response)
            .catch(() => caches.match(request))
    );
});

// ─── Message Handler ───────────────────────────────────────
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
