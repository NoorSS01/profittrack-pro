// Service Worker for TransportPro PWA
// Version 2.0 - Enhanced for better auth handling
const CACHE_NAME = 'transportpro-v2';

// Resources to cache during install
const STATIC_CACHE = [
    '/',
    '/index.html',
    '/pwa-192x192.png',
    '/pwa-512x512.png'
];

// URLs that should NEVER be cached (auth, API, real-time)
const NO_CACHE_PATTERNS = [
    '/auth/',
    'supabase.co',
    '/rest/',
    '/realtime/',
    'token',
    'session',
    '/v1/'
];

// Check if request should skip cache
function shouldSkipCache(url) {
    return NO_CACHE_PATTERNS.some(pattern => url.includes(pattern));
}

// Install event - cache static resources
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing v2...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating v2...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('Service Worker: Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - network first for API, cache first for static
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // Skip cross-origin requests that aren't from our Supabase
    if (!url.startsWith(self.location.origin) && !url.includes('supabase')) {
        return;
    }

    // NEVER cache auth/API requests - always go to network
    if (shouldSkipCache(url)) {
        event.respondWith(
            fetch(event.request).catch(() => {
                // For auth failures, don't return cached response
                return new Response(JSON.stringify({ error: 'Network unavailable' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // For static resources: cache first, network fallback
    if (url.includes('.js') || url.includes('.css') || url.includes('.png') || url.includes('.ico')) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // For navigation requests: network first, cache fallback
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((cached) => {
                    return cached || caches.match('/');
                });
            })
    );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
