/* Uni Risos — service worker: app rápido, funcionando sem conexão e recebendo notificações.
   Ao publicar mudanças, aumente VERSION para os aparelhos baixarem os arquivos novos. */
const VERSION = 'uni-risos-v4';
const SHELL = [
  './', 'index.html', 'instalar.html', 'privacidade.html', 'styles.css', 'manifest.webmanifest',
  'app/', 'app/index.html', 'app/app.css', 'app/app.js',
  'js/main.js', 'js/firebase-config.js', 'js/store.js', 'js/agenda.js', 'js/backend.js', 'js/booking.js', 'js/auth.js', 'js/pwa.js',
  'assets/logo-selo.jpg', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/equipe.jpg', 'assets/jaqueline.jpg', 'assets/lucas.jpg',
  'assets/recepcao.jpg', 'assets/espera.jpg', 'assets/consultorio.jpg', 'assets/fachada.jpg'
];

self.addEventListener('install', (e) => {
  /* Um arquivo que falhar não impede a instalação do resto */
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  /* Login, agenda (Firebase) e servidor (/api) sempre vão direto para a rede */
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => {
        if (hit) return hit;
        return caches.match(url.pathname.includes('/app/') ? 'app/index.html' : 'index.html');
      }))
  );
});

/* Notificações enviadas pelo servidor (novo agendamento, confirmação, lembrete) */
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'Uni Risos', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Uni Risos', {
    body: d.body || '',
    icon: 'assets/icon-192.png',
    badge: 'assets/icon-192.png',
    tag: d.tag,
    renotify: !!d.tag,
    data: { url: d.url || './app/' }
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './app/', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => c.url.includes('/app/'));
    if (open) { open.navigate(target).catch(() => {}); return open.focus(); }
    return self.clients.openWindow(target);
  }));
});
