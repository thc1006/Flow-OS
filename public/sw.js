/* eslint-env serviceworker */
const STATIC_CACHE = 'flow-os-static-v2';
const RUNTIME_CACHE = 'flow-os-runtime-v2';

const STATIC_ASSETS = ['/', '/manifest.json'];

const RUNTIME_CACHE_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter(
            (name) =>
              name.startsWith('flow-os-') && name !== STATIC_CACHE && name !== RUNTIME_CACHE
          )
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.protocol === 'chrome-extension:') return;
  if (url.pathname.startsWith('/_vite') || url.pathname.startsWith('/@vite')) return;
  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  try {
    if (isStaticAsset(url.pathname)) return await cacheFirst(request);
    if (isCDNResource(url.href)) return await staleWhileRevalidate(request);
    return await networkFirst(request);
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.headers.get('accept')?.includes('text/html')) {
      const offline = await caches.match('/');
      if (offline) return offline;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached || (await fetchPromise);
}

function isStaticAsset(pathname) {
  return (
    STATIC_ASSETS.includes(pathname) ||
    /\.(js|css|png|jpe?g|gif|svg|ico|webp|woff2?)$/.test(pathname)
  );
}

function isCDNResource(url) {
  return RUNTIME_CACHE_PATTERNS.some((pattern) => pattern.test(url));
}

self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'CLAIM_CLIENTS':
      self.clients.claim();
      break;
    case 'CACHE_RESOURCES':
      event.waitUntil(
        caches.open(RUNTIME_CACHE).then((cache) => cache.addAll(data?.urls || []))
      );
      break;
    case 'CLEAR_CACHE':
      event.waitUntil(caches.delete(data?.cacheName || RUNTIME_CACHE));
      break;
  }
});
