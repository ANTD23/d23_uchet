// Club D23 — кэш программы для работы без интернета. Данных спортсменов здесь нет.
const CACHE = 'd23-app-v15';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// сначала сеть (чтобы обновления приходили сразу), без сети или при медленной сети — из кэша
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(new Promise(resolve => {
    let done = false;
    const fromCache = () => caches.match(e.request).then(m => m || caches.match('./index.html'));
    const timer = setTimeout(() => { if (!done) fromCache().then(r => { if (r && !done) { done = true; resolve(r); } }); }, 4000);
    fetch(e.request).then(r => {
      if (r && r.ok) {
        const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp));
        if (!done) { done = true; clearTimeout(timer); resolve(r); }
      } else {                                   // ошибка сервера (404/5xx) — отдаём рабочую копию из кэша, если есть
        clearTimeout(timer);
        if (!done) fromCache().then(c => { if (!done) { done = true; resolve(c || r); } });
      }
    }).catch(() => { clearTimeout(timer); if (!done) fromCache().then(r => { done = true; resolve(r || Response.error()); }); });
  }));
});
