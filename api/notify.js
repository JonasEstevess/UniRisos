/* POST /api/notify — chamado pelo app logo depois de agendar, cancelar ou confirmar.
   Corpo: { bookingId, event: 'novo' | 'cancelado' | 'confirmado' }, com o token do Firebase no cabeçalho. */
const { init, fmtDate, pushTo, sendMail, patientEmail, send, SITE, env } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { erro: 'Use POST' });
  try {
    const { db, auth } = init();
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return send(res, 401, { erro: 'Sem login' });
    const me = await auth.verifyIdToken(token);

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { bookingId, event } = body;
    if (!bookingId || !['novo', 'cancelado', 'confirmado'].includes(event)) return send(res, 400, { erro: 'Pedido inválido' });

    const ref = db.doc(`bookings/${bookingId}`);
    const snap = await ref.get();
    if (!snap.exists) return send(res, 404, { erro: 'Consulta não encontrada' });
    const b = snap.data();
    const isAdmin = (await db.doc(`admins/${me.uid}`).get()).exists;
    if (b.uid !== me.uid && !isAdmin) return send(res, 403, { erro: 'Sem permissão' });

    const notified = b.notified || {};
    if (notified[event]) return send(res, 200, { ok: true, repetido: true });
    if (event !== 'novo' && b.status !== event) return send(res, 409, { erro: 'Status não confere' });

    const quando = `${fmtDate(b.date)} às ${b.time}`;
    const clinicMail = env.CLINIC_EMAIL || env.SMTP_USER;
    const result = { push: 0, email: false };
    const patientHasAccount = b.origem !== 'clinica';

    if (event === 'novo') {
      if (b.uid !== me.uid) return send(res, 403, { erro: 'Sem permissão' });
      result.push = await pushTo({ role: 'clinica' }, {
        title: 'Novo agendamento',
        body: `${b.name} · ${b.serviceName} · ${quando}`,
        url: `${SITE}/app/#agenda/${b.date}`, tag: `novo-${bookingId}`
      });
      result.email = await sendMail(clinicMail, `Novo agendamento: ${b.name}, ${quando}`, [
        'Um paciente acabou de agendar pelo app.',
        `Paciente: ${b.name}`, `WhatsApp: ${b.phone}`, `Tratamento: ${b.serviceName}`, `Quando: ${quando}`,
        b.note ? `Observação: ${b.note}` : '',
        `Confirme ou cancele em ${SITE}/app/#agenda/${b.date}`
      ]).catch(() => false);
    } else if (event === 'cancelado' && !isAdmin) {
      result.push = await pushTo({ role: 'clinica' }, {
        title: 'Consulta cancelada pelo paciente',
        body: `${b.name} · ${quando}. O horário foi liberado.`,
        url: `${SITE}/app/#agenda/${b.date}`, tag: `cancel-${bookingId}`
      });
      result.email = await sendMail(clinicMail, `Cancelamento: ${b.name}, ${quando}`, [
        `${b.name} cancelou a consulta de ${b.serviceName} marcada para ${quando}.`,
        'O horário já está livre para outro paciente.'
      ]).catch(() => false);
    } else if (patientHasAccount) {
      const confirmado = event === 'confirmado';
      result.push = await pushTo({ uid: b.uid }, {
        title: confirmado ? 'Consulta confirmada' : 'Consulta cancelada pela clínica',
        body: confirmado ? `${b.serviceName} · ${quando}. Até lá!` : `${b.serviceName} · ${quando}. Fale com a clínica para remarcar.`,
        url: `${SITE}/app/#consultas`, tag: `status-${bookingId}`
      });
      result.email = await sendMail(await patientEmail(b.uid),
        confirmado ? `Sua consulta está confirmada: ${quando}` : `Sua consulta foi cancelada: ${quando}`,
        confirmado
          ? [`Olá, ${b.name.split(' ')[0]}!`, `A Uni Risos confirmou sua consulta de ${b.serviceName} para ${quando}.`, 'Endereço: Av. Felipe Carrillo Puerto, 400, Jardim Iae, São Paulo.', `Veja ou cancele em ${SITE}/app/#consultas`]
          : [`Olá, ${b.name.split(' ')[0]}.`, `A clínica precisou cancelar sua consulta de ${b.serviceName} de ${quando}.`, `Para remarcar, agende de novo em ${SITE}/app/#agendar ou fale pelo WhatsApp (11) 96400-8106.`]
      ).catch(() => false);
    }

    await ref.set({ notified: { ...notified, [event]: new Date().toISOString() } }, { merge: true });
    return send(res, 200, { ok: true, ...result });
  } catch (e) {
    console.error('[notify]', e);
    return send(res, e.status || (e.code && String(e.code).startsWith('auth/') ? 401 : 500), { erro: e.message });
  }
};
