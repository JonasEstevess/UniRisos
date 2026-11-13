/* Uni Risos — service worker: deixa o app abrir rápido e funcionar sem conexão.
   Ao publicar mudanças, aumente VERSION para os aparelhos baixarem os arquivos novos. */
const VERSION = 'uni-risos-v1';
const SHELL = [
  './', 'index.html', 'instalar.html', 'styles.css', 'manifest.webmanifest',
  'js/main.js', 'js/firebase-config.js', 'js/store.js', 'js/backend.js', 'js/booking.js', 'js/auth.js', 'js/pwa.js',
  'assets/logo-selo.jpg', 'assets/icon-192.png', 'assets/equipe.jpg', 'assets/jaqueline.jpg', 'assets/lucas.jpg',
  'assets/recepcao.jpg', 'assets/espera.jpg', 'assets/consultorio.jpg', 'assets/fachada.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
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
  /* Login e agenda (Firebase) sempre vão direto para a rede */
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html')))
  );
});
