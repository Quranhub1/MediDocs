const CACHE_NAME = 'medidocs-v7';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-96x96.png',
  '/favicon-128x128.png',
  '/favicon-144x144.png',
  '/favicon-152x152.png',
  '/favicon-192x192.png',
  '/favicon-384x384.png',
  '/favicon-512x512.png',
  '/index.css',
  '/App.css',
  '/src/App.js',
  '/src/index.js',
  '/scripts/check-secrets.sh'
];

const API_CACHE_NAME = 'medidocs-api-v1';
const API_CACHE_PATTERNS = ['/api/'];

const IMAGE_CACHE_NAME = 'medidocs-images-v1';
const IMAGE_CACHE_PATTERNS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

const DOCUMENTS_CACHE_NAME = 'medidocs-documents-v1';

const AVATAR_CACHE_NAME = 'medidocs-avatars-v1';

// Core page cache for navigation
const CORE_PAGES = [
  '/',
  '/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(STATIC_ASSETS))
        .then(() => self.skipWaiting()),
      
      caches.open(API_CACHE_NAME),
      caches.open(IMAGE_CACHE_NAME),
      caches.open(DOCUMENTS_CACHE_NAME),
      caches.open(AVATAR_CACHE_NAME)
    ])
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (![CACHE_NAME, API_CACHE_NAME, IMAGE_CACHE_NAME, DOCUMENTS_CACHE_NAME, AVATAR_CACHE_NAME].includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  // Strategy: Network first for critical pages, fallback to cache
  if (CORE_PAGES.includes(url.pathname) || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, responseToCache));
          }
          return response;
        })
        .catch(() => caches.match(url.pathname === '/' ? '/' : '/index.html'))
    );
    return;
  }

  // Strategy: Network first for API calls, fallback to cache
  if (API_CACHE_PATTERNS.some(pattern => url.pathname.startsWith(pattern))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(API_CACHE_NAME)
              .then((cache) => cache.put(request, responseToCache));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || new Response(
              JSON.stringify({ error: 'API unavailable', offline: true }),
              {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // Strategy: Cache first for images, network fallback
  if (IMAGE_CACHE_PATTERNS.some(pattern => url.pathname.includes(pattern))) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((response) => {
            if (response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(IMAGE_CACHE_NAME)
                .then((cache) => cache.put(request, responseToCache));
            }
            return response;
          });
        })
    );
    return;
  }

  // Strategy: Stale-while-revalidate for static assets
  if (url.pathname.startsWith('/static/') || url.pathname.includes('.css') || url.pathname.includes('.js')) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((response) => {
            if (response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(request, responseToCache));
            }
            return response;
          });
        })
    );
    return;
  }

  // Default: Network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, responseToCache));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
