/* Uni Risos — agendamento em 4 etapas: tratamento, dia, horário, dados */
(function () {
  'use strict';
  var UR = window.UR, api = UR.api, esc = UR.esc;
  var body = document.getElementById('bookingBody'), stepsEl = document.getElementById('steps');
  var back = document.getElementById('bkBack'), next = document.getElementById('bkNext'), summary = document.getElementById('bkSummary');
  var foot = next.parentElement;
  var state = { step: 0, service: null, date: null, time: null, form: { name: '', phone: '', note: '' } };
  var taken = {}, loaded = false, busy = false, pending = false, finished = false;

  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var serviceOf = function (id) { return UR.services.filter(function (s) { return s.id === id; })[0]; };

  /* Busca no servidor os horários já ocupados (consultas e bloqueios) nas próximas semanas.
     Espera o servidor terminar de carregar antes de consultar. */
  function refresh() {
    var a = UR.nowSP(), b = UR.nowSP();
    b.setDate(b.getDate() + 45);
    return api.ready.then(function () { return api.takenRange(iso(a), iso(b)); })
      .then(function (map) { taken = map; loaded = true; })
      .catch(function () { loaded = true; UR.toast('Não foi possível carregar a agenda. Verifique sua conexão.'); })
      .then(function () { if (!finished) render(); });
  }

  /* Horários do expediente configurado pela clínica, sem os que já passaram, os ocupados e os bloqueados */
  function slotsFor(dateIso) { return UR.agenda.slots(dateIso, taken); }
  function days() {
    var out = [], d = UR.nowSP();
    d.setHours(0, 0, 0, 0);
    for (var i = 0; out.length < 18 && i < 40; i++, d.setDate(d.getDate() + 1)) {
      var key = iso(d);
      if (slotsFor(key).some(function (s) { return s.free; })) out.push({ iso: key, date: new Date(d) });
    }
    return out;
  }

  var views = [
    function () {
      return '<div class="opt-grid">' + UR.services.map(function (s) {
        return '<button type="button" class="opt' + (state.service === s.id ? ' is-on' : '') + '" data-k="service" data-v="' + s.id + '">' +
          '<b>' + s.name + '</b><small>30 min</small></button>';
      }).join('') + '</div><p class="hint" style="margin-top:16px">Não sabe qual escolher? Marque <b>Avaliação e limpeza</b> e a Dra. Jaqueline orienta você.</p>';
    },
    function () {
      if (!loaded) return '<p class="hint">Carregando a agenda…</p>';
      var wd = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'], mo = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      return '<div class="opt-grid day-grid">' + days().map(function (d) {
        return '<button type="button" class="opt day' + (state.date === d.iso ? ' is-on' : '') + '" data-k="date" data-v="' + d.iso + '">' +
          '<small>' + wd[d.date.getDay()] + '</small><b>' + d.date.getDate() + '</b><small>' + mo[d.date.getMonth()] + '</small></button>';
      }).join('') + '</div>';
    },
    function () {
      var groups = { 'Manhã': [], 'Tarde': [] };
      slotsFor(state.date).forEach(function (s) { groups[s.time < '12:00' ? 'Manhã' : 'Tarde'].push(s); });
      return Object.keys(groups).filter(function (g) { return groups[g].length; }).map(function (g) {
        return '<p class="period">' + g + '</p><div class="opt-grid time-grid">' + groups[g].map(function (s) {
          return '<button type="button" class="opt time' + (state.time === s.time ? ' is-on' : '') + '" data-k="time" data-v="' + s.time + '"' +
            (s.free ? '' : ' disabled aria-label="' + s.time + ' indisponível"') + '>' + s.time + '</button>';
        }).join('') + '</div>';
      }).join('');
    },
    function () {
      var u = api.user(), f = state.form;
      if (u && !f.name) { f.name = u.name; f.phone = u.phone; }
      return '<form class="form" id="bkForm" novalidate>' +
        '<div class="form-row">' +
        '<label class="field">Nome completo<input id="bkName" name="name" autocomplete="name" value="' + esc(f.name) + '"><span class="err" id="bkNameErr"></span></label>' +
        '<label class="field">WhatsApp<input id="bkPhone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="(11) 90000-0000" value="' + esc(UR.maskPhone(f.phone)) + '"><span class="err" id="bkPhoneErr"></span></label>' +
        '</div>' +
        '<label class="field">Observação (opcional)<textarea id="bkNote" name="note" placeholder="Ex.: dor em um dente, primeira consulta, consulta para criança">' + esc(f.note) + '</textarea></label>' +
        (u ? '<p class="hint">Agendando como <b>' + esc(u.email) + '</b>.</p>'
          : '<p class="hint">Para reservar o horário você entra ou cria sua conta no próximo passo. Leva menos de um minuto.</p>') +
        '</form>';
    }
  ];

  function ready() { return [state.service, state.date, state.time, true][state.step]; }

  function render() {
    Array.prototype.forEach.call(stepsEl.children, function (li, i) {
      li.className = i === state.step ? 'is-active' : i < state.step ? 'is-done' : '';
    });
    body.innerHTML = views[state.step]();
    foot.hidden = false;
    back.hidden = state.step === 0;
    next.textContent = state.step < 3 ? 'Continuar' : busy ? 'Reservando…' : api.user() ? 'Confirmar agendamento' : 'Entrar e confirmar';
    next.disabled = !ready() || busy;
    var parts = [];
    if (state.service) parts.push(serviceOf(state.service).name);
    if (state.date) parts.push(UR.fmtDate(state.date));
    if (state.time) parts.push(state.time);
    summary.textContent = parts.join(' · ');
  }

  function go(step) { finished = false; state.step = step; render(); }

  function saveForm() {
    var n = document.getElementById('bkName');
    if (!n) return;
    state.form = { name: n.value.trim(), phone: document.getElementById('bkPhone').value, note: document.getElementById('bkNote').value.trim() };
  }

  function confirm() {
    if (busy) return;
    saveForm();
    var f = state.form;
    var nameErr = f.name.length < 3 ? 'Digite seu nome completo.' : '';
    var phoneErr = UR.digits(f.phone).length < 10 ? 'Digite o WhatsApp com DDD.' : '';
    document.getElementById('bkNameErr').textContent = nameErr;
    document.getElementById('bkPhoneErr').textContent = phoneErr;
    if (nameErr || phoneErr) { document.getElementById(nameErr ? 'bkName' : 'bkPhone').focus(); return; }
    if (!api.user()) { pending = true; UR.auth.open('signup', { name: f.name, phone: f.phone }); return; }

    busy = true; render();
    api.createBooking({
      service: state.service, serviceName: serviceOf(state.service).name,
      date: state.date, time: state.time, name: f.name, phone: UR.digits(f.phone), note: f.note
    }).then(function (b) {
      busy = false;
      document.dispatchEvent(new CustomEvent('ur:booking'));
      done(b);
      refresh();
    }).catch(function (e) {
      busy = false;
      if (e.code === 'taken') {
        UR.toast('Esse horário acabou de ser ocupado. Escolha outro.');
        state.time = null; state.step = 2;
        refresh();
      } else { UR.toast(e.message || 'Não foi possível agendar. Tente de novo.'); render(); }
    });
  }

  function done(b) {
    finished = true;
    Array.prototype.forEach.call(stepsEl.children, function (li) { li.className = 'is-done'; });
    foot.hidden = true;
    body.innerHTML = '<div class="done">' +
      '<svg viewBox="0 0 120 60" aria-hidden="true"><path d="M8 10 C 28 62, 92 62, 112 10" pathLength="100"/></svg>' +
      '<h3>Horário reservado, ' + esc(b.name.split(' ')[0]) + '!</h3>' +
      '<p>Seu pedido já está na agenda da clínica. A equipe confirma com você pelo WhatsApp; se quiser, adiante o contato pelo botão abaixo.</p>' +
      '<div class="ticket">' +
      '<div><span>Tratamento</span><b>' + esc(b.serviceName) + '</b></div>' +
      '<div><span>Dia</span><b>' + UR.fmtDate(b.date) + '</b></div>' +
      '<div><span>Horário</span><b>' + b.time + '</b></div>' +
      '<div><span>Local</span><b>Av. Felipe Carrillo Puerto, 400</b></div></div>' +
      '<div class="done-actions">' +
      '<a class="btn btn-sage btn-lg" href="' + UR.whatsLink(b) + '" target="_blank" rel="noopener">Avisar no WhatsApp →</a>' +
      '<button class="btn btn-ghost-light btn-lg" type="button" id="bkMine">Minhas consultas</button>' +
      '<button class="btn btn-ghost-light btn-lg" type="button" id="bkAgain">Novo agendamento</button></div></div>';
    state = { step: 0, service: null, date: null, time: null, form: { name: '', phone: '', note: '' } };
  }

  body.addEventListener('click', function (e) {
    var opt = e.target.closest('.opt');
    if (opt && !opt.disabled) {
      var k = opt.dataset.k;
      if (state[k] !== opt.dataset.v) {
        if (k === 'date') state.time = null;
        state[k] = opt.dataset.v;
      }
      go(state.step + 1);
      return;
    }
    if (e.target.id === 'bkAgain') go(0);
    if (e.target.id === 'bkMine') UR.auth.open();
  });
  body.addEventListener('input', function (e) {
    if (e.target.id === 'bkPhone') e.target.value = UR.maskPhone(e.target.value);
  });
  body.addEventListener('submit', function (e) { e.preventDefault(); confirm(); });
  back.addEventListener('click', function () { saveForm(); go(state.step - 1); });
  next.addEventListener('click', function () { if (state.step === 3) confirm(); else go(state.step + 1); });

  /* Depois de entrar ou criar a conta no meio do fluxo, conclui o agendamento sozinho */
  document.addEventListener('ur:auth', function () {
    if (finished) return;
    if (state.step === 3) saveForm();
    render();
    if (pending && api.user() && state.step === 3) { pending = false; UR.auth.close(); confirm(); }
  });
  document.addEventListener('ur:authclosed', function () { pending = false; });

  UR.booking = { pick: function (id) { state.service = id; go(1); } };
  render();
  refresh();
  /* Atualiza a disponibilidade quando a pessoa volta para a aba */
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !finished) refresh(); });
})();
