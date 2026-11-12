/* Uni Risos — persistência local.
   Ponto único de leitura e escrita: para ir a produção, troque estas funções por chamadas a uma API. */
(function () {
  'use strict';
  var UR = (window.UR = window.UR || {});
  var mem = {};

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem('ur_' + key);
      return raw ? JSON.parse(raw) : (key in mem ? mem[key] : fallback);
    } catch (e) { return key in mem ? mem[key] : fallback; }
  }
  function write(key, value) {
    mem[key] = value;
    try { localStorage.setItem('ur_' + key, JSON.stringify(value)); } catch (e) { /* segue só em memória */ }
  }

  UR.store = {
    bookings: function () { return read('bookings', []); },
    addBooking: function (b) { var all = read('bookings', []); all.push(b); write('bookings', all); },
    cancelBooking: function (id) {
      write('bookings', read('bookings', []).map(function (b) { if (b.id === id) b.status = 'cancelado'; return b; }));
    },
    users: function () { return read('users', []); },
    addUser: function (u) { var all = read('users', []); all.push(u); write('users', all); },
    session: function () { return read('session', null); },
    setSession: function (email) { write('session', email); }
  };

  UR.digits = function (s) { return String(s || '').replace(/\D/g, ''); };
  UR.maskPhone = function (s) {
    var d = UR.digits(s).slice(0, 11);
    if (d.length < 3) return d;
    if (d.length < 7) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    var cut = d.length === 11 ? 7 : 6;
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, cut) + '-' + d.slice(cut);
  };
  UR.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  UR.fmtDate = function (iso) {
    var p = iso.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
    var s = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  UR.whatsLink = function (b) {
    var msg = 'Olá! Fiz um agendamento pelo site da Uni Risos.\n\n' +
      'Tratamento: ' + b.serviceName + '\nDia: ' + UR.fmtDate(b.date) + '\nHorário: ' + b.time +
      '\nNome: ' + b.name + (b.note ? '\nObservação: ' + b.note : '') + '\n\nPodem confirmar, por favor?';
    return 'https://wa.me/5511964008106?text=' + encodeURIComponent(msg);
  };
})();
