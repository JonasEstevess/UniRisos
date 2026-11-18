/* Uni Risos — instalação como aplicativo (PWA) */
(function () {
  'use strict';
  var UR = (window.UR = window.UR || {});
  var deferred = null;
  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var buttons = function () { return Array.prototype.slice.call(document.querySelectorAll('[data-install]')); };
  var say = function (msg) { if (UR.toast) UR.toast(msg); };

  if (standalone) document.documentElement.classList.add('is-app');

  /* O service worker fica na raiz do site, mesmo quando esta página está em /app/ */
  var me = document.querySelector('script[src*="pwa.js"]');
  var base = me ? me.src.replace(/js\/pwa\.js.*$/, '') : './';
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register(base + 'sw.js', { scope: base }).catch(function () {}); });
  }

  function refresh() {
    var can = !standalone && (deferred || ios);
    buttons().forEach(function (b) { b.hidden = !can; });
    document.documentElement.classList.toggle('can-install', !!can);
    Array.prototype.forEach.call(document.querySelectorAll('[data-install-card]'), function (c) { c.hidden = !can; });
    var st = document.getElementById('installState');
    if (st) st.textContent = standalone ? 'Você já está usando o app instalado.'
      : deferred ? 'Toque em “Instalar app” para adicionar à tela inicial.'
      : ios ? 'No iPhone: toque em Compartilhar e depois em “Adicionar à Tela de Início”.'
      : 'Abra esta página no celular (Chrome no Android ou Safari no iPhone) para instalar.';
  }

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; refresh(); });
  window.addEventListener('appinstalled', function () { deferred = null; standalone = true; refresh(); say('App instalado. Procure o ícone da Uni Risos na tela inicial.'); });

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-install]');
    if (!b) return;
    if (deferred) { deferred.prompt(); deferred.userChoice.then(function () { deferred = null; refresh(); }); }
    else if (ios) say('Toque em Compartilhar e depois em “Adicionar à Tela de Início”.');
  });

  /* Barra inferior do app: Consultas abre a área do paciente */
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-account]') && UR.auth) UR.auth.open();
  });

  refresh();
})();
