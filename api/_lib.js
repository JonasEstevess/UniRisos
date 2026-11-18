/* Uni Risos — utilitários do servidor (funções da Vercel).
   Arquivos que começam com "_" dentro de /api não viram rotas. */
const admin = require('firebase-admin');
const webpush = require('web-push');
let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch (e) { /* e-mail é opcional */ }

const env = process.env;
const SITE = (env.SITE_URL || 'https://uni-risos.vercel.app').replace(/\/$/, '');

let ready = null;
function init() {
  if (ready) return ready;
  if (!env.FIREBASE_SERVICE_ACCOUNT) throw Object.assign(new Error('FIREBASE_SERVICE_ACCOUNT não configurada na Vercel'), { status: 503 });
  if (!admin.apps.length) {
    const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  const push = !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
  if (push) webpush.setVapidDetails(env.VAPID_SUBJECT || SITE, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  let mailer = null;
  if (nodemailer && env.SMTP_USER && env.SMTP_PASS) {
    mailer = nodemailer.createTransport({
      host: env.SMTP_HOST || 'smtp.gmail.com',
      port: +(env.SMTP_PORT || 465),
      secure: +(env.SMTP_PORT || 465) === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
    });
  }
  ready = { db: admin.firestore(), auth: admin.auth(), push, mailer };
  return ready;
}

function status() {
  return {
    servidor: !!env.FIREBASE_SERVICE_ACCOUNT,
    notificacoes: !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
    email: !!(env.SMTP_USER && env.SMTP_PASS),
    emailClinica: !!(env.CLINIC_EMAIL || env.SMTP_USER),
    lembretes: !!env.CRON_SECRET
  };
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DIAS[wd]}, ${d} de ${MESES[m - 1]}`;
}
/* Data de hoje + n dias no fuso de São Paulo, no formato AAAA-MM-DD */
function spDate(addDays) {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  now.setDate(now.getDate() + (addDays || 0));
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/* Envia notificação para os aparelhos cadastrados. Alvo: { role: 'clinica' } ou { uid } */
async function pushTo(target, payload) {
  const { db, push } = init();
  if (!push) return 0;
  let q = db.collection('pushSubs');
  q = target.role ? q.where('role', '==', target.role) : q.where('uid', '==', target.uid);
  const snap = await q.get();
  let sent = 0;
  await Promise.all(snap.docs.map(async (doc) => {
    try {
      await webpush.sendNotification(JSON.parse(doc.data().sub), JSON.stringify(payload), { TTL: 60 * 60 * 24, urgency: 'high' });
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await doc.ref.delete().catch(() => {});
    }
  }));
  return sent;
}

async function sendMail(to, subject, lines) {
  const { mailer } = init();
  if (!mailer || !to) return false;
  const text = lines.join('\n');
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#17211a">
    ${lines.map((l) => (l ? `<p style="margin:0 0 10px">${escapeHtml(l)}</p>` : '')).join('')}
    <p style="margin:18px 0 0;color:#5d6b5c;font-size:13px">Uni Risos · Av. Felipe Carrillo Puerto, 400 · Jardim Iae, São Paulo · (11) 96400-8106</p></div>`;
  await mailer.sendMail({ from: `"Uni Risos" <${env.SMTP_USER}>`, to, subject, text, html });
  return true;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function patientEmail(uid) {
  const { db } = init();
  const d = await db.doc(`users/${uid}`).get();
  return d.exists ? d.data().email : null;
}

function send(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

module.exports = { init, status, fmtDate, spDate, pushTo, sendMail, patientEmail, send, SITE, env };
