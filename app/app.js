/* Uni Risos — app mobile.
   Paciente: Início, Agendar, Consultas, Perfil.  Clínica: Agenda, Lançar, Horários, Perfil. */
(function () {
  'use strict';
  const UR = window.UR, api = UR.api, A = UR.agenda, esc = UR.esc;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const view = $('#view'), tabsEl = $('#tabs'), sheetEl = $('#sheet'), scrim = $('#scrim'), toastEl = $('#toast');
  const ASSET = '../assets/';

  const CLINIC = {
    wa: '5511964008106', phone: '+5511964008106', phoneLabel: '(11) 96400-8106',
    address: 'Av. Felipe Carrillo Puerto, 400', area: 'Jardim Iae, São Paulo · 05890-000',
    maps: 'https://www.google.com/maps/dir/?api=1&destination=-23.6670598,-46.7893807',
    insta: 'https://www.instagram.com/uni.risos/'
  };

  /* ---------- Ícones ---------- */
  const P = {
    home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
    cal: 'M5 6h14v14H5z M5 10h14 M9 3v5 M15 3v5',
    list: 'M8 6h12 M8 12h12 M8 18h12 M4 6h.01 M4 12h.01 M4 18h.01',
    user: 'M12 12a4 4 0 100-8 4 4 0 000 8z M4 21c1-5 15-5 16 0',
    plus: 'M12 5v14 M5 12h14',
    clock: 'M12 21a9 9 0 100-18 9 9 0 000 18z M12 7v5l3 2',
    back: 'M15 5l-7 7 7 7',
    chev: 'M9 5l7 7-7 7',
    close: 'M6 6l12 12 M18 6L6 18',
    wa: 'M4 20l1.3-4A8 8 0 1112 20a8 8 0 01-4-1z M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8c-.8-.4-1.4-1-1.8-1.8l.8-1-1-2L9 9.5z',
    phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z',
    pin: 'M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z M12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
    insta: 'M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4z M12 16a4 4 0 100-8 4 4 0 000 8z M17.5 6.5h.01',
    bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4z M10 21h4',
    lock: 'M6 11h12v10H6z M8 11V8a4 4 0 018 0v3',
    shield: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z',
    edit: 'M4 20h4L19 9l-4-4L4 16z M14 6l4 4',
    out: 'M15 4h4v16h-4 M10 8l-4 4 4 4 M6 12h10',
    trash: 'M5 7h14 M10 11v6 M14 11v6 M6 7l1 13h10l1-13 M9 7V4h6v3',
    globe: 'M12 21a9 9 0 100-18 9 9 0 000 18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18',
    block: 'M12 21a9 9 0 100-18 9 9 0 000 18z M6 6l12 12',
    check: 'M5 12l5 5 9-10',
    star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
    download: 'M12 4v11 M7 10l5 5 5-5 M5 20h14'
  };
  const ic = (n, cls) => `<svg class="i ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n] || n}"/></svg>`;

  /* ---------- Estado ---------- */
  const S = { user: null, mine: null, taken: {}, takenAt: 0, all: null, blocks: null, stopAll: null, push: null, last: null };
  const bk = { service: null, date: null, time: null, form: {}, auth: 'signup', origem: 'Telefone' };
  let current = '', lastName = '';

  const pad = (n) => String(n).padStart(2, '0');
  const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const WDL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const MO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const svcOf = (id) => UR.services.find((s) => s.id === id) || { name: id, short: '', icon: P.shield };
  const isAdmin = () => !!(S.user && S.user.admin);
  const first = (n) => String(n || '').trim().split(' ')[0];
  const longDate = (iso) => UR.fmtDate(iso);
  const relDate = (iso) => {
    const t = A.today(), d1 = A.parse(t), d2 = A.parse(iso), diff = Math.round((d2 - d1) / 864e5);
    return diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : longDate(iso);
  };
  const addDays = (iso, n) => { const d = A.parse(iso); d.setDate(d.getDate() + n); return A.iso(d); };
  const statusLabel = (b) => {
    if (b.status === 'cancelado') return ['cancelado', 'Cancelada'];
    if (b.date < A.today()) return ['realizada', 'Realizada'];
    return b.status === 'confirmado' ? ['confirmado', 'Confirmada'] : ['pendente', 'Aguardando confirmação'];
  };
  const waLink = (num, msg) => `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  const patientWa = (b) => '55' + UR.digits(b.phone).replace(/^55(?=\d{10,11}$)/, '');

  /* ---------- Avisos rápidos e folhas ---------- */
  let toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 3200);
  }
  UR.toast = toast;
  let sheetClose = null;
  function sheet(html, onClose) {
    sheetEl.innerHTML = `<div class="sheet-grip"></div>${html}`;
    sheetEl.hidden = scrim.hidden = false;
    document.body.style.overflow = 'hidden';
    sheetClose = onClose || null;
    const f = sheetEl.querySelector('input:not([type=checkbox]),select,textarea,button');
    if (f && f.tagName !== 'BUTTON') setTimeout(() => f.focus(), 280);
  }
  function closeSheet() {
    if (sheetEl.hidden) return;
    sheetEl.hidden = scrim.hidden = true;
    sheetEl.innerHTML = '';
    document.body.style.overflow = '';
    const cb = sheetClose; sheetClose = null; if (cb) cb();
  }
  scrim.addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  function setErr(scope, name, msg) {
    const f = $(`[data-err="${name}"]`, scope);
    if (f) { f.textContent = msg || ''; f.closest('.field') && f.closest('.field').classList.toggle('invalid', !!msg); }
    return !msg;
  }
  const val = (scope, name) => { const el = $(`[name="${name}"]`, scope); return el ? el.value.trim() : ''; };
  const field = (name, label, type, extra, value) =>
    `<label class="field"><span>${label}</span><input name="${name}" type="${type}" ${extra || ''} value="${esc(value || '')}"><b class="err" data-err="${name}"></b></label>`;
  const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  /* ---------- Dados ---------- */
  function loadTaken(force) {
    if (!force && Date.now() - S.takenAt < 20000) return Promise.resolve(S.taken);
    const t = A.today();
    return api.takenRange(t, addDays(t, 60)).then((m) => { S.taken = m; S.takenAt = Date.now(); return m; })
      .catch(() => { toast('Não foi possível carregar a agenda. Verifique a internet.'); return S.taken; });
  }
  function loadMine() {
    if (!S.user || isAdmin()) { S.mine = null; return Promise.resolve(); }
    return api.myBookings().then((l) => { S.mine = l; }).catch(() => { S.mine = S.mine || []; toast('Não foi possível carregar suas consultas.'); });
  }
  function loadBlocks() {
    if (!isAdmin()) return Promise.resolve();
    return api.listBlocks().then((l) => { S.blocks = l; }).catch(() => { S.blocks = S.blocks || []; });
  }
  function startAdmin() {
    if (S.stopAll) S.stopAll();
    S.all = null;
    S.stopAll = api.watchAll((list) => { S.all = list; if (/^(agenda)/.test(current)) refresh(); },
      () => toast('Sem conexão com a agenda.'));
    loadBlocks().then(refresh);
  }
  function stopAdmin() { if (S.stopAll) { S.stopAll(); S.stopAll = null; } S.all = null; S.blocks = null; }
  const upcoming = () => (S.mine || []).filter((b) => b.status !== 'cancelado' && b.date >= A.today())
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  /* ---------- Rotas ---------- */
  const SCREENS = {};
  function defaultRoute() { return isAdmin() ? 'agenda' : 'inicio'; }
  function go(h) { if (location.hash === '#' + h) route(); else location.hash = h; }
  function route() {
    closeSheet();
    const h = location.hash.slice(1) || defaultRoute();
    const [name, ...params] = h.split('/');
    current = h;
    render(SCREENS[name] ? name : defaultRoute(), params);
  }
  function refresh() { const [name, ...p] = (current || defaultRoute()).split('/'); render(SCREENS[name] ? name : defaultRoute(), p, true); }

  function render(name, params, keepScroll) {
    const out = SCREENS[name](params || []);
    if (!out) return;
    const y = window.scrollY;
    const datesEl = $('.dates', view), dx = datesEl ? datesEl.scrollLeft : 0;
    view.innerHTML = (out.bar === false ? '' : bar(out)) + `<div class="page">${out.html}</div>` + (out.cta || '');
    document.body.classList.toggle('no-tabs', !!out.cta || !!out.hideTabs);
    renderTabs(out.tab || name);
    if (keepScroll && lastName === name) {
      window.scrollTo(0, y);
      const d2 = $('.dates', view); if (d2) d2.scrollLeft = dx;
    } else {
      window.scrollTo(0, 0);
      const on = $('.date.on', view); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
    lastName = name;
    document.title = (out.title ? out.title + ' · ' : '') + 'Uni Risos';
    if (out.after) out.after();
  }
  function bar(o) {
    return `<header class="bar">${o.back ? `<button class="icon-btn" data-act="back" data-to="${o.back}" aria-label="Voltar">${ic('back')}</button>` : ''}
      <h1>${esc(o.title || '')}</h1>${o.barRight || ''}</header>`;
  }
  function renderTabs(active) {
    const items = isAdmin()
      ? [['agenda', 'Agenda', 'cal'], ['agendar', 'Lançar', 'plus'], ['horarios', 'Horários', 'clock'], ['perfil', 'Perfil', 'user']]
      : [['inicio', 'Início', 'home'], ['agendar', 'Agendar', 'cal'], ['consultas', 'Consultas', 'list'], ['perfil', 'Perfil', 'user']];
    const pend = isAdmin() && S.all ? S.all.filter((b) => b.status === 'pendente').length : upcoming().length;
    tabsEl.innerHTML = items.map(([id, label, icon]) => {
      const badge = (isAdmin() && id === 'agenda' && pend) || (!isAdmin() && id === 'consultas' && pend) ? `<i class="badge">${pend}</i>` : '';
      return `<a class="tab ${active === id ? 'on' : ''}" href="#${id}" ${active === id ? 'aria-current="page"' : ''}><span class="ic-wrap">${ic(icon)}</span>${label}${badge}</a>`;
    }).join('');
  }
  window.addEventListener('hashchange', route);
  window.addEventListener('scroll', () => { const b = $('.bar', view); if (b) b.classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });

  /* ====================== PACIENTE ====================== */
  SCREENS.inicio = () => {
    if (isAdmin()) return go('agenda');
    const u = S.user, nxt = upcoming()[0], now = A.parse(A.today()).getDay();
    const days = [1, 2, 3, 4, 5, 6, 0];
    const nextHtml = nxt ? `
      <div class="card card-ink next">
        <span class="eyebrow">Sua próxima consulta</span>
        <div class="next-head">
          <div class="datebox"><b>${+nxt.date.slice(8)}</b><small>${MO[+nxt.date.slice(5, 7) - 1]}</small></div>
          <div class="next-info"><b>${esc(nxt.serviceName)}</b><span>${relDate(nxt.date)} às ${nxt.time}</span></div>
        </div>
        <span class="pill ${statusLabel(nxt)[0]}">${statusLabel(nxt)[1]}</span>
        <div class="row-actions"><a class="btn ghost sm" href="#consultas">Ver detalhes</a><a class="btn sage sm" href="${CLINIC.maps}" target="_blank" rel="noopener">Como chegar</a></div>
      </div>` : `
      <div class="card next">
        <span class="eyebrow">Agendamento online</span>
        <b style="font-size:1.1rem">Marque sua consulta em 1 minuto</b>
        <p class="muted small">Escolha o tratamento, o dia e o horário. A clínica confirma e você recebe o aviso.</p>
        <a class="btn primary block" href="#agendar">Agendar consulta</a>
      </div>`;
    return {
      bar: false, tab: 'inicio', title: 'Início',
      html: `
      <section class="hero" style="margin:0 -16px">
        <svg class="hero-smile" viewBox="0 0 200 120" aria-hidden="true"><path d="M10 15 C 40 120, 160 120, 190 15"/></svg>
        <div class="hero-top">
          <div class="hero-brand"><img src="${ASSET}logo-selo.jpg" alt="" width="44" height="44"><div><b>Uni Risos</b><small>Odontologia especializada</small></div></div>
          ${u ? `<a class="icon-btn" href="#perfil" aria-label="Perfil">${ic('user')}</a>` : `<a class="btn light sm" href="#perfil">Entrar</a>`}
        </div>
        <p class="hero-hello">${u ? `Olá, <em>${esc(first(u.name))}</em>` : `O seu sorriso <em>importa</em>`}</p>
        <span class="rating-pill"><b>5,0</b><span class="stars">★★★★★</span>70 avaliações no Google</span>
      </section>
      <div class="next-card">${nextHtml}</div>
      <div class="quick">
        <a href="${waLink(CLINIC.wa, 'Olá! Vim pelo app da Uni Risos.')}" target="_blank" rel="noopener"><span class="ic">${ic('wa')}</span>WhatsApp</a>
        <a href="tel:${CLINIC.phone}"><span class="ic">${ic('phone')}</span>Ligar</a>
        <a href="${CLINIC.maps}" target="_blank" rel="noopener"><span class="ic">${ic('pin')}</span>Como chegar</a>
        <a href="${CLINIC.insta}" target="_blank" rel="noopener"><span class="ic">${ic('insta')}</span>Instagram</a>
      </div>
      <div class="card" data-install-card hidden style="display:flex;gap:12px;align-items:center">
        <img src="${ASSET}icon-192.png" alt="" width="48" height="48" style="border-radius:12px">
        <div style="flex:1"><b>Instale o app</b><p class="muted small">Abre direto da tela inicial, sem navegador.</p></div>
        <button class="btn primary sm" data-install hidden>Instalar</button>
      </div>
      <section>
        <div class="section-h"><h3>Tratamentos</h3><a href="#agendar">Ver todos</a></div>
        <div class="hscroll">${UR.services.map((s) => `
          <button class="svc-card" data-act="svc-go" data-id="${s.id}">${ic(s.icon)}<b>${esc(s.name)}</b><span>${esc(s.short)}</span></button>`).join('')}
        </div>
      </section>
      <section>
        <div class="section-h"><h3>A clínica</h3></div>
        <div class="hscroll">
          ${[['recepcao', 'Recepção'], ['espera', 'Sala de espera'], ['consultorio', 'Consultório'], ['fachada', 'Fachada']].map(([f, l], i) =>
            `<figure class="photo" style="margin:0"><img src="${ASSET}${f}.jpg" alt="${l} da Uni Risos" ${i > 1 ? 'loading="lazy"' : ''} width="600" height="750"><span>${l}</span></figure>`).join('')}
        </div>
      </section>
      <section>
        <div class="section-h"><h3>Quem cuida de você</h3></div>
        <div class="team">
          <div class="person"><img src="${ASSET}jaqueline.jpg" alt="Dra. Jaqueline Xavier" width="64" height="64"><b>Dra. Jaqueline Xavier</b><span>Cirurgiã-dentista · CRO-SP 151.514</span></div>
          <div class="person"><img src="${ASSET}lucas.jpg" alt="Lucas" width="64" height="64"><b>Lucas</b><span>Atendimento ao paciente</span></div>
        </div>
      </section>
      <section class="card">
        <span class="eyebrow">Avaliação no Google</span>
        <p class="review" style="margin-top:8px">“A Uni Risos é, com certeza, o melhor consultório odontológico que já fui! O ambiente é muito confortável, acolhedor e sempre muito limpo.”</p>
        <p class="review-by">★★★★★ Sarah Ribeiro</p>
      </section>
      <section class="card">
        <div class="section-h" style="padding:0"><h3>Horário</h3><span class="open-dot ${A.isOpenNow() ? 'on' : ''}">${A.isOpenNow() ? 'Aberto agora' : 'Fechado agora'}</span></div>
        <ul class="hours">${days.map((d) => `<li class="${d === now ? 'today' : ''}"><span>${WDL[d]}</span><span>${A.describeDay(d)}</span></li>`).join('')}</ul>
      </section>
      <section class="card" style="display:grid;gap:10px">
        <span class="eyebrow">Endereço</span>
        <b>${CLINIC.address}</b><span class="muted small">${CLINIC.area}</span>
        <a class="btn light block" href="${CLINIC.maps}" target="_blank" rel="noopener">${ic('pin')} Abrir no mapa</a>
      </section>
      <p class="muted small" style="text-align:center;padding:4px 0 8px">Uni Risos Clínica Odontológica · CRO-SP 037.967<br>Resp. técnica: Dra. Jaqueline Xavier · CRO-SP 151.514<br><a class="link" href="../privacidade.html">Política de privacidade</a> · <a class="link" href="../">Site</a></p>`,
      after() {
        const can = document.documentElement.classList.contains('can-install');
        $$('[data-install-card]').forEach((c) => { c.hidden = !can; const b = $('[data-install]', c); if (b) b.hidden = !can; });
      }
    };
  };

  /* ---------- Agendar (paciente) / Lançar (clínica) ---------- */
  SCREENS.agendar = (p) => {
    const step = p[0] || 'servico', clinic = isAdmin();
    if (step === 'quando' && !bk.service) return go('agendar');
    if (step === 'confirmar' && !(bk.service && bk.date && bk.time)) return go(bk.service ? 'agendar/quando' : 'agendar');
    if (step === 'pronto' && !S.last) return go('agendar');
    const dots = (n) => `<div class="steps-dots" aria-label="Etapa ${n} de 3">${[1, 2, 3].map((i) => `<i class="${i === n ? 'on' : ''}"></i>`).join('')}</div>`;

    if (step === 'servico') {
      return {
        tab: 'agendar', title: clinic ? 'Lançar consulta' : 'Agendar', barRight: dots(1),
        html: `
        <div class="page-title"><h2>${clinic ? 'Lançar <em>consulta</em>' : 'Qual <em>tratamento</em>?'}</h2>
          <p>${clinic ? 'Para pacientes que marcaram por telefone, WhatsApp ou na recepção. O horário sai da agenda online na hora.' : 'Não sabe qual escolher? Marque Avaliação e limpeza: a Dra. Jaqueline orienta você na consulta.'}</p></div>
        <div class="svc-list">${UR.services.map((s) => `
          <button class="svc ${bk.service === s.id ? 'on' : ''}" data-act="svc" data-id="${s.id}">
            <span class="ic">${ic(s.icon)}</span><span class="grow"><b>${esc(s.name)}</b><span>${esc(s.desc)}</span></span>${ic('chev', 'chev')}
          </button>`).join('')}</div>`
      };
    }

    if (step === 'quando') {
      const days = A.days(30, S.taken, true);
      if (!bk.date || !days.some((d) => d.iso === bk.date && d.free)) { const f = days.find((d) => d.free); bk.date = f ? f.iso : null; if (!bk.date) bk.time = null; }
      const slots = bk.date ? A.slots(bk.date, S.taken).filter((s) => s.free) : [];
      if (bk.time && !slots.some((s) => s.time === bk.time)) bk.time = null;
      const groups = [['Manhã', slots.filter((s) => s.time < '12:00')], ['Tarde', slots.filter((s) => s.time >= '12:00')]].filter((g) => g[1].length);
      const month = bk.date ? A.parse(bk.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '';
      return {
        tab: 'agendar', title: svcOf(bk.service).name, back: 'agendar', barRight: dots(2),
        html: `
        <div class="page-title"><h2>Escolha o <em>dia</em></h2></div>
        <p class="month-label">${month}</p>
        <div class="dates" role="listbox" aria-label="Dias">${days.map((d) => {
          const closed = !d.total, full = d.total && !d.free;
          return `<button class="date ${d.iso === bk.date ? 'on' : ''} ${d.free ? '' : 'off'}" data-act="date" data-v="${d.iso}" ${d.free ? '' : 'disabled'} role="option" aria-selected="${d.iso === bk.date}">
            <small>${WD[d.date.getDay()]}</small><b>${d.date.getDate()}</b><em>${closed ? 'fechado' : full ? 'lotado' : d.free + ' livres'}</em></button>`;
        }).join('')}</div>
        <div>
          ${groups.length ? groups.map(([g, list]) => `<p class="times-h">${g}</p><div class="times">${list.map((s) =>
            `<button class="time ${bk.time === s.time ? 'on' : ''}" data-act="time" data-v="${s.time}">${s.time}</button>`).join('')}</div>`).join('')
            : `<div class="empty">${ic('cal')}<p>${bk.date ? 'Sem horários livres neste dia.' : 'Nenhum horário livre nos próximos 30 dias.'}<br>Fale com a clínica pelo WhatsApp.</p></div>`}
        </div>`,
        cta: `<div class="cta"><p class="cta-sum">${bk.time ? `<b>${relDate(bk.date)}</b> às <b>${bk.time}</b>` : 'Escolha um horário'}</p>
          <button class="btn primary block" data-act="to-confirm" ${bk.time ? '' : 'disabled'}>Continuar</button></div>`
      };
    }

    if (step === 'confirmar') {
      const u = S.user, f = bk.form, s = svcOf(bk.service);
      if (u && !clinic && !f.name) { f.name = u.name; f.phone = u.phone; }
      let form;
      if (clinic) {
        form = `<div class="form">
          ${field('name', 'Nome do paciente', 'text', 'autocomplete="off" autocapitalize="words"', f.name)}
          ${field('phone', 'WhatsApp do paciente', 'tel', 'inputmode="tel" autocomplete="off" placeholder="(11) 90000-0000"', UR.maskPhone(f.phone || ''))}
          <div class="field"><span>Como marcou</span><div class="chips">${['Telefone', 'WhatsApp', 'Recepção', 'Instagram'].map((o) =>
            `<button type="button" class="chip ${bk.origem === o ? 'on' : ''}" data-act="origem" data-v="${o}">${o}</button>`).join('')}</div></div>
          <label class="field"><span>Observação (opcional)</span><textarea name="note" placeholder="Ex.: retorno, primeira consulta">${esc(f.note || '')}</textarea></label>
        </div>`;
      } else if (u) {
        form = `<div class="form">
          ${field('name', 'Nome completo', 'text', 'autocomplete="name" autocapitalize="words"', f.name)}
          ${field('phone', 'WhatsApp', 'tel', 'inputmode="tel" autocomplete="tel" placeholder="(11) 90000-0000"', UR.maskPhone(f.phone || ''))}
          <label class="field"><span>Observação (opcional)</span><textarea name="note" placeholder="Ex.: primeira consulta, consulta para criança">${esc(f.note || '')}</textarea><span class="hint">Evite colocar detalhes de saúde aqui. Conte na consulta.</span></label>
          <p class="hint">Agendando como <b>${esc(u.email)}</b>.</p>
        </div>`;
      } else {
        const signup = bk.auth === 'signup';
        form = `<div class="form">
          <div class="seg" role="tablist"><button type="button" class="${signup ? 'on' : ''}" data-act="authmode" data-v="signup">Sou novo aqui</button><button type="button" class="${signup ? '' : 'on'}" data-act="authmode" data-v="login">Já tenho conta</button></div>
          <p class="hint">${signup ? 'Crie sua conta para reservar o horário e acompanhar suas consultas.' : 'Entre com seu e-mail e senha para reservar.'}</p>
          ${signup ? field('name', 'Nome completo', 'text', 'autocomplete="name" autocapitalize="words"', f.name) + field('phone', 'WhatsApp', 'tel', 'inputmode="tel" autocomplete="tel" placeholder="(11) 90000-0000"', UR.maskPhone(f.phone || '')) : ''}
          ${field('email', 'E-mail', 'email', 'autocomplete="email" inputmode="email" autocapitalize="off"', f.email)}
          ${field('pass', 'Senha', 'password', `autocomplete="${signup ? 'new-password' : 'current-password'}" ${signup ? 'placeholder="Mínimo de 6 caracteres"' : ''}`)}
          ${signup ? `<label class="check"><input type="checkbox" name="consent" ${f.consent ? 'checked' : ''}><span>Li e aceito a <a class="link" href="../privacidade.html" target="_blank">Política de privacidade</a>.</span></label><b class="err" data-err="consent" style="color:var(--bad);font-size:.84rem"></b>`
            : `<button type="button" class="link" style="justify-self:start" data-act="forgot">Esqueci minha senha</button>`}
          <label class="field"><span>Observação (opcional)</span><textarea name="note" placeholder="Ex.: primeira consulta, consulta para criança">${esc(f.note || '')}</textarea></label>
        </div>`;
      }
      return {
        tab: 'agendar', title: 'Confirmar', back: 'agendar/quando', barRight: dots(3),
        html: `
        <div class="page-title"><h2>Tudo <em>certo</em>?</h2></div>
        <div class="card summary">
          <div class="summary-row">${ic(s.icon)}<div class="grow"><span>Tratamento</span><b>${esc(s.name)}</b></div><button data-act="nav" data-to="agendar">Alterar</button></div>
          <div class="summary-row">${ic('cal')}<div class="grow"><span>Dia e horário</span><b>${longDate(bk.date)} às ${bk.time}</b></div><button data-act="nav" data-to="agendar/quando">Alterar</button></div>
          <div class="summary-row">${ic('pin')}<div class="grow"><span>Local</span><b>${CLINIC.address}</b></div></div>
        </div>
        <form id="confirmForm" novalidate>${form}</form>`,
        cta: `<div class="cta"><button class="btn primary block" data-act="confirm">${clinic ? 'Lançar na agenda' : u ? 'Confirmar agendamento' : bk.auth === 'signup' ? 'Criar conta e agendar' : 'Entrar e agendar'}</button></div>`
      };
    }

    /* pronto */
    const b = S.last;
    if (clinic) {
      return {
        tab: 'agendar', title: 'Lançada', hideTabs: false,
        html: `<div class="done"><div class="done-mark"><svg viewBox="0 0 24 24"><path d="${P.check}"/></svg></div>
          <h2>Consulta lançada</h2><p>${esc(b.name)} · ${esc(b.serviceName)}<br>${longDate(b.date)} às ${b.time}. O horário já saiu da agenda online.</p></div>
          <div style="display:grid;gap:10px">
            <a class="btn wa block" target="_blank" rel="noopener" href="${waLink(patientWa(b), confirmMsg(b))}">${ic('wa')} Enviar confirmação no WhatsApp</a>
            <a class="btn light block" href="#agenda/${b.date}">Ver na agenda</a>
            <button class="btn ghost block" data-act="again">Lançar outra</button>
          </div>`
      };
    }
    return {
      tab: 'agendar', title: 'Agendado',
      html: `<div class="done"><div class="done-mark"><svg viewBox="0 0 24 24"><path d="${P.check}"/></svg></div>
        <h2>Horário reservado!</h2><p>${esc(b.serviceName)}<br><b>${longDate(b.date)} às ${b.time}</b><br>A clínica já recebeu o pedido e vai confirmar. Você é avisado aqui no app.</p></div>
        <div style="display:grid;gap:10px">
          <button class="btn primary block" data-act="ics" data-id="${b.id}">${ic('download')} Salvar na agenda do celular</button>
          <div data-push-offer hidden class="card" style="display:grid;gap:10px"><b>Quer receber o lembrete no celular?</b><p class="muted small">Avisamos na véspera e quando a clínica confirmar.</p><button class="btn sage block" data-act="push-on">Ativar notificações</button></div>
          <a class="btn light block" href="#consultas">Ver minhas consultas</a>
        </div>`,
      after() {
        if (api.pushSupported && api.pushSupported()) api.hasPush().then((on) => { const o = $('[data-push-offer]'); if (o) o.hidden = on; });
      }
    };
  };
  const confirmMsg = (b) => `Olá, ${first(b.name)}! Aqui é da Uni Risos. Sua consulta de ${b.serviceName} está confirmada para ${longDate(b.date).toLowerCase()} às ${b.time}. Endereço: ${CLINIC.address}, Jardim Iae. Qualquer dúvida é só responder.`;
  const reminderMsg = (b) => `Olá, ${first(b.name)}! Passando para lembrar da sua consulta na Uni Risos ${relDate(b.date).toLowerCase() === 'amanhã' ? 'amanhã' : 'em ' + longDate(b.date).toLowerCase()} às ${b.time}. Podemos confirmar sua presença?`;

  function readForm() {
    const fm = $('#confirmForm'); if (!fm) return;
    ['name', 'phone', 'email', 'note'].forEach((k) => { const el = $(`[name="${k}"]`, fm); if (el) bk.form[k] = el.value.trim(); });
    const c = $('[name="consent"]', fm); if (c) bk.form.consent = c.checked;
  }

  function waitUser() {
    return new Promise((resolve) => {
      if (S.user) return resolve(S.user);
      const t0 = Date.now(), iv = setInterval(() => { if (S.user || Date.now() - t0 > 8000) { clearInterval(iv); resolve(S.user); } }, 100);
    });
  }

  async function confirmBooking(btn) {
    const fm = $('#confirmForm'); readForm();
    const f = bk.form, clinic = isAdmin(), u = S.user;
    let ok = true;
    const needsProfile = clinic || u || bk.auth === 'signup';
    if (needsProfile) {
      ok = setErr(fm, 'name', f.name.length >= 3 ? '' : 'Digite o nome completo.') && ok;
      ok = setErr(fm, 'phone', UR.digits(f.phone).length >= 10 ? '' : 'Digite o WhatsApp com DDD.') && ok;
    }
    if (!u) {
      const pass = $('[name="pass"]', fm).value;
      ok = setErr(fm, 'email', validEmail(f.email) ? '' : 'Digite um e-mail válido.') && ok;
      ok = setErr(fm, 'pass', bk.auth === 'signup' ? (pass.length >= 6 ? '' : 'A senha precisa ter pelo menos 6 caracteres.') : (pass ? '' : 'Digite sua senha.')) && ok;
      if (bk.auth === 'signup') ok = setErr(fm, 'consent', f.consent ? '' : 'Para criar a conta, aceite a política de privacidade.') && ok;
      if (!ok) { const bad = $('.invalid input', fm) || $('[name="consent"]', fm); if (bad) bad.focus(); return; }
      btn.disabled = true; btn.textContent = 'Entrando…';
      try {
        if (bk.auth === 'signup') await api.signUp({ name: f.name, phone: UR.digits(f.phone), email: f.email.toLowerCase(), pass });
        else await api.signIn(f.email.toLowerCase(), pass);
        await waitUser();
      } catch (e) {
        btn.disabled = false; btn.textContent = bk.auth === 'signup' ? 'Criar conta e agendar' : 'Entrar e agendar';
        setErr(fm, e.field === 'email' ? 'email' : 'pass', e.message); return;
      }
      if (isAdmin()) { toast('Conta da clínica: use Lançar para marcar consultas.'); go('agenda'); return; }
      if (bk.auth === 'login') { f.name = f.name || S.user.name; f.phone = f.phone || S.user.phone; }
    } else if (!ok) { const bad = $('.invalid input', fm); if (bad) bad.focus(); return; }

    btn.disabled = true; btn.textContent = 'Reservando…';
    const data = { service: bk.service, serviceName: svcOf(bk.service).name, date: bk.date, time: bk.time, name: f.name || S.user.name, phone: UR.digits(f.phone || S.user.phone), note: f.note || '' };
    try {
      const b = clinic ? await api.adminCreateBooking(Object.assign(data, { origem: 'clinica', canal: bk.origem })) : await api.createBooking(data);
      S.last = b; bk.service = bk.date = bk.time = null; bk.form = {};
      S.takenAt = 0; loadTaken(true); if (!clinic) loadMine().then(() => renderTabs('agendar'));
      go('agendar/pronto');
    } catch (e) {
      btn.disabled = false; btn.textContent = clinic ? 'Lançar na agenda' : 'Confirmar agendamento';
      if (e.code === 'taken') { toast('Esse horário acabou de ser ocupado. Escolha outro.'); bk.time = null; await loadTaken(true); go('agendar/quando'); }
      else toast(e.message || 'Não foi possível agendar. Tente de novo.');
    }
  }

  /* ---------- Consultas (paciente) ---------- */
  let apptTab = 'proximas';
  SCREENS.consultas = () => {
    if (isAdmin()) return go('agenda');
    if (!S.user) return {
      tab: 'consultas', title: 'Consultas',
      html: `<div class="page-title"><h2>Suas <em>consultas</em></h2><p>Entre na sua conta para ver, salvar na agenda e cancelar suas consultas.</p></div>
        <a class="btn primary block" href="#perfil">Entrar ou criar conta</a><a class="btn light block" href="#agendar">Agendar consulta</a>`
    };
    if (!S.mine) { loadMine().then(refresh); return { tab: 'consultas', title: 'Consultas', html: '<div class="skeleton"></div><div class="skeleton"></div>' }; }
    const today = A.today();
    const sorted = S.mine.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const next = sorted.filter((b) => b.status !== 'cancelado' && b.date >= today);
    const past = sorted.filter((b) => b.status === 'cancelado' || b.date < today).reverse();
    const list = apptTab === 'proximas' ? next : past;
    return {
      tab: 'consultas', title: 'Consultas',
      html: `
      <div class="seg"><button class="${apptTab === 'proximas' ? 'on' : ''}" data-act="appt-tab" data-v="proximas">Próximas${next.length ? ` (${next.length})` : ''}</button><button class="${apptTab === 'historico' ? 'on' : ''}" data-act="appt-tab" data-v="historico">Histórico</button></div>
      ${list.length ? `<div class="appts">${list.map((b) => apptCard(b, apptTab === 'historico')).join('')}</div>`
        : `<div class="empty">${ic('cal')}<p>${apptTab === 'proximas' ? 'Você não tem consultas marcadas.' : 'Nada por aqui ainda.'}</p>${apptTab === 'proximas' ? '<a class="btn primary" href="#agendar">Agendar consulta</a>' : ''}</div>`}`
    };
  };
  function apptCard(b, isPast) {
    const [cls, label] = statusLabel(b);
    return `<article class="card appt ${isPast ? 'past' : ''}">
      <div class="next-head"><div class="datebox"><b>${+b.date.slice(8)}</b><small>${MO[+b.date.slice(5, 7) - 1]}</small></div>
        <div class="next-info"><b>${esc(b.serviceName)}</b><span>${relDate(b.date)} às ${b.time}</span></div></div>
      <span class="pill ${cls}">${label}</span>
      ${isPast ? '' : `<div class="appt-actions">
        <button class="btn light sm" data-act="ics" data-id="${b.id}">${ic('download')} Agenda</button>
        <a class="btn light sm" href="${waLink(CLINIC.wa, `Olá! Sobre minha consulta de ${b.serviceName} em ${longDate(b.date).toLowerCase()} às ${b.time}.`)}" target="_blank" rel="noopener">${ic('wa')} Falar</a>
        <button class="btn light sm" data-act="reschedule" data-id="${b.id}">Reagendar</button>
        <button class="btn danger sm" data-act="cancel" data-id="${b.id}">Cancelar</button></div>`}
    </article>`;
  }
  function cancelSheet(b, after) {
    sheet(`<h2>Cancelar consulta?</h2><p class="sub">${esc(b.serviceName)} · ${longDate(b.date)} às ${b.time}. O horário fica livre para outro paciente.</p>
      <div class="sheet-body"><button class="btn danger block" data-act="cancel-yes" data-id="${b.id}">Sim, cancelar consulta</button><button class="btn light block" data-act="close">Voltar</button></div>`);
    sheetEl.dataset.after = after || '';
  }

  /* ---------- Perfil ---------- */
  let authMode = 'login';
  SCREENS.perfil = () => {
    const u = S.user;
    if (!u) {
      const signup = authMode === 'signup';
      return {
        tab: 'perfil', title: 'Perfil',
        html: `<div class="page-title"><h2>${signup ? 'Criar <em>conta</em>' : 'Que bom te <em>ver</em>'}</h2><p>${signup ? 'Com a conta você agenda em segundos e recebe lembretes.' : 'Entre para agendar e acompanhar suas consultas.'}</p></div>
        <div class="seg"><button class="${signup ? '' : 'on'}" data-act="auth-tab" data-v="login">Entrar</button><button class="${signup ? 'on' : ''}" data-act="auth-tab" data-v="signup">Criar conta</button></div>
        <form id="authForm" class="form" novalidate>
          ${signup ? field('name', 'Nome completo', 'text', 'autocomplete="name" autocapitalize="words"') + field('phone', 'WhatsApp', 'tel', 'inputmode="tel" autocomplete="tel" placeholder="(11) 90000-0000"') : ''}
          ${field('email', 'E-mail', 'email', 'autocomplete="email" inputmode="email" autocapitalize="off"')}
          ${field('pass', 'Senha', 'password', `autocomplete="${signup ? 'new-password' : 'current-password'}" ${signup ? 'placeholder="Mínimo de 6 caracteres"' : ''}`)}
          ${signup ? `<label class="check"><input type="checkbox" name="consent"><span>Li e aceito a <a class="link" href="../privacidade.html" target="_blank">Política de privacidade</a>.</span></label><b class="err" data-err="consent" style="color:var(--bad);font-size:.84rem"></b>` : ''}
          <button class="btn primary block" type="submit">${signup ? 'Criar conta' : 'Entrar'}</button>
          ${signup ? '' : '<button type="button" class="link" style="justify-self:center" data-act="forgot">Esqueci minha senha</button>'}
        </form>
        <p class="muted small" style="text-align:center"><a class="link" href="../privacidade.html">Política de privacidade</a></p>`
      };
    }
    const role = isAdmin() ? 'clinica' : 'paciente';
    if (S.push === null && api.hasPush) api.hasPush().then((on) => { S.push = on; if (current === 'perfil') refresh(); });
    const pushOk = api.pushSupported && api.pushSupported();
    return {
      tab: 'perfil', title: 'Perfil',
      html: `
      <div class="card" style="display:flex;gap:14px;align-items:center">
        <div class="datebox" style="width:56px;height:56px;border-radius:50%;display:grid;place-items:center"><b style="font-size:1.3rem">${esc(first(u.name).charAt(0).toUpperCase())}</b></div>
        <div style="min-width:0"><b style="font-size:1.08rem">${esc(u.name)}</b><p class="muted small" style="overflow:hidden;text-overflow:ellipsis">${esc(u.email)}</p>${isAdmin() ? '<span class="pill confirmado" style="margin-top:6px">Conta da clínica</span>' : ''}</div>
      </div>
      <div class="list">
        <button class="list-item" data-act="edit-profile">${ic('edit')}<span class="grow"><b>Meus dados</b><span>Nome e WhatsApp</span></span>${ic('chev', 'chev')}</button>
        <div class="list-item">${ic('bell')}<span class="grow"><b>${isAdmin() ? 'Avisos de agendamentos' : 'Lembretes no celular'}</b><span>${pushOk ? (isAdmin() ? 'Novos agendamentos, cancelamentos e resumo do dia' : 'Véspera da consulta e confirmação da clínica') : 'No iPhone, instale o app na tela inicial para ativar'}</span></span>
          <label class="switch"><input type="checkbox" data-act="push-toggle" data-role="${role}" ${S.push ? 'checked' : ''} ${pushOk ? '' : 'disabled'} aria-label="Notificações"><span></span></label></div>
        <button class="list-item" data-act="change-pass">${ic('lock')}<span class="grow"><b>Alterar senha</b><span>Enviamos um link para o seu e-mail</span></span>${ic('chev', 'chev')}</button>
      </div>
      <div class="list">
        <a class="list-item" href="${waLink(CLINIC.wa, 'Olá! Vim pelo app da Uni Risos.')}" target="_blank" rel="noopener">${ic('wa')}<span class="grow"><b>Falar com a clínica</b><span>${CLINIC.phoneLabel}</span></span>${ic('chev', 'chev')}</a>
        <a class="list-item" href="../privacidade.html">${ic('shield')}<span class="grow"><b>Política de privacidade</b><span>Como cuidamos dos seus dados</span></span>${ic('chev', 'chev')}</a>
        <a class="list-item" href="../">${ic('globe')}<span class="grow"><b>Site da Uni Risos</b></span>${ic('chev', 'chev')}</a>
      </div>
      <div class="list">
        <button class="list-item" data-act="logout">${ic('out')}<span class="grow"><b>Sair da conta</b></span></button>
        ${isAdmin() ? '' : `<button class="list-item danger" data-act="delete-account">${ic('trash')}<span class="grow"><b>Excluir minha conta</b><span>Apaga seus dados de cadastro</span></span></button>`}
      </div>
      <p class="muted small" style="text-align:center">Uni Risos · app versão 2.0</p>`
    };
  };

  /* ====================== CLÍNICA ====================== */
  let agendaFilter = 'dia';
  SCREENS.agenda = (p) => {
    if (!isAdmin()) return go(S.user ? 'inicio' : 'perfil');
    if (!S.all || !S.blocks) return { tab: 'agenda', title: 'Agenda', html: '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>' };
    const today = A.today(), day = p[0] && /^\d{4}-\d{2}-\d{2}$/.test(p[0]) ? p[0] : today;
    const active = S.all.filter((b) => b.status !== 'cancelado');
    const pend = active.filter((b) => b.status === 'pendente').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const count = (d) => active.filter((b) => b.date === d).length;
    const days = []; for (let i = 0; i < 30; i++) days.push(addDays(today, i));
    let body;
    if (agendaFilter === 'pendentes') {
      body = pend.length ? `<div class="day-list">${pend.map((b) => bookingRow(b, true)).join('')}</div>`
        : `<div class="empty">${ic('check')}<p>Nenhuma consulta aguardando confirmação.</p></div>`;
    } else {
      const rows = [];
      S.all.filter((b) => b.date === day).forEach((b) => rows.push({ t: b.time, html: bookingRow(b) }));
      S.blocks.filter((k) => k.date === day).forEach((k) => {
        const ts = k.times.slice().sort();
        rows.push({ t: ts[0], html: `<button class="slot-row blocked" data-act="block-open" data-id="${k.id}"><span class="t">${ts[0]}</span><span class="grow"><b>Bloqueado${k.reason ? ' · ' + esc(k.reason) : ''}</b><span>${k.allDay ? 'Dia inteiro' : ts.length > 1 ? `${ts[0]} – ${A.toTime(A.toMin(ts[ts.length - 1]) + 30)}` : '30 min'}</span></span>${ic('block')}</button>` });
      });
      rows.sort((a, b) => a.t.localeCompare(b.t));
      const free = A.slots(day, S.taken).filter((s) => s.free).length, total = A.times(day).length;
      body = `<div class="section-h" style="margin:0"><h3>${relDate(day)}</h3><span class="muted small">${total ? `${free} de ${total} horários livres` : 'Fechado'}</span></div>
        ${rows.length ? `<div class="day-list">${rows.map((r) => r.html).join('')}</div>` : `<div class="empty">${ic('cal')}<p>${total ? 'Nenhuma consulta neste dia.' : 'A clínica não abre neste dia.'}</p></div>`}`;
    }
    if (!S.takenAt) loadTaken().then(refresh);
    return {
      tab: 'agenda', title: 'Agenda',
      barRight: `<a class="icon-btn" href="#agendar" aria-label="Lançar consulta">${ic('plus')}</a>`,
      html: `
      <div class="stats">
        <button class="stat ${agendaFilter === 'dia' && day === today ? 'on' : ''}" data-act="ag-today"><b>${count(today)}</b><span>hoje</span></button>
        <button class="stat ${agendaFilter === 'dia' && day === addDays(today, 1) ? 'on' : ''}" data-act="ag-day" data-v="${addDays(today, 1)}"><b>${count(addDays(today, 1))}</b><span>amanhã</span></button>
        <button class="stat ${agendaFilter === 'pendentes' ? 'on' : ''}" data-act="ag-pend"><b>${pend.length}</b><span>a confirmar</span></button>
      </div>
      ${agendaFilter === 'dia' ? `<div class="dates">${days.map((d) => {
        const dt = A.parse(d), n = count(d);
        return `<button class="date ${d === day ? 'on' : ''}" data-act="ag-day" data-v="${d}"><small>${WD[dt.getDay()]}</small><b>${dt.getDate()}</b><i class="dot ${n ? '' : 'none'}"></i></button>`;
      }).join('')}</div>` : ''}
      ${body}`
    };
  };
  function bookingRow(b, showDate) {
    const [cls, label] = statusLabel(b);
    return `<button class="slot-row ${b.status === 'cancelado' ? 'cancelled' : ''}" data-act="bk-open" data-id="${b.id}">
      <span class="t">${b.time}</span><span class="grow"><b>${esc(b.name)}</b><span>${showDate ? relDate(b.date) + ' · ' : ''}${esc(b.serviceName)}</span></span>
      <span class="pill ${cls}">${b.status === 'pendente' ? 'Confirmar' : label}</span></button>`;
  }
  function bookingSheet(b) {
    const [cls, label] = statusLabel(b), active = b.status !== 'cancelado';
    sheet(`<h2>${esc(b.name)}</h2><p class="sub">${esc(b.serviceName)} · ${longDate(b.date)} às ${b.time}</p>
      <div class="sheet-body">
        <span class="pill ${cls}">${label}${b.origem === 'clinica' ? ` · lançada pela clínica${b.canal ? ' (' + esc(b.canal) + ')' : ''}` : ' · agendada pelo app'}</span>
        <div class="card summary">
          <div class="summary-row">${ic('wa')}<div class="grow"><span>WhatsApp</span><b>${esc(UR.maskPhone(b.phone))}</b></div></div>
          ${b.note ? `<div class="summary-row">${ic('edit')}<div class="grow"><span>Observação</span><b>${esc(b.note)}</b></div></div>` : ''}
        </div>
        ${active && b.status === 'pendente' ? `<button class="btn primary block" data-act="bk-confirm" data-id="${b.id}">${ic('check')} Confirmar consulta</button>` : ''}
        <div class="row-actions">
          <a class="btn wa" target="_blank" rel="noopener" href="${waLink(patientWa(b), b.status === 'confirmado' ? reminderMsg(b) : confirmMsg(b))}">${ic('wa')} ${b.status === 'confirmado' ? 'Lembrete' : 'WhatsApp'}</a>
          <a class="btn light" href="tel:+${patientWa(b)}">${ic('phone')} Ligar</a>
        </div>
        ${active ? `<button class="btn danger block" data-act="bk-cancel" data-id="${b.id}">Cancelar consulta</button>` : ''}
        <button class="btn ghost block" data-act="close">Fechar</button>
      </div>`);
  }

  /* ---------- Horários: bloqueios e expediente ---------- */
  SCREENS.horarios = () => {
    if (!isAdmin()) return go(S.user ? 'inicio' : 'perfil');
    if (!S.blocks) { loadBlocks().then(refresh); return { tab: 'horarios', title: 'Horários', html: '<div class="skeleton"></div>' }; }
    const cfg = A.get(), order = [1, 2, 3, 4, 5, 6, 0];
    const opts = (sel) => { let o = ''; for (let m = 6 * 60; m <= 22 * 60; m += 30) { const t = A.toTime(m); o += `<option ${t === sel ? 'selected' : ''}>${t}</option>`; } return o; };
    const blocks = S.blocks.slice().sort((a, b) => (a.date + a.times[0]).localeCompare(b.date + b.times[0]));
    return {
      tab: 'horarios', title: 'Horários',
      html: `
      <div class="page-title"><h2>Bloquear <em>agenda</em></h2><p>Folga, feriado, atestado ou saída mais cedo. Horários bloqueados somem do agendamento online na hora.</p></div>
      <button class="btn primary block" data-act="block-new">${ic('block')} Bloquear dia ou horário</button>
      <section>
        <div class="section-h"><h3>Bloqueios ativos</h3><span class="muted small">${blocks.length}</span></div>
        ${blocks.length ? `<div class="day-list">${blocks.map((k) => {
          const ts = k.times.slice().sort();
          return `<button class="slot-row blocked" data-act="block-open" data-id="${k.id}"><span class="grow"><b>${relDate(k.date)}${k.reason ? ' · ' + esc(k.reason) : ''}</b><span>${k.allDay ? 'Dia inteiro' : ts.length === 1 ? ts[0] : ts[0] + ' – ' + A.toTime(A.toMin(ts[ts.length - 1]) + 30) + ` (${ts.length} horários)`}</span></span>${ic('chev', 'chev')}</button>`;
        }).join('')}</div>` : '<p class="muted small" style="padding:0 4px">Nenhum bloqueio.</p>'}
      </section>
      <section>
        <div class="section-h"><h3>Horário de funcionamento</h3></div>
        <form id="hoursForm" class="card">
          ${order.map((d) => { const c = cfg.days[d]; return `<div class="wk">
            <b>${WDL[d]}</b><label class="switch"><input type="checkbox" name="open${d}" data-act="wk-toggle" data-d="${d}" ${c.open ? 'checked' : ''} aria-label="Aberto ${WDL[d]}"><span></span></label>
            <div class="range ${c.open ? '' : 'off'}" data-range="${d}"><label class="field"><select name="start${d}" aria-label="Abre">${opts(c.start)}</select></label><span class="muted">até</span><label class="field"><select name="end${d}" aria-label="Fecha">${opts(c.end)}</select></label></div>
          </div>`; }).join('')}
          <div class="wk"><b>Intervalo de almoço</b><label class="switch"><input type="checkbox" name="lunch" data-act="wk-toggle" data-d="lunch" ${cfg.lunch ? 'checked' : ''} aria-label="Intervalo de almoço"><span></span></label>
            <div class="range ${cfg.lunch ? '' : 'off'}" data-range="lunch"><label class="field"><select name="lunchStart" aria-label="Início do almoço">${opts(cfg.lunch ? cfg.lunch.start : '12:00')}</select></label><span class="muted">até</span><label class="field"><select name="lunchEnd" aria-label="Fim do almoço">${opts(cfg.lunch ? cfg.lunch.end : '13:00')}</select></label></div></div>
          <button class="btn primary block" type="submit" style="margin-top:14px">Salvar horário</button>
          <p class="hint" style="margin-top:10px">Consultas já marcadas continuam valendo. O novo horário vale para os próximos agendamentos.</p>
        </form>
      </section>`
    };
  };
  function blockSheet() {
    const t = A.today();
    const st = { date: A.times(t).length ? t : addDays(t, 1), all: true, times: [], reason: 'Folga' };
    const draw = () => {
      const times = A.times(st.date), busy = (S.taken[st.date]) || {};
      sheet(`<h2>Bloquear agenda</h2><p class="sub">Os horários bloqueados não aparecem para os pacientes.</p>
        <form class="sheet-body" id="blockForm">
          <label class="field"><span>Dia</span><input type="date" name="date" min="${t}" value="${st.date}"></label>
          ${times.length ? `<div class="list-item" style="padding:0;border:0;min-height:44px"><span class="grow"><b>Dia inteiro</b></span><label class="switch"><input type="checkbox" name="all" ${st.all ? 'checked' : ''} aria-label="Dia inteiro"><span></span></label></div>
          ${st.all ? '' : `<div class="field"><span>Horários (toque para marcar)</span><div class="times">${times.map((x) => `<button type="button" class="time ${st.times.includes(x) ? 'on' : ''}" data-t="${x}" ${busy[x] ? 'disabled style="opacity:.35;text-decoration:line-through"' : ''}>${x}</button>`).join('')}</div><span class="hint">Riscados já têm consulta ou bloqueio.</span></div>`}`
            : '<p class="hint">A clínica não abre neste dia, não há o que bloquear.</p>'}
          <div class="field"><span>Motivo</span><div class="chips">${['Folga', 'Feriado', 'Atestado', 'Compromisso', 'Outro'].map((r) => `<button type="button" class="chip ${st.reason === r ? 'on' : ''}" data-r="${r}">${r}</button>`).join('')}</div></div>
          <button class="btn primary block" type="submit" ${times.length ? '' : 'disabled'}>Bloquear</button>
          <button class="btn ghost block" type="button" data-act="close">Cancelar</button>
        </form>`);
      const fm = $('#blockForm');
      $('[name=date]', fm).addEventListener('change', (e) => { if (e.target.value) { st.date = e.target.value; st.times = []; loadTaken().then(draw); } });
      const all = $('[name=all]', fm); if (all) all.addEventListener('change', (e) => { st.all = e.target.checked; draw(); });
      fm.addEventListener('click', (e) => {
        const tb = e.target.closest('[data-t]'); if (tb && !tb.disabled) { const x = tb.dataset.t; st.times = st.times.includes(x) ? st.times.filter((y) => y !== x) : st.times.concat(x); tb.classList.toggle('on'); }
        const rb = e.target.closest('[data-r]'); if (rb) { st.reason = rb.dataset.r; $$('[data-r]', fm).forEach((c) => c.classList.toggle('on', c === rb)); }
      });
      fm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const list = st.all ? A.times(st.date) : st.times;
        if (!list.length) { toast('Marque pelo menos um horário.'); return; }
        const btn = $('[type=submit]', fm); btn.disabled = true; btn.textContent = 'Bloqueando…';
        try {
          const r = await api.blockSlots(st.date, list, st.reason);
          closeSheet(); S.takenAt = 0; await Promise.all([loadBlocks(), loadTaken(true)]); refresh();
          toast(r.created ? `Bloqueado: ${r.created} horário${r.created > 1 ? 's' : ''}.${r.skipped ? ` ${r.skipped} já tinha${r.skipped > 1 ? 'm' : ''} consulta; cancele na Agenda se precisar.` : ''}` : 'Esses horários já estavam ocupados.');
        } catch (err) { btn.disabled = false; btn.textContent = 'Bloquear'; toast('Não foi possível bloquear. Tente de novo.'); }
      });
    };
    loadTaken().then(draw);
  }

  /* ====================== Ações ====================== */
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.tagName === 'INPUT') return;
    const act = el.dataset.act, id = el.dataset.id;
    const findMine = () => (S.mine || []).find((b) => b.id === id) || (S.all || []).find((b) => b.id === id) || (S.last && S.last.id === id ? S.last : null);
    switch (act) {
      case 'back': readForm(); go(el.dataset.to); break;
      case 'nav': readForm(); go(el.dataset.to); break;
      case 'close': closeSheet(); break;
      case 'svc-go': bk.service = id; await loadTaken(); go('agendar/quando'); break;
      case 'svc': bk.service = id; el.classList.add('on'); await loadTaken(); go('agendar/quando'); break;
      case 'date': bk.date = el.dataset.v; bk.time = null; refresh(); break;
      case 'time': bk.time = el.dataset.v; refresh(); break;
      case 'to-confirm': go('agendar/confirmar'); break;
      case 'authmode': readForm(); bk.auth = el.dataset.v; refresh(); break;
      case 'origem': readForm(); bk.origem = el.dataset.v; refresh(); break;
      case 'confirm': confirmBooking(el); break;
      case 'again': S.last = null; go('agendar'); break;
      case 'ics': { const b = findMine(); if (b) downloadIcs(b); break; }
      case 'appt-tab': apptTab = el.dataset.v; refresh(); break;
      case 'cancel': { const b = findMine(); if (b) cancelSheet(b); break; }
      case 'cancel-yes': {
        const b = findMine(); if (!b) break;
        el.disabled = true; el.textContent = 'Cancelando…';
        try { await api.cancelBooking(b); closeSheet(); toast('Consulta cancelada. O horário foi liberado.'); S.takenAt = 0; await loadMine(); refresh(); }
        catch (err) { el.disabled = false; el.textContent = 'Sim, cancelar consulta'; toast('Não foi possível cancelar. Tente de novo.'); }
        break;
      }
      case 'reschedule': {
        const b = findMine(); if (!b) break;
        sheet(`<h2>Reagendar</h2><p class="sub">Você escolhe o novo horário e, ao confirmar, a consulta de ${longDate(b.date).toLowerCase()} às ${b.time} é cancelada.</p>
          <div class="sheet-body"><button class="btn primary block" data-act="resched-go" data-id="${b.id}">Escolher novo horário</button><button class="btn light block" data-act="close">Voltar</button></div>`);
        break;
      }
      case 'resched-go': {
        const b = findMine(); if (!b) break;
        closeSheet();
        try { await api.cancelBooking(b); } catch (err) { toast('Não foi possível reagendar agora.'); break; }
        bk.service = b.service; bk.date = null; bk.time = null; bk.form = { name: b.name, phone: b.phone, note: b.note };
        S.takenAt = 0; await Promise.all([loadMine(), loadTaken(true)]);
        toast('Consulta anterior cancelada. Escolha o novo horário.');
        go('agendar/quando'); break;
      }
      case 'push-on': {
        el.disabled = true;
        try { await api.savePush(isAdmin() ? 'clinica' : 'paciente'); S.push = true; toast('Notificações ativadas.'); const o = el.closest('[data-push-offer]'); if (o) o.hidden = true; }
        catch (err) { toast(err.message); el.disabled = false; }
        break;
      }
      case 'auth-tab': authMode = el.dataset.v; refresh(); break;
      case 'forgot': forgotSheet(); break;
      case 'change-pass':
        try { await api.resetPassword(S.user.email); toast('Enviamos um link para ' + S.user.email + '.'); } catch (err) { toast(err.message); }
        break;
      case 'edit-profile': profileSheet(); break;
      case 'logout': await api.signOut(); toast('Você saiu da conta.'); go('inicio'); break;
      case 'delete-account': deleteSheet(); break;
      case 'ag-today': agendaFilter = 'dia'; go('agenda'); break;
      case 'ag-day': agendaFilter = 'dia'; go('agenda/' + el.dataset.v); break;
      case 'ag-pend': agendaFilter = 'pendentes'; refresh(); break;
      case 'bk-open': { const b = findMine(); if (b) bookingSheet(b); break; }
      case 'bk-confirm': {
        const b = findMine(); if (!b) break; el.disabled = true;
        try { await api.setStatus(b, 'confirmado'); closeSheet(); toast(b.origem === 'clinica' ? 'Consulta confirmada.' : 'Consulta confirmada. O paciente foi avisado.'); }
        catch (err) { el.disabled = false; toast('Não foi possível confirmar.'); }
        break;
      }
      case 'bk-cancel': {
        const b = findMine(); if (!b) break;
        if (el.dataset.sure !== '1') { el.dataset.sure = '1'; el.textContent = 'Toque de novo para cancelar'; break; }
        el.disabled = true;
        try { await api.setStatus(b, 'cancelado'); closeSheet(); S.takenAt = 0; loadTaken(true); toast('Consulta cancelada e horário liberado.'); }
        catch (err) { el.disabled = false; toast('Não foi possível cancelar.'); }
        break;
      }
      case 'block-new': blockSheet(); break;
      case 'block-open': {
        const k = (S.blocks || []).find((x) => x.id === id); if (!k) break;
        const ts = k.times.slice().sort();
        sheet(`<h2>Bloqueio</h2><p class="sub">${longDate(k.date)} · ${k.allDay ? 'dia inteiro' : ts.join(', ')}${k.reason ? ' · ' + esc(k.reason) : ''}</p>
          <div class="sheet-body"><button class="btn danger block" data-act="unblock" data-id="${k.id}">Desbloquear e liberar horários</button><button class="btn light block" data-act="close">Fechar</button></div>`);
        break;
      }
      case 'unblock': {
        const k = (S.blocks || []).find((x) => x.id === id); if (!k) break; el.disabled = true;
        try { await api.unblock(k); closeSheet(); S.takenAt = 0; await Promise.all([loadBlocks(), loadTaken(true)]); refresh(); toast('Horários liberados.'); }
        catch (err) { el.disabled = false; toast('Não foi possível desbloquear.'); }
        break;
      }
    }
  });

  document.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.dataset.act === 'push-toggle') {
      el.disabled = true;
      try {
        if (el.checked) { await api.savePush(el.dataset.role); S.push = true; toast('Notificações ativadas neste aparelho.'); }
        else { await api.removePush(); S.push = false; toast('Notificações desativadas.'); }
      } catch (err) { el.checked = !el.checked; toast(err.message); }
      el.disabled = false;
    }
    if (el.dataset.act === 'wk-toggle') { const r = $(`[data-range="${el.dataset.d}"]`); if (r) r.classList.toggle('off', !el.checked); }
  });

  document.addEventListener('input', (e) => { if (e.target.name === 'phone') e.target.value = UR.maskPhone(e.target.value); });

  document.addEventListener('submit', async (e) => {
    const fm = e.target;
    if (fm.id === 'confirmForm') { e.preventDefault(); const b = $('[data-act="confirm"]'); if (b) confirmBooking(b); }
    if (fm.id === 'authForm') {
      e.preventDefault();
      const signup = authMode === 'signup', email = val(fm, 'email').toLowerCase(), pass = $('[name=pass]', fm).value;
      let ok = setErr(fm, 'email', validEmail(email) ? '' : 'Digite um e-mail válido.');
      if (signup) {
        ok = setErr(fm, 'name', val(fm, 'name').length >= 3 ? '' : 'Digite seu nome completo.') && ok;
        ok = setErr(fm, 'phone', UR.digits(val(fm, 'phone')).length >= 10 ? '' : 'Digite o WhatsApp com DDD.') && ok;
        ok = setErr(fm, 'pass', pass.length >= 6 ? '' : 'A senha precisa ter pelo menos 6 caracteres.') && ok;
        ok = setErr(fm, 'consent', $('[name=consent]', fm).checked ? '' : 'Para criar a conta, aceite a política de privacidade.') && ok;
      } else ok = setErr(fm, 'pass', pass ? '' : 'Digite sua senha.') && ok;
      if (!ok) return;
      const btn = $('[type=submit]', fm); btn.disabled = true; btn.textContent = 'Aguarde…';
      try {
        if (signup) await api.signUp({ name: val(fm, 'name'), phone: UR.digits(val(fm, 'phone')), email, pass });
        else await api.signIn(email, pass);
        await waitUser();
        toast(signup ? 'Conta criada. Bem-vindo!' : 'Bem-vindo de volta!');
        go(isAdmin() ? 'agenda' : 'inicio');
      } catch (err) {
        btn.disabled = false; btn.textContent = signup ? 'Criar conta' : 'Entrar';
        setErr(fm, err.field === 'email' ? 'email' : 'pass', err.message);
      }
    }
    if (fm.id === 'hoursForm') {
      e.preventDefault();
      const cfg = A.get(), btn = $('[type=submit]', fm);
      for (let d = 0; d < 7; d++) {
        const open = fm[`open${d}`].checked, start = fm[`start${d}`].value, end = fm[`end${d}`].value;
        if (open && A.toMin(end) <= A.toMin(start)) { toast(`${WDL[d]}: o fechamento precisa ser depois da abertura.`); return; }
        cfg.days[d] = { open, start, end };
      }
      cfg.lunch = fm.lunch.checked ? { start: fm.lunchStart.value, end: fm.lunchEnd.value } : null;
      if (cfg.lunch && A.toMin(cfg.lunch.end) <= A.toMin(cfg.lunch.start)) { toast('O fim do almoço precisa ser depois do início.'); return; }
      btn.disabled = true; btn.textContent = 'Salvando…';
      try { await api.saveConfig(cfg); A.set(cfg); toast('Horário de funcionamento salvo.'); }
      catch (err) { toast('Não foi possível salvar. Tente de novo.'); }
      btn.disabled = false; btn.textContent = 'Salvar horário';
    }
  });

  function forgotSheet() {
    const pre = (bk.form && bk.form.email) || (($('[name=email]') || {}).value || '');
    sheet(`<h2>Esqueci minha senha</h2><p class="sub">Digite o e-mail da sua conta. Enviamos um link para você criar uma senha nova.</p>
      <form class="sheet-body" id="forgotForm" novalidate>${field('email', 'E-mail', 'email', 'autocomplete="email" inputmode="email" autocapitalize="off"', pre)}
      <button class="btn primary block" type="submit">Enviar link</button><button class="btn ghost block" type="button" data-act="close">Cancelar</button></form>`);
    $('#forgotForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fm = e.target, email = val(fm, 'email').toLowerCase();
      if (!setErr(fm, 'email', validEmail(email) ? '' : 'Digite um e-mail válido.')) return;
      const btn = $('[type=submit]', fm); btn.disabled = true; btn.textContent = 'Enviando…';
      try {
        await api.resetPassword(email);
        sheetEl.querySelector('.sub').textContent = `Se existir uma conta com ${email}, o link já está a caminho. Confira também a caixa de spam.`;
        fm.innerHTML = '<button class="btn primary block" type="button" data-act="close">Entendi</button>';
      } catch (err) { btn.disabled = false; btn.textContent = 'Enviar link'; setErr(fm, 'email', err.message); }
    });
  }
  function profileSheet() {
    const u = S.user;
    sheet(`<h2>Meus dados</h2><p class="sub">${esc(u.email)}</p>
      <form class="sheet-body" id="profileForm" novalidate>
        ${field('name', 'Nome completo', 'text', 'autocomplete="name" autocapitalize="words"', u.name)}
        ${field('phone', 'WhatsApp', 'tel', 'inputmode="tel" autocomplete="tel"', UR.maskPhone(u.phone || ''))}
        <button class="btn primary block" type="submit">Salvar</button><button class="btn ghost block" type="button" data-act="close">Cancelar</button></form>`);
    $('#profileForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fm = e.target, name = val(fm, 'name'), phone = UR.digits(val(fm, 'phone'));
      let ok = setErr(fm, 'name', name.length >= 3 ? '' : 'Digite seu nome completo.');
      ok = setErr(fm, 'phone', phone.length >= 10 ? '' : 'Digite o WhatsApp com DDD.') && ok;
      if (!ok) return;
      try { await api.updateProfile({ name, phone }); closeSheet(); toast('Dados atualizados.'); refresh(); }
      catch (err) { toast('Não foi possível salvar.'); }
    });
  }
  function deleteSheet() {
    sheet(`<h2>Excluir conta</h2><p class="sub">Isso apaga seu cadastro (nome, e-mail e WhatsApp) e cancela suas consultas futuras. O histórico de atendimentos que a clínica precisa manter por lei fica com a clínica.</p>
      <form class="sheet-body" id="deleteForm" novalidate>${field('pass', 'Digite sua senha para confirmar', 'password', 'autocomplete="current-password"')}
      <button class="btn danger block" type="submit">Excluir minha conta</button><button class="btn light block" type="button" data-act="close">Voltar</button></form>`);
    $('#deleteForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fm = e.target, pass = $('[name=pass]', fm).value;
      if (!setErr(fm, 'pass', pass ? '' : 'Digite sua senha.')) return;
      const btn = $('[type=submit]', fm); btn.disabled = true; btn.textContent = 'Excluindo…';
      try { await api.removePush().catch(() => {}); await api.deleteAccount(pass); closeSheet(); toast('Sua conta foi excluída.'); go('inicio'); }
      catch (err) { btn.disabled = false; btn.textContent = 'Excluir minha conta'; setErr(fm, 'pass', err.message); }
    });
  }

  /* Arquivo de calendário: o celular abre direto na agenda */
  function downloadIcs(b) {
    const [y, m, d] = b.date.split('-'), [hh, mm] = b.time.split(':');
    const end = A.toTime(A.toMin(b.time) + 30).split(':');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Uni Risos//App//PT', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:${b.id}@uni-risos`, `DTSTAMP:${stamp}`,
      `DTSTART;TZID=America/Sao_Paulo:${y}${m}${d}T${hh}${mm}00`, `DTEND;TZID=America/Sao_Paulo:${y}${m}${d}T${end[0]}${end[1]}00`,
      `SUMMARY:Consulta Uni Risos · ${b.serviceName}`, 'LOCATION:Av. Felipe Carrillo Puerto\\, 400 - Jardim Iae\\, São Paulo - SP',
      'DESCRIPTION:Uni Risos Odontologia Especializada · (11) 96400-8106',
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Consulta na Uni Risos em 2 horas', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const url = URL.createObjectURL(new Blob([txt], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'consulta-uni-risos.ics';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /* ---------- Início ---------- */
  const banner = $('#banner');
  api.onAuth((u) => {
    const was = S.user ? S.user.uid : null;
    S.user = u; S.push = null;
    if (u && u.admin) startAdmin(); else stopAdmin();
    if (u && !u.admin) loadMine().then(refresh); else S.mine = null;
    if (!current || (was || null) !== (u ? u.uid : null)) route(); else refresh();
  });
  api.ready.then(() => {
    if (api.mode === 'local') { banner.hidden = false; banner.textContent = 'Modo de demonstração: os dados ficam só neste aparelho.'; }
    loadTaken();
    setTimeout(() => $('#splash').classList.add('out'), 150);
    setTimeout(() => { const s = $('#splash'); if (s) s.remove(); }, 600);
  });
  document.addEventListener('ur:agenda', () => { if (/^(agendar|horarios|agenda|inicio)/.test(current)) refresh(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    S.takenAt = 0;
    if (S.user && !isAdmin()) loadMine().then(refresh);
    if (/^agendar\/quando/.test(current)) loadTaken(true).then(refresh);
  });
  setTimeout(() => { const s = $('#splash'); if (s) { s.classList.add('out'); setTimeout(() => s.remove(), 500); } }, 3500);
})();
