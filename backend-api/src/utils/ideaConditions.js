function parseCondition(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Condiciones inválidas');
  if (body.remove === true) return null;
  const result = {};
  if (body.maxBudget !== undefined && body.maxBudget !== null) {
    if (typeof body.maxBudget !== 'number' || !Number.isFinite(body.maxBudget) || body.maxBudget < 0 || body.maxBudget > 1000000 || Math.abs(body.maxBudget * 100 - Math.round(body.maxBudget * 100)) > 0.00001) throw new Error('Presupuesto inválido');
    result.maxBudget = body.maxBudget;
    result.currency = body.currency || 'DOP';
    if (!['DOP', 'USD', 'EUR'].includes(result.currency)) throw new Error('Moneda inválida');
  }
  if (body.dayOfWeek !== undefined && body.dayOfWeek !== null) {
    if (!Number.isInteger(body.dayOfWeek) || body.dayOfWeek < 0 || body.dayOfWeek > 6) throw new Error('Día inválido');
    result.dayOfWeek = body.dayOfWeek;
  }
  if (body.zone !== undefined && body.zone !== '') {
    if (typeof body.zone !== 'string' || body.zone.trim().length > 80 || !body.zone.trim()) throw new Error('Zona inválida');
    result.zone = body.zone.trim();
  }
  if (!Object.keys(result).length) throw new Error('Elige al menos una condición');
  return result;
}
// Suppress small groups, including exact budgets/zones: identities cannot be inferred
// by publishing the single answer of a newly created idea.
function summarizeConditions(rows) {
  const threshold = 5;
  if (rows.length < threshold) return { ready: false, minimumResponses: threshold };
  const days = Object.create(null), zones = Object.create(null), budgets = Object.create(null);
  for (const row of rows) {
    if (row.dayOfWeek !== undefined) days[row.dayOfWeek] = (days[row.dayOfWeek] || 0) + 1;
    if (row.zone) zones[row.zone] = (zones[row.zone] || 0) + 1;
    if (typeof row.maxBudget === 'number') {
      const bucket = row.maxBudget === 0 ? 'gratis' : row.maxBudget <= 500 ? 'hasta 500' : row.maxBudget <= 1500 ? '501–1500' : 'más de 1500';
      const key = `${row.currency || 'DOP'}: ${bucket}`;
      budgets[key] = (budgets[key] || 0) + 1;
    }
  }
  const safe = entries => Object.entries(entries).filter(([, count]) => count >= threshold).map(([value, count]) => ({ value, count }));
  return { ready: true, minimumResponses: threshold, days: safe(days), zones: safe(zones), budgets: safe(budgets) };
}
module.exports = { parseCondition, summarizeConditions };
