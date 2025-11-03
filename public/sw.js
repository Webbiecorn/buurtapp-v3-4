// Buurtconcierge SW v3: voorkom stale index.html waardoor hashed bundles 404’en en HTML teruggeven
const CACHE_VERSION = 'v3';
const CACHE_NAME = `buurtconcierge-v3-4-cache-${CACHE_VERSION}`;

// Alleen echt statische assets pre-cachen (geen index.html, die doen we network-first)
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  // Neem direct controle na update
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
      // Claim controle zodat nieuwe SW direct requests afhandelt
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Voor navigations (documenten): network-first om altíjd de nieuwste index.html te krijgen
  if (req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          return fresh;
        } catch (err) {
          // Offline fallback naar cache root of index
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match('/') || await cache.match('/index.html');
          return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  // Voor hashed app bundles: cache-first met netwerkmiss fallback
  if (new URL(req.url).pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((resp) => {
          // Alleen cache als 200 en type basic
          if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, respClone));
          return resp;
        });
      })
    );
    return;
  }

  // Overig: probeer cache, anders netwerk
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
