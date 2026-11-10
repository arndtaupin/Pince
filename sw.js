/* N-Tester Pro — service worker : permet d'ouvrir l'application sans réseau.
   Stratégie : réseau d'abord (toujours la dernière version quand il y a du réseau),
   copie locale en secours (hors réseau ou réseau trop lent).
   Changer le numéro de version ci-dessous à chaque mise à jour des fichiers. */
const CACHE = 'ntp-v18';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  // On ne touche ni aux appels vers Google (synchronisation) ni aux requêtes non-GET
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 4000);
      const r = await fetch(e.request, { signal: ctl.signal, cache: 'no-cache' });
      clearTimeout(t);
      if (r && r.ok) cache.put(e.request, r.clone());
      return r;
    } catch (err) {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  })());
});
