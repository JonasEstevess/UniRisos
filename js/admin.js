/* Uni Risos — painel da clínica: agenda em tempo real, confirmar e cancelar consultas */
(function () {
  'use strict';
  var UR = window.UR, api = UR.api, esc = UR.esc;
  var main = document.getElementById('adMain'), who = document.getElementById('adWho'), out = document.getElementById('adOut');
  var toastEl = document.getElementById('toast'), toastT;
  var list = null, stop = null, showCancelled = false, pendingCancel = null;

  UR.toast = function (msg) {
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3200);
  };

  function loginView(err) {
    main.innerHTML = '<section class="admin-card admin-login"><h1>Painel da clínica</h1>' +
      '<p class="sub">Entre com a conta da clínica para ver a agenda.</p>' +
      '<form class="form" id="adForm" novalidate>' +
      '<label class="field">E-mail<input id="adEmail" type="email" autocomplete="email"></label>' +
      '<label class="field">Senha<input id="adPass" type="password" autocomplete="current-password"><span class="err" id="adErr">' + esc(err || '') + '</span></label>' +
      '<button class="btn btn-sage btn-lg btn-block" type="submit">Entrar</button></form></section>';
  }

  function deniedView(u) {
    main.innerHTML = '<section class="admin-card admin-login"><h1>Sem acesso</h1>' +
      '<p class="sub">A conta <b>' + esc(u.email) + '</b> não está liberada para o painel.</p>' +
      '<p class="hint">Para liberar, crie no Firestore o documento <code>admins/' + esc(u.uid) + '</code> (pode ficar vazio) e recarregue esta página.</p></section>';
  }

  function patientLink(b) {
    var msg = 'Olá, ' + b.name.split(' ')[0] + '! Aqui é da Uni Risos. Confirmando sua consulta de ' + b.serviceName +
      ' em ' + UR.fmtDate(b.date) + ' às ' + b.time + '.';
    return 'https://wa.me/55' + UR.digits(b.phone) + '?text=' + encodeURIComponent(msg);
  }

  function row(b) {
    var labels = { pendente: 'Pendente', confirmado: 'Confirmada', cancelado: 'Cancelada' };
    return '<article class="ad-row s-' + esc(b.status) + '">' +
      '<div class="ad-time">' + esc(b.time) + '</div>' +
      '<div class="ad-info"><b>' + esc(b.name) + '</b><span>' + esc(b.serviceName) + ' · ' + esc(UR.maskPhone(b.phone)) + '</span>' +
      (b.note ? '<span class="ad-note">“' + esc(b.note) + '”</span>' : '') + '</div>' +
      '<span class="appt-status s-' + esc(b.status) + '">' + (labels[b.status] || esc(b.status)) + '</span>' +
      '<div class="ad-actions">' +
      '<a class="btn btn-ghost-light" href="' + patientLink(b) + '" target="_blank" rel="noopener">WhatsApp</a>' +
      (b.status === 'pendente' ? '<button class="btn btn-sage" type="button" data-confirm="' + b.id + '">Confirmar</button>' : '') +
      (b.status !== 'cancelado' ? '<button class="btn btn-ghost-light danger" type="button" data-cancel="' + b.id + '">' +
        (pendingCancel === b.id ? 'Toque de novo' : 'Cancelar') + '</button>' : '') +
      '</div></article>';
  }

  function agendaView() {
    if (!list) { main.innerHTML = '<p class="hint">Carregando a agenda…</p>'; return; }
    var today = api.today();
    var active = list.filter(function (b) { return b.status !== 'cancelado'; });
    var shown = (showCancelled ? list : active).slice().sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    var byDay = {}, days = [];
    shown.forEach(function (b) { if (!byDay[b.date]) { byDay[b.date] = []; days.push(b.date); } byDay[b.date].push(b); });
    var count = function (fn) { return active.filter(fn).length; };

    main.innerHTML = '<div class="ad-stats">' +
      '<div><b>' + count(function (b) { return b.date === today; }) + '</b><span>consultas hoje</span></div>' +
      '<div><b>' + count(function (b) { return b.status === 'pendente'; }) + '</b><span>aguardando confirmação</span></div>' +
      '<div><b>' + active.length + '</b><span>próximas consultas</span></div></div>' +
      '<label class="ad-toggle"><input type="checkbox" id="adCancelled"' + (showCancelled ? ' checked' : '') + '> Mostrar canceladas</label>' +
      (api.mode === 'local' ? '<p class="hint">Modo de demonstração: esta agenda mostra só os agendamentos feitos neste navegador.</p>' : '') +
      (days.length ? days.map(function (d) {
        return '<section class="ad-day"><h2>' + (d === today ? 'Hoje · ' : '') + UR.fmtDate(d) + '</h2>' + byDay[d].map(row).join('') + '</section>';
      }).join('') : '<div class="admin-card"><p>Nenhuma consulta agendada a partir de hoje.</p></div>');
  }

  api.onAuth(function (u) {
    if (stop) { stop(); stop = null; }
    list = null;
    who.textContent = u ? u.email : '';
    out.hidden = !u;
    if (!u) { loginView(); return; }
    if (!u.admin) { deniedView(u); return; }
    agendaView();
    stop = api.watchAll(function (items) { list = items; agendaView(); }, function () { UR.toast('Não foi possível carregar a agenda.'); });
  });

  out.addEventListener('click', function () { api.signOut(); });
  main.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = document.getElementById('adEmail').value.trim().toLowerCase(), pass = document.getElementById('adPass').value;
    api.signIn(email, pass).catch(function (err) { document.getElementById('adErr').textContent = err.message; });
  });
  main.addEventListener('change', function (e) { if (e.target.id === 'adCancelled') { showCancelled = e.target.checked; agendaView(); } });
  main.addEventListener('click', function (e) {
    var t = e.target, find = function (id) { return (list || []).filter(function (b) { return b.id === id; })[0]; };
    var refresh = function () { if (api.mode === 'local') { stop = api.watchAll(function (items) { list = items; agendaView(); }); } };
    if (t.dataset.confirm) {
      api.setStatus(find(t.dataset.confirm), 'confirmado').then(function () { UR.toast('Consulta confirmada.'); refresh(); })
        .catch(function () { UR.toast('Não foi possível confirmar.'); });
    }
    if (t.dataset.cancel) {
      if (pendingCancel !== t.dataset.cancel) { pendingCancel = t.dataset.cancel; agendaView(); return; }
      pendingCancel = null;
      api.setStatus(find(t.dataset.cancel), 'cancelado').then(function () { UR.toast('Consulta cancelada e horário liberado.'); refresh(); })
        .catch(function () { UR.toast('Não foi possível cancelar.'); });
    }
  });
})();
