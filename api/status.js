/* GET /api/status — mostra quais serviços do servidor estão configurados (nunca mostra valores). */
const { status, send } = require('./_lib');

module.exports = (req, res) => send(res, 200, status());
