/* Uni Risos — interface e animações */
(function () {
  'use strict';
  var UR = (window.UR = window.UR || {});
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  document.documentElement.classList.add('js');

  /* Tratamentos: usados nos cartões e no agendamento */
  UR.services = [
    { id: 'avaliacao', name: 'Avaliação e limpeza', desc: 'Check-up completo, profilaxia e orientação de higiene para manter tudo em dia.', icon: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z M9 12l2 2 4-4' },
    { id: 'restauracao', name: 'Restaurações e onlays', desc: 'Devolvem forma e função ao dente com acabamento natural, na cor do seu sorriso.', icon: 'M12 3l8 5-8 5-8-5z M4 13l8 5 8-5' },
    { id: 'clareamento', name: 'Clareamento dental', desc: 'Dentes mais claros com segurança e acompanhamento profissional do começo ao fim.', icon: 'M12 3v6 M12 15v6 M3 12h6 M15 12h6 M6 6l3 3 M15 15l3 3 M18 6l-3 3 M9 15l-3 3' },
    { id: 'odontopediatria', name: 'Odontopediatria', desc: 'Atendimento paciente e lúdico para os pequenos criarem uma boa relação com o dentista.', icon: 'M12 21a9 9 0 100-18 9 9 0 000 18z M8 14c1.5 2.5 6.5 2.5 8 0 M9 9.5v.5 M15 9.5v.5' },
    { id: 'ortodontia', name: 'Ortodontia', desc: 'Aparelhos para alinhar os dentes e corrigir a mordida em qualquer idade.', icon: 'M3 12h18 M5.5 9h3v6h-3z M10.5 9h3v6h-3z M15.5 9h3v6h-3z' },
    { id: 'canal', name: 'Tratamento de canal', desc: 'Alivia a dor e salva o dente, com anestesia eficiente e muito cuidado.', icon: 'M7 3c-3 0-4 3-3 6 1 3 1 5 1.5 8 .3 2 2 2 2.5 0l1-4c.3-1.5 1.7-1.5 2 0l1 4c.5 2 2.2 2 2.5 0 .5-3 .5-5 1.5-8 1-3 0-6-3-6-2 0-2.5 1-4 1S9 3 7 3z' },
    { id: 'implante', name: 'Implantes', desc: 'Reposição de dentes perdidos com fixação segura e resultado natural.', icon: 'M9 3h6l-1 5h-4z M9 11h6 M9.5 14h5 M10.5 17h3 M12 8v13' },
    { id: 'protese', name: 'Próteses', desc: 'Coroas e próteses sob medida para você voltar a mastigar e sorrir com confiança.', icon: 'M4 8l4 4 4-7 4 7 4-4-2 11H6z' }
  ];

  /* Aviso rápido */
  var toastEl = $('#toast'), toastT;
  UR.toast = function (msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3200);
  };

  /* Abertura com contador */
  (function () {
    var loader = $('#loader'), num = $('#loaderNum'), smile = $('.loader-smile');
    var finish = function () {
      loader.classList.add('is-done');
      document.body.classList.add('is-ready');
      setTimeout(function () { loader.hidden = true; }, 1000);
    };
    if (reduced) { finish(); return; }
    var start = performance.now(), dur = 1300;
    (function tick(now) {
      var p = clamp((now - start) / dur, 0, 1), e = 1 - Math.pow(1 - p, 3);
      num.textContent = Math.round(e * 100);
      smile.style.setProperty('--off', 100 - e * 100);
      if (p < 1) requestAnimationFrame(tick); else setTimeout(finish, 180);
    })(start);
    setTimeout(finish, 4000); /* garantia caso a aba esteja em segundo plano */
  })();

  /* Cursor */
  (function () {
    var c = $('#cursor');
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var x = 0, y = 0, cx = 0, cy = 0;
    window.addEventListener('pointermove', function (e) { x = e.clientX; y = e.clientY; c.classList.add('is-on'); });
    document.addEventListener('pointerover', function (e) {
      c.classList.toggle('is-hover', !!e.target.closest('a, button, .service, .review, .person'));
    });
    (function loop() {
      cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
      c.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
      requestAnimationFrame(loop);
    })();
  })();

  /* Botões magnéticos */
  if (!reduced) $$('.magnetic').forEach(function (b) {
    b.addEventListener('pointermove', function (e) {
      var r = b.getBoundingClientRect();
      b.style.transform = 'translate(' + (e.clientX - r.left - r.width / 2) * 0.25 + 'px,' + (e.clientY - r.top - r.height / 2) * 0.35 + 'px)';
    });
    b.addEventListener('pointerleave', function () { b.style.transform = ''; });
  });

  /* Navegação */
  (function () {
    var nav = $('#nav'), burger = $('#burger'), last = 0;
    var setOpen = function (open) {
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      document.body.classList.toggle('is-locked', open);
    };
    burger.addEventListener('click', function () { setOpen(!nav.classList.contains('is-open')); });
    $$('#navLinks a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (!nav.classList.contains('is-open')) nav.classList.toggle('is-hidden', y > last && y > 400);
      last = y;
    }, { passive: true });
  })();

  /* Linhas do hero: ondas que formam um sorriso e reagem ao mouse */
  (function () {
    var cv = $('#heroCanvas'), ctx = cv.getContext('2d'), hero = cv.parentElement;
    var w, h, dpr, mx = -999, my = -999, visible = true, t = 0;
    var size = function () {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    var draw = function () {
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(23,33,26,.13)';
      var n = Math.max(14, Math.round(h / 36));
      for (var i = 0; i < n; i++) {
        var base = (h / n) * (i + 0.5);
        ctx.beginPath();
        for (var x = -20; x <= w + 20; x += 18) {
          var k = (x - w / 2) / (w / 2);
          var y = base + (1 - k * k) * 46 + Math.sin(x * 0.0045 + t + i * 0.32) * 12;
          var dx = x - mx, dy = y - my, d2 = dx * dx + dy * dy;
          if (d2 < 48400) y += (dy < 0 ? -1 : 1) * (1 - d2 / 48400) * 38;
          if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };
    size(); draw();
    window.addEventListener('resize', function () { size(); draw(); });
    if (reduced) return;
    hero.addEventListener('pointermove', function (e) { var r = hero.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    hero.addEventListener('pointerleave', function () { mx = my = -999; });
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(hero);
    (function loop() { if (visible) { t += 0.008; draw(); } requestAnimationFrame(loop); })();
  })();

  /* Cartões de tratamento */
  (function () {
    var track = $('#servicesTrack');
    track.innerHTML = UR.services.map(function (s) {
      return '<article class="service"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + s.icon + '"/></svg>' +
        '<h3>' + s.name + '</h3><p>' + s.desc + '</p>' +
        '<button type="button" data-service="' + s.id + '">Agendar →</button></article>';
    }).join('');
    track.addEventListener('click', function (e) {
      var b = e.target.closest('[data-service]');
      if (!b) return;
      if (UR.booking) UR.booking.pick(b.dataset.service);
      $('#agendar').scrollIntoView();
    });
  })();

  /* Efeitos ligados à rolagem */
  (function () {
    var section = $('#tratamentos'), track = $('#servicesTrack'), bar = $('#servicesBar');
    var man = $('#manifesto'), overflow = 0, desktop = false;
    man.innerHTML = man.textContent.trim().split(/\s+/).map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    var words = $$('.w', man);

    var measure = function () {
      desktop = window.innerWidth > 960;
      overflow = desktop ? Math.max(0, track.scrollWidth - window.innerWidth) : 0;
      section.style.setProperty('--services-h', desktop ? (window.innerHeight + overflow) + 'px' : 'auto');
      if (!desktop) track.style.transform = '';
    };
    var onScroll = function () {
      var vh = window.innerHeight;
      if (desktop && overflow) {
        var p = clamp(-section.getBoundingClientRect().top / overflow, 0, 1);
        track.style.transform = 'translate3d(' + (-p * overflow) + 'px,0,0)';
        bar.style.transform = 'scaleX(' + p + ')';
      }
      var r = man.getBoundingClientRect();
      var mp = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.3), 0, 1), on = Math.round(mp * words.length);
      for (var i = 0; i < words.length; i++) words[i].classList.toggle('on', i < on);
    };
    measure(); onScroll();
    window.addEventListener('resize', function () { measure(); onScroll(); });
    window.addEventListener('scroll', onScroll, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); onScroll(); });
  })();

  /* Entrada dos blocos e contadores */
  (function () {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
        var c = en.target.querySelector('[data-count]');
        if (!c || reduced) return;
        var to = +c.dataset.count, dec = +(c.dataset.decimals || 0), s = performance.now();
        (function tick(now) {
          var p = clamp((now - s) / 1200, 0, 1), v = to * (1 - Math.pow(1 - p, 3));
          c.textContent = v.toFixed(dec).replace('.', ',');
          if (p < 1) requestAnimationFrame(tick);
        })(s);
      });
    }, { threshold: 0.15 });
    $$('[data-reveal]').forEach(function (el) { io.observe(el); });
  })();

  /* Horário de funcionamento (fuso de São Paulo) */
  UR.hours = { 0: null, 1: [9, 19], 2: [9, 19], 3: [9, 19], 4: [9, 19], 5: [9, 19], 6: [9, 13] };
  UR.nowSP = function () { return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })); };
  (function () {
    var now = UR.nowSP(), d = now.getDay(), hr = now.getHours() + now.getMinutes() / 60, today = UR.hours[d];
    var el = $('#openNow'), names = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    var li = $('#hours [data-d="' + d + '"]');
    if (li) li.classList.add('is-today');
    if (today && hr >= today[0] && hr < today[1]) {
      el.classList.add('is-open');
      el.textContent = 'Aberto agora · fecha às ' + today[1] + ':00';
    } else if (today && hr < today[0]) {
      el.textContent = 'Fechado · abre hoje às 09:00';
    } else {
      var n = d;
      do { n = (n + 1) % 7; } while (!UR.hours[n]);
      el.textContent = 'Fechado · abre ' + (n === (d + 1) % 7 ? 'amanhã' : names[n]) + ' às 09:00';
    }
  })();

  $('#year').textContent = new Date().getFullYear();
})();
