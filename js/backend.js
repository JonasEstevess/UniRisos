/* Uni Risos — acesso a dados.
   Com js/firebase-config.js preenchido, usa Firebase (Auth + Firestore) e os dados são reais e compartilhados.
   Sem configuração (ou com ?demo=1 na URL), cai num modo de demonstração que guarda tudo só neste navegador. */
(function () {
  'use strict';
  var UR = window.UR, cfg = window.UR_FIREBASE || {};
  var SDK = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-';
  var demo = /[?&]demo=1\b/.test(location.search);
  var listeners = [], current = null, settled = false, resolveReady;
  var api = (UR.api = { mode: cfg.apiKey && !demo ? 'firebase' : 'local' });

  api.ready = new Promise(function (r) { resolveReady = r; });
  api.user = function () { return current; };
  api.onAuth = function (cb) { listeners.push(cb); if (settled) cb(current); };

  function emit(u) {
    current = u; settled = true; resolveReady();
    listeners.forEach(function (cb) { cb(u); });
    document.dispatchEvent(new CustomEvent('ur:auth'));
  }
  function fail(field, message, code) { var e = new Error(message); e.field = field; e.code = code; return e; }
  function todayIso() { return UR.agenda ? UR.agenda.today() : new Date().toISOString().slice(0, 10); }
  var slotId = function (date, time) { return date + '_' + time.replace(':', ''); };
  api.today = todayIso;

  /* Avisos (novo agendamento, cancelamento, confirmação) são enviados pelo servidor em /api/notify */
  var apiBase = (function () {
    var s = document.querySelector('script[src*="backend.js"]');
    return s ? s.src.replace(/js\/backend\.js.*$/, '') : '/';
  })();
  api.notify = function () { return Promise.resolve(); };

  /* ---------- Modo demonstração (localStorage) ---------- */
  function localImpl() {
    var S = UR.store;
    var read = function (k, f) { try { var v = localStorage.getItem('ur_' + k); return v ? JSON.parse(v) : f; } catch (e) { return f; } };
    var write = function (k, v) { try { localStorage.setItem('ur_' + k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };
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
    function pub(u) { return u ? { uid: u.email, name: u.name, email: u.email, phone: u.phone, admin: true } : null; }
    function find(email) { return S.users().filter(function (u) { return u.email === email; })[0]; }
    var newId = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
    var watchers = [];
    var fire = function () { watchers.forEach(function (w) { w(); }); };

    api.signUp = function (d) {
      if (find(d.email)) return Promise.reject(fail('email', 'Esse e-mail já tem conta. Use Entrar.'));
      var salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
      return hash(salt, d.pass).then(function (h) {
        var u = { name: d.name, email: d.email, phone: d.phone, salt: salt, hash: h };
        S.addUser(u); S.setSession(u.email); emit(pub(u)); return current;
      });
    };
    api.signIn = function (email, pass) {
      var u = find(email);
      if (!u) return Promise.reject(fail('email', 'Não encontramos uma conta com esse e-mail.'));
      return hash(u.salt, pass).then(function (h) {
        if (h !== u.hash) throw fail('pass', 'Senha incorreta. Tente de novo.');
        S.setSession(u.email); emit(pub(u)); return current;
      });
    };
    api.signOut = function () { S.setSession(null); emit(null); return Promise.resolve(); };
    api.resetPassword = function () { return Promise.resolve(); };
    api.updateProfile = function (p) {
      var all = S.users().map(function (u) { if (u.email === current.email) { u.name = p.name; u.phone = p.phone; } return u; });
      write('users', all); emit(pub(find(current.email))); return Promise.resolve(current);
    };
    api.deleteAccount = function () {
      write('users', S.users().filter(function (u) { return u.email !== current.email; }));
      S.setSession(null); emit(null); return Promise.resolve();
    };

    api.getConfig = function () { return Promise.resolve(read('agenda', null)); };
    api.saveConfig = function (c) { write('agenda', c); return Promise.resolve(); };

    api.takenRange = function (from, to) {
      var map = {};
      S.bookings().forEach(function (b) {
        if (b.status !== 'cancelado' && b.date >= from && b.date <= to) (map[b.date] = map[b.date] || {})[b.time] = 'consulta';
      });
      read('blocks', []).forEach(function (k) {
        if (k.date >= from && k.date <= to) k.times.forEach(function (t) { (map[k.date] = map[k.date] || {})[t] = map[k.date][t] || 'bloqueio'; });
      });
      return Promise.resolve(map);
    };
    function create(b, status) {
      return api.takenRange(b.date, b.date).then(function (m) {
        if (m[b.date] && m[b.date][b.time]) throw fail(null, 'Horário ocupado', 'taken');
        b.id = newId(); b.uid = current.uid; b.status = status; b.created = new Date().toISOString();
        S.addBooking(b); fire(); return b;
      });
    }
    api.createBooking = function (b) { return create(b, 'pendente'); };
    api.adminCreateBooking = function (b) { b.origem = b.origem || 'clinica'; return create(b, 'confirmado'); };
    api.myBookings = function () {
      return Promise.resolve(S.bookings().filter(function (b) { return b.uid === current.uid; }));
    };
    api.setStatus = function (b, status) { S.setStatus(b.id, status); fire(); return Promise.resolve(); };
    api.cancelBooking = function (b) { return api.setStatus(b, 'cancelado'); };
    api.watchAll = function (cb) {
      var run = function () { var from = todayIso(); cb(S.bookings().filter(function (b) { return b.date >= from; })); };
      watchers.push(run); run();
      return function () { watchers = watchers.filter(function (w) { return w !== run; }); };
    };
    api.blockSlots = function (date, times, reason) {
      return api.takenRange(date, date).then(function (m) {
        var busy = m[date] || {}, free = times.filter(function (t) { return !busy[t]; });
        var all = read('blocks', []);
        if (free.length) all.push({ id: newId(), date: date, times: free, reason: reason, allDay: free.length === UR.agenda.times(date).length });
        write('blocks', all); fire();
        return { created: free.length, skipped: times.length - free.length };
      });
    };
    api.listBlocks = function () {
      var from = todayIso();
      return Promise.resolve(read('blocks', []).filter(function (k) { return k.date >= from; }));
    };
    api.unblock = function (k) { write('blocks', read('blocks', []).filter(function (x) { return x.id !== k.id; })); fire(); return Promise.resolve(); };
    api.pushSupported = function () { return false; };
    api.savePush = function () { return Promise.reject(fail(null, 'Notificações funcionam com o servidor ligado.')); };
    api.removePush = function () { return Promise.resolve(); };
    api.hasPush = function () { return Promise.resolve(false); };
    emit(pub(find(S.session())));
  }

  /* ---------- Firebase ---------- */
  function loadScript(src) {
    return new Promise(function (ok, err) {
      var s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = function () { err(new Error('Falha ao carregar ' + src)); };
      document.head.appendChild(s);
    });
  }
  var AUTH_MSG = {
    'auth/email-already-in-use': ['email', 'Esse e-mail já tem conta. Use Entrar.'],
    'auth/invalid-email': ['email', 'Digite um e-mail válido.'],
    'auth/user-not-found': ['email', 'Não encontramos uma conta com esse e-mail.'],
    'auth/missing-email': ['email', 'Digite seu e-mail.'],
    'auth/wrong-password': ['pass', 'Senha incorreta. Tente de novo.'],
    'auth/invalid-credential': ['pass', 'E-mail ou senha incorretos.'],
    'auth/invalid-login-credentials': ['pass', 'E-mail ou senha incorretos.'],
    'auth/weak-password': ['pass', 'A senha precisa ter pelo menos 6 caracteres.'],
    'auth/requires-recent-login': ['pass', 'Por segurança, digite sua senha de novo.'],
    'auth/too-many-requests': ['pass', 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'],
    'auth/network-request-failed': ['pass', 'Sem conexão. Verifique sua internet e tente de novo.']
  };
  function authErr(e) {
    var m = AUTH_MSG[e && e.code];
    return m ? fail(m[0], m[1], e.code) : fail('pass', 'Não foi possível concluir. Tente de novo em instantes.', e && e.code);
  }
  function b64ToBytes(s) {
    var pad = '='.repeat((4 - (s.length % 4)) % 4), b = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
    return out;
  }
  function hashId(text) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < text.length; i++) { var c = text.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    return ((h2 >>> 0).toString(36) + (h1 >>> 0).toString(36));
  }

  function firebaseImpl() {
    return loadScript(SDK + 'app-compat.js')
      .then(function () { return Promise.all([loadScript(SDK + 'auth-compat.js'), loadScript(SDK + 'firestore-compat.js')]); })
      .then(function () {
        var fb = window.firebase;
        fb.initializeApp(cfg);
        var auth = fb.auth(), db = fb.firestore(), pendingProfile = null, FV = fb.firestore.FieldValue;
        var fromDoc = function (d) { var o = d.data(); o.id = d.id; return o; };
        auth.languageCode = 'pt';

        auth.onAuthStateChanged(function (fu) {
          if (!fu) { emit(null); return; }
          var profile = pendingProfile ? Promise.resolve(pendingProfile)
            : db.doc('users/' + fu.uid).get().then(function (d) { return d.data() || {}; }).catch(function () { return {}; });
          var admin = db.doc('admins/' + fu.uid).get().then(function (d) { return d.exists; }).catch(function () { return false; });
          Promise.all([profile, admin]).then(function (r) {
            emit({ uid: fu.uid, email: fu.email, name: r[0].name || fu.displayName || fu.email.split('@')[0], phone: r[0].phone || '', admin: r[1] });
          });
        });

        api.notify = function (bookingId, event) {
          var u = auth.currentUser;
          if (!u) return Promise.resolve();
          return u.getIdToken().then(function (token) {
            return fetch(apiBase + 'api/notify', {
              method: 'POST', keepalive: true,
              headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
              body: JSON.stringify({ bookingId: bookingId, event: event })
            });
          }).catch(function () { /* o aviso é um extra; o agendamento já está salvo */ });
        };

        api.signUp = function (d) {
          pendingProfile = { name: d.name, phone: d.phone };
          return auth.createUserWithEmailAndPassword(d.email, d.pass).then(function (cred) {
            return Promise.all([
              cred.user.updateProfile({ displayName: d.name }),
              db.doc('users/' + cred.user.uid).set({
                name: d.name, phone: d.phone, email: d.email, created: FV.serverTimestamp(),
                consent: { privacy: true, at: FV.serverTimestamp(), version: '2026-11-18' }
              })
            ]);
          }).then(function () {
            var fu = auth.currentUser; pendingProfile = null;
            emit({ uid: fu.uid, email: fu.email, name: d.name, phone: d.phone, admin: false });
            return current;
          }).catch(function (e) { pendingProfile = null; throw authErr(e); });
        };
        api.signIn = function (email, pass) { return auth.signInWithEmailAndPassword(email, pass).catch(function (e) { throw authErr(e); }); };
        api.signOut = function () { return auth.signOut(); };
        api.resetPassword = function (email) {
          return auth.sendPasswordResetEmail(email).catch(function (e) {
            /* Não revela se o e-mail tem conta */
            if (e && e.code === 'auth/user-not-found') return;
            throw authErr(e);
          });
        };
        api.updateProfile = function (p) {
          var u = auth.currentUser;
          return Promise.all([
            u.updateProfile({ displayName: p.name }),
            db.doc('users/' + u.uid).set({ name: p.name, phone: p.phone, email: u.email }, { merge: true })
          ]).then(function () {
            emit({ uid: u.uid, email: u.email, name: p.name, phone: p.phone, admin: current.admin });
            return current;
          });
        };
        /* LGPD: o paciente apaga a própria conta. Consultas futuras são canceladas e o horário é liberado. */
        api.deleteAccount = function (pass) {
          var u = auth.currentUser;
          var cred = fb.auth.EmailAuthProvider.credential(u.email, pass);
          return u.reauthenticateWithCredential(cred).catch(function (e) { throw authErr(e); }).then(function () {
            return api.myBookings();
          }).then(function (list) {
            var today = todayIso(), batch = db.batch();
            list.forEach(function (b) {
              if (b.status !== 'cancelado' && b.date >= today) {
                batch.update(db.doc('bookings/' + b.id), { status: 'cancelado', canceladoPor: 'paciente' });
                batch.delete(db.doc('slots/' + slotId(b.date, b.time)));
              }
            });
            return batch.commit();
          }).then(function () {
            return db.collection('pushSubs').where('uid', '==', u.uid).get();
          }).then(function (s) {
            var batch = db.batch();
            s.forEach(function (d) { batch.delete(d.ref); });
            batch.delete(db.doc('users/' + u.uid));
            return batch.commit();
          }).then(function () { return u.delete(); });
        };

        api.getConfig = function () {
          return db.doc('config/agenda').get().then(function (d) { return d.exists ? d.data() : null; }).catch(function () { return null; });
        };
        api.saveConfig = function (c) { return db.doc('config/agenda').set(c); };

        api.takenRange = function (from, to) {
          return db.collection('slots').where('date', '>=', from).where('date', '<=', to).get().then(function (snap) {
            var map = {};
            snap.forEach(function (d) { var s = d.data(); (map[s.date] = map[s.date] || {})[s.time] = s.type === 'bloqueio' ? 'bloqueio' : 'consulta'; });
            return map;
          });
        };
        /* Horário e consulta são gravados juntos: se o horário já existir, a gravação inteira é recusada */
        function create(b, status) {
          var ref = db.collection('bookings').doc(), batch = db.batch();
          b.uid = current.uid; b.status = status;
          batch.set(db.doc('slots/' + slotId(b.date, b.time)), { date: b.date, time: b.time, uid: b.uid, bookingId: ref.id, type: 'consulta' });
          var data = {}; Object.keys(b).forEach(function (k) { data[k] = b[k]; });
          data.created = FV.serverTimestamp();
          batch.set(ref, data);
          return batch.commit().then(function () { b.id = ref.id; return b; }).catch(function (e) {
            throw e.code === 'permission-denied' ? fail(null, 'Horário ocupado', 'taken') : fail(null, 'Sem conexão com o servidor. Tente de novo.');
          });
        }
        api.createBooking = function (b) {
          return create(b, 'pendente').then(function (r) { api.notify(r.id, 'novo'); return r; });
        };
        api.adminCreateBooking = function (b) { b.origem = b.origem || 'clinica'; return create(b, 'confirmado'); };
        api.myBookings = function () {
          return db.collection('bookings').where('uid', '==', current.uid).get().then(function (s) { return s.docs.map(fromDoc); });
        };
        api.setStatus = function (b, status) {
          var batch = db.batch(), patch = { status: status };
          if (status === 'cancelado') patch.canceladoPor = current.admin ? 'clinica' : 'paciente';
          batch.update(db.doc('bookings/' + b.id), patch);
          if (status === 'cancelado') batch.delete(db.doc('slots/' + slotId(b.date, b.time)));
          return batch.commit().then(function () {
            /* Consulta lançada pela própria clínica não tem paciente com conta para avisar */
            if (b.origem !== 'clinica' || !current.admin) api.notify(b.id, status);
          });
        };
        api.cancelBooking = function (b) { return api.setStatus(b, 'cancelado'); };
        api.watchAll = function (cb, onError) {
          return db.collection('bookings').where('date', '>=', todayIso()).onSnapshot(function (s) { cb(s.docs.map(fromDoc)); }, onError);
        };

        /* Bloqueios: ocupam os horários em "slots", então ninguém consegue agendar neles */
        api.blockSlots = function (date, times, reason) {
          return api.takenRange(date, date).then(function (m) {
            var busy = m[date] || {}, free = times.filter(function (t) { return !busy[t]; });
            if (!free.length) return { created: 0, skipped: times.length };
            var ref = db.collection('blocks').doc(), batch = db.batch();
            free.forEach(function (t) {
              batch.set(db.doc('slots/' + slotId(date, t)), { date: date, time: t, uid: current.uid, type: 'bloqueio', blockId: ref.id });
            });
            batch.set(ref, {
              date: date, times: free, reason: reason, uid: current.uid, created: FV.serverTimestamp(),
              allDay: free.length === UR.agenda.times(date).length
            });
            return batch.commit().then(function () { return { created: free.length, skipped: times.length - free.length }; });
          });
        };
        api.listBlocks = function () {
          return db.collection('blocks').where('date', '>=', todayIso()).get().then(function (s) { return s.docs.map(fromDoc); });
        };
        api.unblock = function (k) {
          var batch = db.batch();
          k.times.forEach(function (t) { batch.delete(db.doc('slots/' + slotId(k.date, t))); });
          batch.delete(db.doc('blocks/' + k.id));
          return batch.commit();
        };

        /* Notificações no celular (Web Push). A chave pública fica em js/firebase-config.js */
        api.pushSupported = function () {
          return !!(window.UR_PUSH_KEY && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
        };
        function currentSub() {
          return navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); });
        }
        api.hasPush = function () {
          if (!api.pushSupported() || Notification.permission !== 'granted') return Promise.resolve(false);
          return currentSub().then(function (s) {
            if (!s) return false;
            return db.doc('pushSubs/' + hashId(s.endpoint)).get().then(function (d) { return d.exists && d.data().uid === current.uid; }).catch(function () { return false; });
          });
        };
        api.savePush = function (role) {
          if (!api.pushSupported()) return Promise.reject(fail(null, 'Este aparelho não aceita notificações pelo navegador. No iPhone, instale o app na tela inicial primeiro.'));
          return Notification.requestPermission().then(function (perm) {
            if (perm !== 'granted') throw fail(null, 'As notificações foram bloqueadas. Libere nas configurações do navegador.');
            return navigator.serviceWorker.ready;
          }).then(function (reg) {
            return reg.pushManager.getSubscription().then(function (s) {
              return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(window.UR_PUSH_KEY) });
            });
          }).then(function (s) {
            return db.doc('pushSubs/' + hashId(s.endpoint)).set({
              uid: current.uid, role: role || 'paciente', sub: JSON.stringify(s), ua: navigator.userAgent.slice(0, 160), created: FV.serverTimestamp()
            });
          });
        };
        api.removePush = function () {
          if (!api.pushSupported()) return Promise.resolve();
          return currentSub().then(function (s) {
            if (!s) return;
            return db.doc('pushSubs/' + hashId(s.endpoint)).delete().catch(function () {}).then(function () { return s.unsubscribe(); });
          });
        };
      })
      .catch(function (e) {
        console.error('[Uni Risos] Firebase indisponível, usando modo de demonstração.', e);
        api.mode = 'local'; localImpl();
      });
  }

  var started = api.mode === 'firebase' ? firebaseImpl() : (localImpl(), Promise.resolve());
  /* Carrega o horário de funcionamento salvo pela clínica */
  started.then(function () { return api.getConfig(); }).then(function (c) { if (c && UR.agenda) UR.agenda.set(c); });
})();
