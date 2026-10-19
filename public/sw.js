/* Service Worker — Library POS
 *
 * Reglas de red (ver docs/agent/traps.md):
 *  - /config.js : SIEMPRE red. Es inyectado en runtime por entrypoint.sh con
 *    VITE_API_BASE_URL; cachearlo dejaría una URL de API vieja para siempre.
 *  - /api/* y /health : SIEMPRE red.
 *  - Navegaciones (HTML): network-first con fallback a cache — si el servidor
 *    duerme (App Sleep) o no hay red, la app abre igual con el cache.
 *  - Assets estáticos same-origin (JS/CSS/img hasheados): cache-first.
 *  - Todo lo demás (POST, otros orígenes): sin intercepción.
 *
 * Actualización: el SW nuevo queda en `waiting` hasta que el usuario acepta
 * actualizar (mensaje 'SKIP_WAITING' desde la UI). Así nunca se recarga la
 * app en medio de una venta.
 */

const SHELL_CACHE = 'pos-shell-v1';
const STATIC_CACHE = 'pos-static-v1';
const CACHES = [SHELL_CACHE, STATIC_CACHE];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.add('/'))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => !CACHES.includes(key)).map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Nunca interceptar: config de runtime, API, health. Pasan directo a red.
  if (url.pathname === '/config.js') return;
  if (url.pathname === '/health') return;
  if (url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
    return;
  }
  event.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = await fetch(req);
    if (fresh.ok) await cache.put('/', fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match('/');
    if (cached) return cached;
    throw new Error('offline-sin-cache');
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const fresh = await fetch(req);
  if (fresh.ok) {
    const cache = await caches.open(STATIC_CACHE);
    await cache.put(req, fresh.clone());
  }
  return fresh;
}
