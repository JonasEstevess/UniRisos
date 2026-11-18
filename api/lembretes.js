/* GET /api/lembretes — rodado pela Vercel todo dia às 10h (horário de Brasília), ver "crons" em vercel.json.
   Avisa cada paciente da consulta de amanhã e manda à clínica o resumo do dia seguinte. */
const { init, fmtDate, spDate, pushTo, sendMail, patientEmail, send, SITE, env } = require('./_lib');

module.exports = async (req, res) => {
  if (!env.CRON_SECRET || req.headers.authorization !== `Bearer ${env.CRON_SECRET}`) return send(res, 401, { erro: 'Não autorizado' });
  try {
    const { db } = init();
    const amanha = spDate(1);
    const snap = await db.collection('bookings').where('date', '==', amanha).get();
    const ativas = snap.docs.filter((d) => ['pendente', 'confirmado'].includes(d.data().status));
    let pacientes = 0;

    for (const doc of ativas) {
      const b = doc.data();
      if (b.remindedAt || b.origem === 'clinica') continue;
      const quando = `amanhã, ${fmtDate(b.date)}, às ${b.time}`;
      const p = await pushTo({ uid: b.uid }, {
        title: 'Lembrete da sua consulta',
        body: `${b.serviceName} ${quando}. Av. Felipe Carrillo Puerto, 400.`,
        url: `${SITE}/app/#consultas`, tag: `lembrete-${doc.id}`
      });
      const m = await sendMail(await patientEmail(b.uid), `Lembrete: sua consulta é ${quando}`, [
        `Olá, ${b.name.split(' ')[0]}!`,
        `Passando para lembrar da sua consulta de ${b.serviceName} ${quando}.`,
        'Endereço: Av. Felipe Carrillo Puerto, 400, Jardim Iae, São Paulo.',
        `Se não puder ir, cancele em ${SITE}/app/#consultas para liberar o horário.`
      ]).catch(() => false);
      if (p || m) pacientes++;
      await doc.ref.set({ remindedAt: new Date().toISOString() }, { merge: true });
    }

    const pendentes = ativas.filter((d) => d.data().status === 'pendente').length;
    if (ativas.length) {
      const lista = ativas.map((d) => d.data()).sort((a, b) => a.time.localeCompare(b.time));
      await pushTo({ role: 'clinica' }, {
        title: `Amanhã: ${ativas.length} consulta${ativas.length > 1 ? 's' : ''}`,
        body: pendentes ? `${pendentes} aguardando confirmação. Toque para ver.` : 'Todas confirmadas.',
        url: `${SITE}/app/#agenda/${amanha}`, tag: `resumo-${amanha}`
      });
      await sendMail(env.CLINIC_EMAIL || env.SMTP_USER, `Agenda de amanhã (${fmtDate(amanha)}): ${ativas.length} consulta(s)`,
        lista.map((b) => `${b.time} · ${b.name} · ${b.serviceName} · ${b.status === 'pendente' ? 'aguardando confirmação' : 'confirmada'}`)
      ).catch(() => false);
    }
    return send(res, 200, { ok: true, data: amanha, consultas: ativas.length, lembretesEnviados: pacientes });
  } catch (e) {
    console.error('[lembretes]', e);
    return send(res, e.status || 500, { erro: e.message });
  }
};
