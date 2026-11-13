/* Uni Risos — cadastro, login e área do paciente */
(function () {
  'use strict';
  var UR = window.UR, api = UR.api, esc = UR.esc;
  var drawer = document.getElementById('drawer'), overlay = document.getElementById('overlay');
  var content = document.getElementById('drawerContent'), btn = document.getElementById('accountBtn');
  var tab = 'login', lastFocus = null, pendingCancel = null, prefill = {}, greet = null, busy = false, mine = null;

  function field(id, label, type, extra) {
    return '<label class="field">' + label + '<input id="' + id + '" type="' + type + '" ' + (extra || '') + '><span class="err" id="' + id + 'Err"></span></label>';
  }

  function authView() {
    var login = tab === 'login';
    return '<h2 id="drawerTitle">' + (login ? 'Que bom te ver' : 'Criar conta') + '</h2>' +
      '<p class="sub">' + (login ? 'Entre para agendar e gerenciar suas consultas.' : 'Cadastre-se para agendar e acompanhar suas consultas.') + '</p>' +
      '<div class="tabs"><button type="button" data-tab="login" class="' + (login ? 'is-on' : '') + '">Entrar</button>' +
      '<button type="button" data-tab="signup" class="' + (login ? '' : 'is-on') + '">Cadastrar</button></div>' +
      '<form class="form" id="authForm" novalidate>' +
      (login ? '' : field('auName', 'Nome completo', 'text', 'autocomplete="name" value="' + esc(prefill.name || '') + '"') +
        field('auPhone', 'WhatsApp', 'tel', 'inputmode="numeric" autocomplete="tel" placeholder="(11) 90000-0000" value="' + esc(UR.maskPhone(prefill.phone || '')) + '"')) +
      field('auEmail', 'E-mail', 'email', 'autocomplete="email"') +
      field('auPass', 'Senha', 'password', 'autocomplete="' + (login ? 'current-password' : 'new-password') + '"' + (login ? '' : ' placeholder="Mínimo de 6 caracteres"')) +
      '<button class="btn btn-ink btn-lg btn-block" type="submit"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Aguarde…' : login ? 'Entrar' : 'Criar conta') + '</button></form>' +
      (login ? '<p class="note"><button type="button" id="auReset" style="text-decoration:underline">Esqueci minha senha</button></p>' : '') +
      (api.mode === 'local' ? '<p class="note">Modo de demonstração: os dados ficam salvos só neste dispositivo.</p>' : '');
  }

  function card(b, isPast) {
    var label = { pendente: 'Aguardando confirmação da clínica', confirmado: 'Confirmada pela clínica', cancelado: 'Cancelada' }[b.status] || b.status;
    return '<div class="appt' + (isPast ? ' is-past' : '') + '"><b>' + esc(b.serviceName) + '</b>' +
      '<span>' + UR.fmtDate(b.date) + ' às ' + b.time + '</span>' +
      '<span class="appt-status s-' + esc(b.status) + '">' + (isPast && b.status !== 'cancelado' ? 'Realizada' : label) + '</span>' +
      (isPast ? '' : '<div class="appt-actions"><a href="' + UR.whatsLink(b) + '" target="_blank" rel="noopener">Falar no WhatsApp</a>' +
        '<button type="button" class="danger" data-cancel="' + b.id + '">' + (pendingCancel === b.id ? 'Toque de novo para cancelar' : 'Cancelar') + '</button></div>') +
      '</div>';
  }

  function accountView(u) {
    var today = api.today(), list;
    if (!mine) list = '<div class="empty">Carregando suas consultas…</div>';
    else {
      var sorted = mine.slice().sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
      var upcoming = sorted.filter(function (b) { return b.status !== 'cancelado' && b.date >= today; });
      var past = sorted.filter(function (b) { return b.status === 'cancelado' || b.date < today; }).reverse();
      list = (upcoming.length ? upcoming.map(function (b) { return card(b, false); }).join('') :
        '<div class="empty">Você ainda não tem consultas marcadas.</div>') +
        (past.length ? '<p class="eyebrow" style="margin:22px 0 12px">Histórico</p>' + past.map(function (b) { return card(b, true); }).join('') : '');
    }
    return '<h2 id="drawerTitle">Olá, ' + esc(u.name.split(' ')[0]) + '</h2><p class="sub">' + esc(u.email) + '</p>' +
      '<p class="eyebrow" style="margin-bottom:12px">Próximas consultas</p>' + list +
      '<div class="drawer-foot"><a class="btn btn-ink btn-lg" href="#agendar" data-close>Agendar consulta</a>' +
      (u.admin ? '<a class="btn btn-line" href="admin.html">Painel da clínica</a>' : '') +
      '<button class="btn btn-line" type="button" id="auLogout">Sair da conta</button></div>';
  }

  function render() {
    var u = api.user();
    content.innerHTML = u ? accountView(u) : authView();
    btn.textContent = u ? u.name.split(' ')[0] : 'Entrar';
  }

  function loadMine() {
    if (!api.user()) { mine = null; return; }
    api.myBookings().then(function (list) { mine = list; if (!drawer.hidden) render(); })
      .catch(function () { mine = []; if (!drawer.hidden) render(); UR.toast('Não foi possível carregar suas consultas.'); });
  }

  function open(startTab, fill) {
    lastFocus = document.activeElement;
    pendingCancel = null;
    if (startTab) tab = startTab;
    prefill = fill || {};
    render();
    loadMine();
    drawer.hidden = overlay.hidden = false;
    document.body.classList.add('is-locked');
    var first = content.querySelector('input:not([value]), input[value=""]') || content.querySelector('input') || document.getElementById('drawerClose');
    first.focus();
  }
  function close() {
    if (drawer.hidden) return;
    drawer.hidden = overlay.hidden = true;
    document.body.classList.remove('is-locked');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function dismiss() { close(); document.dispatchEvent(new CustomEvent('ur:authclosed')); }

  function setErr(id, msg) { var el = document.getElementById(id + 'Err'); if (el) el.textContent = msg || ''; return !msg; }
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

  function submit() {
    if (busy) return;
    var email = val('auEmail').toLowerCase(), pass = document.getElementById('auPass').value;
    var ok = setErr('auEmail', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Digite um e-mail válido.');
    var name = val('auName'), phone = UR.digits(val('auPhone')), job;

    if (tab === 'login') {
      ok = setErr('auPass', pass ? '' : 'Digite sua senha.') && ok;
      if (!ok) return;
      greet = 'Bem-vindo de volta!';
      job = function () { return api.signIn(email, pass); };
    } else {
      ok = setErr('auName', name.length >= 3 ? '' : 'Digite seu nome completo.') && ok;
      ok = setErr('auPhone', phone.length >= 10 ? '' : 'Digite o WhatsApp com DDD.') && ok;
      ok = setErr('auPass', pass.length >= 6 ? '' : 'A senha precisa ter pelo menos 6 caracteres.') && ok;
      if (!ok) return;
      greet = 'Conta criada. Bem-vindo, ' + name.split(' ')[0] + '!';
      job = function () { return api.signUp({ name: name, phone: phone, email: email, pass: pass }); };
    }
    var keep = { auName: name, auPhone: val('auPhone'), auEmail: email };
    busy = true;
    content.querySelector('[type=submit]').disabled = true;
    content.querySelector('[type=submit]').textContent = 'Aguarde…';
    job().then(function () { busy = false; }).catch(function (e) {
      busy = false; greet = null;
      render();
      Object.keys(keep).forEach(function (id) { var el = document.getElementById(id); if (el) el.value = keep[id]; });
      setErr(e.field === 'email' ? 'auEmail' : 'auPass', e.message);
    });
  }

  btn.addEventListener('click', function () { open(); });
  overlay.addEventListener('click', dismiss);
  document.getElementById('drawerClose').addEventListener('click', dismiss);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) dismiss(); });
  document.addEventListener('ur:booking', loadMine);

  api.onAuth(function (u) {
    busy = false; mine = null;
    render();
    if (u) loadMine();
    if (u && greet) UR.toast(greet);
    greet = null;
  });

  content.addEventListener('click', function (e) {
    var t = e.target;
    if (t.dataset.tab) { tab = t.dataset.tab; render(); content.querySelector('input').focus(); }
    if (t.hasAttribute('data-close')) close();
    if (t.id === 'auLogout') { tab = 'login'; api.signOut().then(function () { UR.toast('Você saiu da conta.'); }); }
    if (t.id === 'auReset') {
      var email = val('auEmail').toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('auEmail', 'Digite seu e-mail acima para receber o link.'); return; }
      api.resetPassword(email).then(function () { UR.toast('Enviamos um link para redefinir sua senha.'); })
        .catch(function (err) { setErr('auEmail', err.message); });
    }
    if (t.dataset.cancel) {
      if (pendingCancel !== t.dataset.cancel) { pendingCancel = t.dataset.cancel; render(); return; }
      var b = (mine || []).filter(function (x) { return x.id === pendingCancel; })[0];
      pendingCancel = null;
      if (b) api.cancelBooking(b).then(function () {
        UR.toast('Consulta cancelada.'); loadMine();
        document.dispatchEvent(new CustomEvent('ur:booking'));
      }).catch(function () { UR.toast('Não foi possível cancelar. Tente de novo.'); });
    }
  });
  content.addEventListener('input', function (e) {
    if (e.target.id === 'auPhone') e.target.value = UR.maskPhone(e.target.value);
  });
  content.addEventListener('submit', function (e) { e.preventDefault(); submit(); });

  UR.auth = { user: api.user, open: open, close: close };
  render();
})();
