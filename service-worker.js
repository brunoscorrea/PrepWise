/* Offline-first service worker for PrepWise.

   CACHE_VERSION: the deploy workflow (scripts/build-pages.js) replaces it with
   "v<APP_VERSION>-<content hash>", so every deployment that changes an app file
   gets a new cache automatically. Locally it is just the app version.

   Caches are named per site path ("prepwise:/PrepWise/:v…"), so two copies of
   PrepWise on the same origin (for example brunoscorrea.github.io/m365-study-tracker/
   and brunoscorrea.github.io/PrepWise/) never delete each other's caches. The
   name deliberately doesn't start with "prepwise-": v2.2 and earlier delete every
   "prepwise-*" cache that isn't their own when they activate. */
const CACHE_VERSION = 'v2.4.0';
const SCOPE = new URL(self.registration.scope).pathname; // e.g. "/PrepWise/"
const CACHE_PREFIX = `prepwise:${SCOPE}:`;
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
// Caches written by earlier versions. Removed only if they hold files from THIS site path.
const LEGACY_PREFIXES = ['prepwise-', 'm365-study-tracker-'];
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './quiz-centre.js',
  './js/schema.js',
  './js/profiles.js',
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
  './certifications/ai-103/meta.js',
  './certifications/ai-103/questions-d1.js',
  './certifications/ai-103/questions-d2.js',
  './certifications/ai-103/questions-d3.js',
  './certifications/ai-103/questions-d4.js',
  './certifications/ai-103/questions-d5.js',
  './certifications/ai-103/profile.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

// Fetch every file from the network, bypassing the browser's HTTP cache
// (GitHub Pages sends Cache-Control: max-age=600) and the CDN (version query),
// so a new version can never be cached with files from the previous one.
async function precache() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(APP_SHELL.map(async (path) => {
    const url = new URL(path, self.registration.scope);
    url.searchParams.set('v', CACHE_VERSION);
    const res = await fetch(new Request(url, { cache: 'reload' }));
    if (!res.ok) throw new Error(`Precache failed for ${path}: ${res.status}`);
    await cache.put(new URL(path, self.registration.scope).href, res);
  }));
}

async function cleanUp() {
  const keys = await caches.keys();
  await Promise.all(keys.map(async (k) => {
    if (k === CACHE_NAME) return;
    if (k.startsWith(CACHE_PREFIX)) { await caches.delete(k); return; }
    if (LEGACY_PREFIXES.some((p) => k.startsWith(p))) {
      const reqs = await (await caches.open(k)).keys();
      if (reqs.some((r) => new URL(r.url).pathname.startsWith(SCOPE))) await caches.delete(k);
    }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(cleanUp().then(() => self.clients.claim()));
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch course sites or other origins
  if (!url.pathname.startsWith(SCOPE)) return;      // never touch other sites on this origin

  // Page navigations: serve the cached shell, so the app opens offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then((c) => c.match(new URL('./index.html', self.registration.scope).href))
        .then((cached) => cached || fetch(req))
        .catch(() => caches.open(CACHE_NAME).then((c) => c.match(new URL('./index.html', self.registration.scope).href)))
    );
    return;
  }

  // Static assets: this version's cache first, then network (and cache the result).
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => cache.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
        return res;
      });
    }))
  );
});
