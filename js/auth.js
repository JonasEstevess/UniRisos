/* Uni Risos — cadastro, login e área do paciente */
(function () {
  'use strict';
  var UR = window.UR, esc = UR.esc;
  var drawer = document.getElementById('drawer'), overlay = document.getElementById('overlay');
  var content = document.getElementById('drawerContent'), btn = document.getElementById('accountBtn');
  var tab = 'login', lastFocus = null, pendingCancel = null;

  function user() {
    var email = UR.store.session();
    return email ? UR.store.users().filter(function (u) { return u.email === email; })[0] || null : null;
  }

  /* A senha nunca é guardada em texto puro: fica só o hash com sal */
  function hash(salt, pass) {
    var text = salt + ':' + pass;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      });
    }
    var h = 5381;
    for (var i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return Promise.resolve('f' + (h >>> 0).toString(16));
  }

  function field(id, label, type, extra) {
    return '<label class="field">' + label + '<input id="' + id + '" type="' + type + '" ' + (extra || '') + '><span class="err" id="' + id + 'Err"></span></label>';
  }

  function authView() {
    var login = tab === 'login';
    return '<h2 id="drawerTitle">' + (login ? 'Que bom te ver' : 'Criar conta') + '</h2>' +
      '<p class="sub">' + (login ? 'Entre para ver e gerenciar suas consultas.' : 'Cadastre-se para agendar mais rápido e acompanhar suas consultas.') + '</p>' +
      '<div class="tabs"><button type="button" data-tab="login" class="' + (login ? 'is-on' : '') + '">Entrar</button>' +
      '<button type="button" data-tab="signup" class="' + (login ? '' : 'is-on') + '">Cadastrar</button></div>' +
      '<form class="form" id="authForm" novalidate>' +
      (login ? '' : field('auName', 'Nome completo', 'text', 'autocomplete="name"') +
        field('auPhone', 'WhatsApp', 'tel', 'inputmode="numeric" autocomplete="tel" placeholder="(11) 90000-0000"')) +
      field('auEmail', 'E-mail', 'email', 'autocomplete="email"') +
      field('auPass', 'Senha', 'password', 'autocomplete="' + (login ? 'current-password' : 'new-password') + '"' + (login ? '' : ' placeholder="Mínimo de 6 caracteres"')) +
      '<button class="btn btn-ink btn-lg btn-block" type="submit">' + (login ? 'Entrar' : 'Criar conta') + '</button></form>' +
      '<p class="note">Sua conta fica salva neste dispositivo. Agendar sem cadastro também funciona.</p>';
  }

  function accountView(u) {
    var today = new Date().toISOString().slice(0, 10), phone = u.phone;
    var mine = UR.store.bookings().filter(function (b) { return b.user === u.email || (phone && b.phone === phone); })
      .sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    var upcoming = mine.filter(function (b) { return b.status !== 'cancelado' && b.date >= today; });
    var past = mine.filter(function (b) { return b.status === 'cancelado' || b.date < today; }).reverse();
    var card = function (b, isPast) {
      return '<div class="appt' + (isPast ? ' is-past' : '') + '"><b>' + esc(b.serviceName) + '</b>' +
        '<span>' + UR.fmtDate(b.date) + ' às ' + b.time + '</span>' +
        (isPast ? '<span>' + (b.status === 'cancelado' ? 'Cancelada' : 'Realizada') + '</span>' :
          '<div class="appt-actions"><a href="' + UR.whatsLink(b) + '" target="_blank" rel="noopener">Confirmar no WhatsApp</a>' +
          '<button type="button" class="danger" data-cancel="' + b.id + '">' + (pendingCancel === b.id ? 'Toque de novo para cancelar' : 'Cancelar') + '</button></div>') +
        '</div>';
    };
    return '<h2 id="drawerTitle">Olá, ' + esc(u.name.split(' ')[0]) + '</h2><p class="sub">' + esc(u.email) + '</p>' +
      '<p class="eyebrow" style="margin-bottom:12px">Próximas consultas</p>' +
      (upcoming.length ? upcoming.map(function (b) { return card(b, false); }).join('') :
        '<div class="empty">Você ainda não tem consultas marcadas.</div>') +
      (past.length ? '<p class="eyebrow" style="margin:22px 0 12px">Histórico</p>' + past.map(function (b) { return card(b, true); }).join('') : '') +
      '<div class="drawer-foot"><a class="btn btn-ink btn-lg" href="#agendar" data-close>Agendar consulta</a>' +
      '<button class="btn btn-line" type="button" id="auLogout">Sair da conta</button></div>';
  }

  function render() {
    var u = user();
    content.innerHTML = u ? accountView(u) : authView();
    btn.textContent = u ? u.name.split(' ')[0] : 'Entrar';
  }

  function open() {
    lastFocus = document.activeElement;
    pendingCancel = null;
    render();
    drawer.hidden = overlay.hidden = false;
    document.body.classList.add('is-locked');
    var first = content.querySelector('input') || document.getElementById('drawerClose');
    first.focus();
  }
  function close() {
    drawer.hidden = overlay.hidden = true;
    document.body.classList.remove('is-locked');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function setErr(id, msg) { document.getElementById(id + 'Err').textContent = msg || ''; return !msg; }

  function submit() {
    var val = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var email = val('auEmail').toLowerCase(), pass = document.getElementById('auPass').value;
    var users = UR.store.users(), existing = users.filter(function (u) { return u.email === email; })[0];
    var ok = setErr('auEmail', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Digite um e-mail válido.');

    if (tab === 'login') {
      ok = setErr('auPass', pass ? '' : 'Digite sua senha.') && ok;
      if (!ok) return;
      if (!existing) { setErr('auEmail', 'Não encontramos uma conta com esse e-mail.'); return; }
      hash(existing.salt, pass).then(function (h) {
        if (h !== existing.hash) { setErr('auPass', 'Senha incorreta. Tente de novo.'); return; }
        finish(existing, 'Bem-vindo de volta, ' + existing.name.split(' ')[0] + '!');
      });
      return;
    }

    var name = val('auName'), phone = UR.digits(val('auPhone'));
    ok = setErr('auName', name.length >= 3 ? '' : 'Digite seu nome completo.') && ok;
    ok = setErr('auPhone', phone.length >= 10 ? '' : 'Digite o WhatsApp com DDD.') && ok;
    ok = setErr('auPass', pass.length >= 6 ? '' : 'A senha precisa ter pelo menos 6 caracteres.') && ok;
    if (ok && existing) ok = setErr('auEmail', 'Esse e-mail já tem conta. Use a aba Entrar.');
    if (!ok) return;
    var salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    hash(salt, pass).then(function (h) {
      var u = { name: name, email: email, phone: phone, salt: salt, hash: h };
      UR.store.addUser(u);
      finish(u, 'Conta criada. Bem-vindo, ' + name.split(' ')[0] + '!');
    });
  }

  function finish(u, msg) {
    UR.store.setSession(u.email);
    render();
    document.dispatchEvent(new CustomEvent('ur:auth'));
    UR.toast(msg);
  }

  btn.addEventListener('click', open);
  overlay.addEventListener('click', close);
  document.getElementById('drawerClose').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) close(); });
  document.addEventListener('ur:booking', render);

  content.addEventListener('click', function (e) {
    var t = e.target;
    if (t.dataset.tab) { tab = t.dataset.tab; render(); content.querySelector('input').focus(); }
    if (t.hasAttribute('data-close')) close();
    if (t.id === 'auLogout') {
      UR.store.setSession(null); tab = 'login'; render();
      document.dispatchEvent(new CustomEvent('ur:auth'));
      UR.toast('Você saiu da conta.');
    }
    if (t.dataset.cancel) {
      if (pendingCancel === t.dataset.cancel) {
        UR.store.cancelBooking(pendingCancel); pendingCancel = null; render();
        UR.toast('Consulta cancelada.');
      } else { pendingCancel = t.dataset.cancel; render(); }
    }
  });
  content.addEventListener('input', function (e) {
    if (e.target.id === 'auPhone') e.target.value = UR.maskPhone(e.target.value);
  });
  content.addEventListener('submit', function (e) { e.preventDefault(); submit(); });

  UR.auth = { user: user, open: open };
  render();
})();
