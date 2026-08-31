const CACHE = 'daylight-v5';
const SCOPE = self.registration.scope;
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './cloud.js',
  './auth.js',
  './variant-sunrise.html',
  './variant-midnight.html',
  './variant-cream.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon-180.png',
  './previews/preview-sunrise.png',
  './previews/preview-midnight.png',
  './previews/preview-cream.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        const copy = res.clone();
        if (res.ok && url.pathname.startsWith(new URL(SCOPE).pathname)) {
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match(new URL('variant-sunrise.html', SCOPE)));
    })
  );
});
