// Club D23 — кэш программы для работы без интернета. Данных спортсменов здесь нет.
// 18.11.2026: надёжнее без интернета — основное (страница) кэшируется обязательно, значки — по возможности;
// 18.11.2026: удаляются только свои старые копии (d23-app-), чужие не трогаем.
// не кэшируются перенаправления и чужие ответы (Wi‑Fi со страницей входа в гостинице, поезде); без сети — сразу из кэша.
const CACHE = 'd23-app-v189';
const CORE = ['./', './index.html'], OPT = ['./manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => { await c.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))); await Promise.all(OPT.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))); }));   // мимо кэша браузера — сразу новая версия
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('d23-app-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// сначала сеть (чтобы обновления приходили сразу); без сети, при медленной сети (4 с) или ошибке сервера — из кэша
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const nav = req.mode === 'navigate';
  const fromCache = () => caches.match(req, { ignoreSearch: nav, ignoreVary: true })
    .then(m => m || (nav ? caches.match('./index.html', { ignoreVary: true }).then(x => x || caches.match('./', { ignoreVary: true })) : null));
  const good = r => r && r.ok && r.type === 'basic' && !r.redirected && (!nav || /text\/html/i.test(r.headers.get('content-type') || ''));
  if (self.navigator && self.navigator.onLine === false) { e.respondWith(fromCache().then(m => m || fetch(req))); return; }
  e.respondWith(new Promise(resolve => {
    let done = false; const fin = r => { if (!done && r) { done = true; resolve(r); } };
    const timer = setTimeout(() => { fromCache().then(fin); }, 4000);
    fetch(nav ? new Request(req, { cache: 'no-cache' }) : req).then(r => {   // страница — с проверкой на сервере: обновление приходит сразу, а не через 10 минут
      if (good(r)) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)).catch(() => {}); clearTimeout(timer); fin(r); }
      else { clearTimeout(timer); fromCache().then(c => fin(c || r)); }          // ошибка сервера, перенаправление (страница входа Wi‑Fi) — рабочая копия из кэша
    }).catch(() => { clearTimeout(timer); fromCache().then(c => fin(c || Response.error())); });
  }));
});
