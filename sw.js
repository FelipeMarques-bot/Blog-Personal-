const CACHE = 'deleonfit-v3';
const IMG_RE = /\.(png|jpe?g|svg|webp|ico)$/i;

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin === 'https://cqvjnvncsozjypwthniu.supabase.co') return;
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(function () {
        return caches.match(e.request).then(function (r) { return r || caches.match('./'); });
      })
    );
    return;
  }
  if (IMG_RE.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then(function (hit) {
        return hit || fetch(e.request).then(function (resp) {
          const copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
          return resp;
        });
      })
    );
    return;
  }
  e.respondWith(fetch(e.request).catch(function () {
    return caches.match(e.request);
  }));
});
