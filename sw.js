/**
 * Service Worker · Workspace (FileHub)
 * - Network-first para la navegación (HTML siempre fresco).
 * - NUNCA cachea Supabase ni la GitHub API (datos en vivo / sesión).
 * - Cache-first para el shell estático (CDNs, fuentes, iconos).
 */
const CACHE = 'workspace-v7';
const NO_CACHE = ['supabase.co', 'api.github.com'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.json']).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || !url.protocol.startsWith('http')) return;
  if (NO_CACHE.some((h) => url.hostname.includes(h))) return; // deja pasar a la red

  // navegación / HTML → network-first
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  // resto (CDN, fuentes, iconos) → cache-first con relleno
  e.respondWith(
    caches.match(req).then((c) => c || fetch(req).then((r) => {
      if (r.ok && (url.origin === location.origin || /cdn|fonts|jsdelivr|tailwindcss/.test(url.hostname))) {
        const cl = r.clone(); caches.open(CACHE).then((ca) => ca.put(req, cl));
      }
      return r;
    }).catch(() => c))
  );
});
