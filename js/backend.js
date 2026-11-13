/* Uni Risos — acesso a dados.
   Com js/firebase-config.js preenchido, usa Firebase (Auth + Firestore) e os dados são reais e compartilhados.
   Sem configuração, cai num modo de demonstração que guarda tudo só neste navegador. */
(function () {
  'use strict';
  var UR = window.UR, cfg = window.UR_FIREBASE || {};
  var SDK = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-';
  var listeners = [], current = null, settled = false, resolveReady;
  var api = (UR.api = { mode: cfg.apiKey ? 'firebase' : 'local' });

  api.ready = new Promise(function (r) { resolveReady = r; });
  api.user = function () { return current; };
  api.onAuth = function (cb) { listeners.push(cb); if (settled) cb(current); };

  function emit(u) {
    current = u; settled = true; resolveReady();
    listeners.forEach(function (cb) { cb(u); });
    document.dispatchEvent(new CustomEvent('ur:auth'));
  }
  function fail(field, message, code) { var e = new Error(message); e.field = field; e.code = code; return e; }
  function todayIso() {
    var d = UR.nowSP ? UR.nowSP() : new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  api.today = todayIso;

  /* ---------- Modo demonstração (localStorage) ---------- */
  function localImpl() {
    var S = UR.store;
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

    api.signUp = function (d) {
      if (find(d.email)) return Promise.reject(fail('email', 'Esse e-mail já tem conta. Use a aba Entrar.'));
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
    api.resetPassword = function () {
      return Promise.reject(fail('email', 'A recuperação de senha funciona quando o site está conectado ao servidor.'));
    };
    api.takenRange = function (from, to) {
      var map = {};
      S.bookings().forEach(function (b) {
        if (b.status !== 'cancelado' && b.date >= from && b.date <= to) (map[b.date] = map[b.date] || {})[b.time] = 1;
      });
      return Promise.resolve(map);
    };
    api.createBooking = function (b) {
      if (S.bookings().some(function (x) { return x.date === b.date && x.time === b.time && x.status !== 'cancelado'; }))
        return Promise.reject(fail(null, 'Horário ocupado', 'taken'));
      b.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      b.uid = current.uid; b.status = 'pendente'; b.created = new Date().toISOString();
      S.addBooking(b);
      return Promise.resolve(b);
    };
    api.myBookings = function () {
      return Promise.resolve(S.bookings().filter(function (b) { return b.uid === current.uid; }));
    };
    api.setStatus = function (b, status) { S.setStatus(b.id, status); return Promise.resolve(); };
    api.cancelBooking = function (b) { return api.setStatus(b, 'cancelado'); };
    api.watchAll = function (cb) {
      var from = todayIso();
      cb(S.bookings().filter(function (b) { return b.date >= from; }));
      return function () {};
    };
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
    'auth/email-already-in-use': ['email', 'Esse e-mail já tem conta. Use a aba Entrar.'],
    'auth/invalid-email': ['email', 'Digite um e-mail válido.'],
    'auth/user-not-found': ['email', 'Não encontramos uma conta com esse e-mail.'],
    'auth/wrong-password': ['pass', 'Senha incorreta. Tente de novo.'],
    'auth/invalid-credential': ['pass', 'E-mail ou senha incorretos.'],
    'auth/invalid-login-credentials': ['pass', 'E-mail ou senha incorretos.'],
    'auth/weak-password': ['pass', 'A senha precisa ter pelo menos 6 caracteres.'],
    'auth/too-many-requests': ['pass', 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'],
    'auth/network-request-failed': ['pass', 'Sem conexão. Verifique sua internet e tente de novo.']
  };
  function authErr(e) {
    var m = AUTH_MSG[e && e.code];
    return m ? fail(m[0], m[1], e.code) : fail('pass', 'Não foi possível concluir. Tente de novo em instantes.', e && e.code);
  }

  function firebaseImpl() {
    return loadScript(SDK + 'app-compat.js')
      .then(function () { return Promise.all([loadScript(SDK + 'auth-compat.js'), loadScript(SDK + 'firestore-compat.js')]); })
      .then(function () {
        var fb = window.firebase;
        fb.initializeApp(cfg);
        var auth = fb.auth(), db = fb.firestore(), pendingProfile = null;
        var slotId = function (b) { return b.date + '_' + b.time.replace(':', ''); };
        var fromDoc = function (d) { var o = d.data(); o.id = d.id; return o; };

        auth.onAuthStateChanged(function (fu) {
          if (!fu) { emit(null); return; }
          var profile = pendingProfile ? Promise.resolve(pendingProfile)
            : db.doc('users/' + fu.uid).get().then(function (d) { return d.data() || {}; }).catch(function () { return {}; });
          var admin = db.doc('admins/' + fu.uid).get().then(function (d) { return d.exists; }).catch(function () { return false; });
          Promise.all([profile, admin]).then(function (r) {
            emit({ uid: fu.uid, email: fu.email, name: r[0].name || fu.displayName || fu.email.split('@')[0], phone: r[0].phone || '', admin: r[1] });
          });
        });

        api.signUp = function (d) {
          pendingProfile = { name: d.name, phone: d.phone };
          return auth.createUserWithEmailAndPassword(d.email, d.pass).then(function (cred) {
            return Promise.all([
              cred.user.updateProfile({ displayName: d.name }),
              db.doc('users/' + cred.user.uid).set({ name: d.name, phone: d.phone, email: d.email, created: fb.firestore.FieldValue.serverTimestamp() })
            ]);
          }).then(function () {
            var fu = auth.currentUser; pendingProfile = null;
            emit({ uid: fu.uid, email: fu.email, name: d.name, phone: d.phone, admin: false });
            return current;
          })
            .catch(function (e) { pendingProfile = null; throw authErr(e); });
        };
        api.signIn = function (email, pass) { return auth.signInWithEmailAndPassword(email, pass).catch(function (e) { throw authErr(e); }); };
        api.signOut = function () { return auth.signOut(); };
        api.resetPassword = function (email) { return auth.sendPasswordResetEmail(email).catch(function (e) { throw authErr(e); }); };

        api.takenRange = function (from, to) {
          return db.collection('slots').where('date', '>=', from).where('date', '<=', to).get().then(function (snap) {
            var map = {};
            snap.forEach(function (d) { var s = d.data(); (map[s.date] = map[s.date] || {})[s.time] = 1; });
            return map;
          });
        };
        /* Horário e consulta são gravados juntos: se o horário já existir, a gravação inteira é recusada */
        api.createBooking = function (b) {
          var ref = db.collection('bookings').doc(), batch = db.batch();
          b.uid = current.uid; b.status = 'pendente';
          batch.set(db.doc('slots/' + slotId(b)), { date: b.date, time: b.time, uid: b.uid, bookingId: ref.id });
          var data = {}; Object.keys(b).forEach(function (k) { data[k] = b[k]; });
          data.created = fb.firestore.FieldValue.serverTimestamp();
          batch.set(ref, data);
          return batch.commit().then(function () { b.id = ref.id; return b; }).catch(function (e) {
            throw e.code === 'permission-denied' ? fail(null, 'Horário ocupado', 'taken') : fail(null, 'Sem conexão com o servidor. Tente de novo.');
          });
        };
        api.myBookings = function () {
          return db.collection('bookings').where('uid', '==', current.uid).get().then(function (s) { return s.docs.map(fromDoc); });
        };
        api.setStatus = function (b, status) {
          var batch = db.batch();
          batch.update(db.doc('bookings/' + b.id), { status: status });
          if (status === 'cancelado') batch.delete(db.doc('slots/' + slotId(b)));
          return batch.commit();
        };
        api.cancelBooking = function (b) { return api.setStatus(b, 'cancelado'); };
        api.watchAll = function (cb, onError) {
          return db.collection('bookings').where('date', '>=', todayIso()).onSnapshot(function (s) { cb(s.docs.map(fromDoc)); }, onError);
        };
      })
      .catch(function (e) {
        console.error('[Uni Risos] Firebase indisponível, usando modo de demonstração.', e);
        api.mode = 'local'; localImpl();
      });
  }

  if (api.mode === 'firebase') firebaseImpl(); else localImpl();
})();
