/* Retires the old PrepWise service worker at /m365-study-tracker/.
   Browsers that have the old app installed fetch this file on their next visit
   (a service worker script always bypasses the HTTP cache). It then:
   1. takes over immediately,
   2. deletes the old site's caches — only caches holding files from THIS path,
      so the new site's caches at /PrepWise/ are never touched,
   3. unregisters itself, and
   4. sends any open old-app windows to the new address.
   localStorage (profiles and progress) is not touched: it is shared by both
   addresses because they are on the same origin. */
const SCOPE = new URL(self.registration.scope).pathname; // "/m365-study-tracker/"
const NEW_HOME = new URL('../PrepWise/', self.registration.scope).href;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      const reqs = await (await caches.open(key)).keys();
      if (reqs.length && reqs.every((r) => new URL(r.url).pathname.startsWith(SCOPE))) await caches.delete(key);
    }
    await self.clients.claim();
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) {
      const hash = new URL(client.url).hash;
      try { await client.navigate(NEW_HOME + hash); } catch (e) { /* the page's own redirect handles it */ }
    }
  })());
});

// No fetch handler: requests go straight to the network (the redirect page).
