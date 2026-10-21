// Hors-ligne : on sert la copie en cache tout de suite, puis on la rafraîchit en arrière-plan.
// Changer CACHE à chaque mise en ligne pour purger les anciennes versions.
const CACHE = 'planningpro-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/calendar.js',
  './js/cycle.js',
  './js/icons.js',
  './js/options.js',
  './js/store.js',
  './js/theme.js',
  './js/ui.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(request, { ignoreSearch: true });
    const network = fetch(request)
      .then(response => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
      .catch(() => cached || (request.mode === 'navigate' ? cache.match('./') : Response.error()));
    if (cached) {
      event.waitUntil(network);
      return cached;
    }
    return network;
  }));
});
