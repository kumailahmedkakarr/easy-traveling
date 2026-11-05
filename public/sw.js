/* Service worker: makes the site installable and lets the page open even with a bad connection.
   - Pages, styles, scripts and images: network first, cached copy as backup.
   - /api/ is never cached (prices, seats and bookings must always be live).
   - Only the public site is cached (the hidden admin panel is never touched). */
const CACHE = 'et-shell-v1';
const CORE = ['/', '/css/app.css', '/js/app/main.js', '/assets/images/logo.png', '/manifest.webmanifest'];
const PUBLIC_PATH = /^\/($|index\.html|css\/|js\/|assets\/|manifest\.webmanifest)/;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || !PUBLIC_PATH.test(url.pathname)) return; // let the browser handle it

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
        return response;
      })
      .catch(() => caches.match(request).then((hit) => hit || (request.mode === 'navigate' ? caches.match('/') : Response.error()))),
  );
});
