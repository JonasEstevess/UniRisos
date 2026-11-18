/* Uni Risos — regras da agenda compartilhadas pelo site e pelo app:
   horário de funcionamento, intervalo de almoço e geração dos horários livres. */
(function () {
  'use strict';
  var UR = (window.UR = window.UR || {});
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var toMin = function (t) { var p = String(t).split(':'); return +p[0] * 60 + (+p[1] || 0); };
  var toTime = function (m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };

  /* Padrão: o que está no Google Maps. A clínica pode mudar pelo app (fica salvo em config/agenda). */
  var DEFAULT = {
    step: 30,
    lunch: null,
    days: {
      0: { open: false, start: '09:00', end: '13:00' },
      1: { open: true, start: '09:00', end: '19:00' },
      2: { open: true, start: '09:00', end: '19:00' },
      3: { open: true, start: '09:00', end: '19:00' },
      4: { open: true, start: '09:00', end: '19:00' },
      5: { open: true, start: '09:00', end: '19:00' },
      6: { open: true, start: '09:00', end: '13:00' }
    }
  };
  var config = JSON.parse(JSON.stringify(DEFAULT));

  UR.nowSP = UR.nowSP || function () { return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })); };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var parse = function (s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };

  function syncLegacyHours() {
    /* O site antigo lê UR.hours no formato {dia: [abre, fecha]} */
    UR.hours = {};
    for (var d = 0; d < 7; d++) {
      var c = config.days[d];
      UR.hours[d] = c && c.open ? [toMin(c.start) / 60, toMin(c.end) / 60] : null;
    }
  }

  UR.agenda = {
    defaults: function () { return JSON.parse(JSON.stringify(DEFAULT)); },
    get: function () { return JSON.parse(JSON.stringify(config)); },
    set: function (c) {
      if (!c || !c.days) return;
      config = { step: c.step || 30, lunch: c.lunch || null, days: {} };
      for (var d = 0; d < 7; d++) config.days[d] = c.days[d] || c.days[String(d)] || DEFAULT.days[d];
      syncLegacyHours();
      document.dispatchEvent(new CustomEvent('ur:agenda'));
    },
    iso: iso,
    parse: parse,
    toMin: toMin,
    toTime: toTime,
    today: function () { return iso(UR.nowSP()); },
    /* Todos os horários do expediente de um dia (sem olhar ocupação) */
    times: function (dateIso) {
      var c = config.days[parse(dateIso).getDay()], out = [];
      if (!c || !c.open) return out;
      var l = config.lunch, ls = l ? toMin(l.start) : -1, le = l ? toMin(l.end) : -1;
      for (var m = toMin(c.start); m + config.step <= toMin(c.end); m += config.step) {
        if (l && m < le && m + config.step > ls) continue;
        out.push(toTime(m));
      }
      return out;
    },
    /* Horários com disponibilidade. taken = { 'AAAA-MM-DD': { 'HH:MM': 'consulta' | 'bloqueio' } } */
    slots: function (dateIso, taken) {
      var now = UR.nowSP(), isToday = iso(now) === dateIso, limit = now.getHours() * 60 + now.getMinutes() + 60;
      var busy = (taken && taken[dateIso]) || {};
      return UR.agenda.times(dateIso).map(function (t) {
        var why = busy[t] || (isToday && toMin(t) < limit ? 'passou' : null);
        return { time: t, free: !why, why: why || null };
      });
    },
    /* Próximos dias com pelo menos um horário livre (ou todos, com allDays) */
    days: function (count, taken, allDays) {
      var out = [], d = UR.nowSP();
      d.setHours(0, 0, 0, 0);
      for (var i = 0; out.length < count && i < count * 3; i++, d.setDate(d.getDate() + 1)) {
        var key = iso(d), s = UR.agenda.slots(key, taken), free = s.filter(function (x) { return x.free; }).length;
        if (allDays || free) out.push({ iso: key, date: new Date(d), free: free, total: s.length });
      }
      return out;
    },
    isOpenNow: function () {
      var now = UR.nowSP(), c = config.days[now.getDay()], m = now.getHours() * 60 + now.getMinutes();
      return !!(c && c.open && m >= toMin(c.start) && m < toMin(c.end));
    },
    describeDay: function (d) {
      var c = config.days[d];
      return c && c.open ? c.start + ' – ' + c.end : 'Fechado';
    }
  };
  syncLegacyHours();
})();
