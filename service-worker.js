// RAFT PWA Service Worker
// Enables offline support, caching, and background sync

const CACHE_NAME = 'raft-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=Instrument+Sans:wght@300;400;500;600;700&display=swap'
];

// Install: cache essential assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.log('Cache addAll error (expected if offline):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first for static assets, network-first for data
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests and non-GET
  if (url.origin !== location.origin || request.method !== 'GET') {
    return;
  }

  // Static assets: cache-first
  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'font') {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request).then(resp => {
          if (!resp || resp.status !== 200) return resp;
          const cache = caches.open(CACHE_NAME);
          cache.then(c => c.put(request, resp.clone()));
          return resp;
        });
      }).catch(() => new Response('Offline', { status: 503 }))
    );
    return;
  }

  // API calls: network-first, fall back to cache
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.status === 200) {
          caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request) || new Response('Offline', { status: 503 });
      })
  );
});
