/* Offline-first service worker for PrepWise.
   Bump CACHE_VERSION whenever you change any app file so installed apps pick up the update. */
const CACHE_VERSION = 'v2.1.0';
const CACHE_PREFIX = 'prepwise-';
const LEGACY_PREFIX = 'm365-study-tracker-'; // v1 caches, removed on activate
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './quiz-centre.js',
  './js/schema.js',
  './js/certs.js',
  './js/revision.js',
  './certifications/ab-650/meta.js',
  './certifications/ab-650/questions-d1.js',
  './certifications/ab-650/questions-d2.js',
  './certifications/ab-650/questions-d3.js',
  './certifications/ab-650/profile.js',
  './certifications/sc-300/meta.js',
  './certifications/sc-300/questions-d1.js',
  './certifications/sc-300/questions-d2.js',
  './certifications/sc-300/questions-d3.js',
  './certifications/sc-300/questions-d4.js',
  './certifications/sc-300/profile.js',
  './certifications/md-102/meta.js',
  './certifications/md-102/questions-d1.js',
  './certifications/md-102/questions-d2.js',
  './certifications/md-102/questions-d3.js',
  './certifications/md-102/questions-d4.js',
  './certifications/md-102/questions-d5.js',
  './certifications/md-102/profile.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => (k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME) || k.startsWith(LEGACY_PREFIX))
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch course sites or other origins

  // Page navigations: serve the cached shell, so the app opens offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => cached || fetch(req))
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static assets: cache first, then network (and cache the result).
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
