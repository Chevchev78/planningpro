// Hors-ligne : on sert la copie en cache tout de suite, puis on la rafraîchit en arrière-plan.
// Changer CACHE à chaque mise en ligne pour purger les anciennes versions.
const CACHE = 'planningpro-v6';
// La police (Google Fonts) a son propre cache, gardé d'une version à l'autre.
const FONT_CACHE = 'planningpro-fonts';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/calendar.js',
  './js/cycle.js',
  './js/cycle-view.js',
  './js/icons.js',
  './js/settings.js',
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
  // cache: 'reload' contourne le cache HTTP de GitHub Pages (10 min) pour prendre la vraie nouvelle version.
  const requests = ASSETS.map(url => new Request(url, { cache: 'reload' }));
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(requests)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(caches.open(FONT_CACHE).then(async cache => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
      return response;
    }));
    return;
  }

  if (url.origin !== self.location.origin) return;

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
