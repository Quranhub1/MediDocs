const CACHE_NAME = 'medidocs-v7';
const RUNTIME_CACHE_NAME = 'medidocs-runtime-v1';
const IMAGE_CACHE_NAME = 'medidocs-images-v2';
const DOCUMENTS_CACHE_NAME = 'medidocs-documents-v2';
const API_CACHE_NAME = 'medidocs-api-v2';

// Keep this list limited to files that are actually served from /public.
// CRA puts the compiled JS/CSS bundles under /static/ at build time.
const APP_SHELL = [
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
  '/favicon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const keep = [
    CACHE_NAME,
    RUNTIME_CACHE_NAME,
    IMAGE_CACHE_NAME,
    DOCUMENTS_CACHE_NAME,
    API_CACHE_NAME
  ];

  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => !keep.includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

const isSameOrigin = (url) => url.origin === self.location.origin;
const isImage = (url) => /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(url.pathname);
const isStaticAsset = (url) =>
  url.pathname.startsWith('/static/') || /\.(css|js|woff2?|ttf|otf)$/i.test(url.pathname);
const isApiRequest = (url) => url.pathname.startsWith('/api/');

// Network-first navigation keeps content fresh while allowing the installed
// app to open when the device is offline.
const navigationResponse = async (request) => {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return (await caches.match(request)) || (await caches.match('/index.html'));
  }
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || !isSameOrigin(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            caches.open(API_CACHE_NAME)
              .then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (isImage(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok) {
            caches.open(IMAGE_CACHE_NAME)
              .then((cache) => cache.put(request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok) {
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
