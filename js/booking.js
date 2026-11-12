/* Uni Risos — agendamento em 4 etapas: tratamento, dia, horário, dados */
(function () {
  'use strict';
  var UR = window.UR, esc = UR.esc;
  var body = document.getElementById('bookingBody'), stepsEl = document.getElementById('steps');
  var back = document.getElementById('bkBack'), next = document.getElementById('bkNext'), summary = document.getElementById('bkSummary');
  var foot = next.parentElement;
  var state = { step: 0, service: null, date: null, time: null, form: { name: '', phone: '', note: '' } };

  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var serviceOf = function (id) { return UR.services.filter(function (s) { return s.id === id; })[0]; };

  /* Horários de 30 em 30 minutos dentro do expediente; some o que já passou ou já foi reservado */
  function slotsFor(dateIso) {
    var p = dateIso.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]), h = UR.hours[d.getDay()];
    if (!h) return [];
    var now = UR.nowSP(), isToday = iso(now) === dateIso, limit = now.getHours() * 60 + now.getMinutes() + 60;
    var taken = {};
    UR.store.bookings().forEach(function (b) { if (b.date === dateIso && b.status !== 'cancelado') taken[b.time] = 1; });
    var out = [];
    for (var m = h[0] * 60; m < h[1] * 60; m += 30) {
      var t = pad(Math.floor(m / 60)) + ':' + pad(m % 60);
      out.push({ time: t, free: !taken[t] && !(isToday && m < limit) });
    }
    return out;
  }
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
      var u = UR.auth && UR.auth.user(), f = state.form;
      if (u && !f.name) { f.name = u.name; f.phone = u.phone; }
      return '<form class="form" id="bkForm" novalidate>' +
        '<div class="form-row">' +
        '<label class="field">Nome completo<input id="bkName" name="name" autocomplete="name" value="' + esc(f.name) + '"><span class="err" id="bkNameErr"></span></label>' +
        '<label class="field">WhatsApp<input id="bkPhone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="(11) 90000-0000" value="' + esc(f.phone) + '"><span class="err" id="bkPhoneErr"></span></label>' +
        '</div>' +
        '<label class="field">Observação (opcional)<textarea id="bkNote" name="note" placeholder="Ex.: dor em um dente, primeira consulta, consulta para criança">' + esc(f.note) + '</textarea></label>' +
        (UR.auth && !u ? '<p class="hint">Já tem cadastro? <button type="button" id="bkLogin">Entre</button> para preencher automaticamente e acompanhar suas consultas.</p>' : '') +
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
    next.textContent = state.step === 3 ? 'Confirmar agendamento' : 'Continuar';
    next.disabled = !ready();
    var parts = [];
    if (state.service) parts.push(serviceOf(state.service).name);
    if (state.date) parts.push(UR.fmtDate(state.date));
    if (state.time) parts.push(state.time);
    summary.textContent = parts.join(' · ');
  }

  function go(step) { state.step = step; render(); }

  function saveForm() {
    var n = document.getElementById('bkName');
    if (!n) return;
    state.form = { name: n.value.trim(), phone: document.getElementById('bkPhone').value, note: document.getElementById('bkNote').value.trim() };
  }

  function confirm() {
    saveForm();
    var f = state.form, ok = true;
    var nameErr = f.name.length < 3 ? 'Digite seu nome completo.' : '';
    var phoneErr = UR.digits(f.phone).length < 10 ? 'Digite o WhatsApp com DDD.' : '';
    document.getElementById('bkNameErr').textContent = nameErr;
    document.getElementById('bkPhoneErr').textContent = phoneErr;
    if (nameErr || phoneErr) { document.getElementById(nameErr ? 'bkName' : 'bkPhone').focus(); return; }
    if (!slotsFor(state.date).some(function (s) { return s.time === state.time && s.free; })) {
      UR.toast('Esse horário acabou de ser ocupado. Escolha outro.');
      state.time = null; go(2); return;
    }
    var u = UR.auth && UR.auth.user();
    var b = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      service: state.service, serviceName: serviceOf(state.service).name,
      date: state.date, time: state.time, name: f.name, phone: UR.digits(f.phone), note: f.note,
      user: u ? u.email : null, status: 'pendente', created: new Date().toISOString()
    };
    UR.store.addBooking(b);
    document.dispatchEvent(new CustomEvent('ur:booking'));
    done(b);
  }

  function done(b) {
    Array.prototype.forEach.call(stepsEl.children, function (li) { li.className = 'is-done'; });
    foot.hidden = true;
    body.innerHTML = '<div class="done">' +
      '<svg viewBox="0 0 120 60" aria-hidden="true"><path d="M8 10 C 28 62, 92 62, 112 10" pathLength="100"/></svg>' +
      '<h3>Pedido registrado, ' + esc(b.name.split(' ')[0]) + '!</h3>' +
      '<p>Falta um passo: envie o pedido para a clínica pelo WhatsApp. É por lá que a equipe confirma o seu horário.</p>' +
      '<div class="ticket">' +
      '<div><span>Tratamento</span><b>' + esc(b.serviceName) + '</b></div>' +
      '<div><span>Dia</span><b>' + UR.fmtDate(b.date) + '</b></div>' +
      '<div><span>Horário</span><b>' + b.time + '</b></div>' +
      '<div><span>Local</span><b>Av. Felipe Carrillo Puerto, 400</b></div></div>' +
      '<div class="done-actions">' +
      '<a class="btn btn-sage btn-lg" href="' + UR.whatsLink(b) + '" target="_blank" rel="noopener">Enviar no WhatsApp →</a>' +
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
    if (e.target.id === 'bkLogin') { saveForm(); UR.auth.open(); }
  });
  body.addEventListener('input', function (e) {
    if (e.target.id === 'bkPhone') e.target.value = UR.maskPhone(e.target.value);
  });
  body.addEventListener('submit', function (e) { e.preventDefault(); confirm(); });
  back.addEventListener('click', function () { saveForm(); go(state.step - 1); });
  next.addEventListener('click', function () { if (state.step === 3) confirm(); else go(state.step + 1); });
  document.addEventListener('ur:auth', function () { if (state.step === 3) { saveForm(); if (!state.form.name) state.form = { name: '', phone: '', note: state.form.note }; render(); } });

  UR.booking = { pick: function (id) { state.service = id; go(1); } };
  render();
})();
