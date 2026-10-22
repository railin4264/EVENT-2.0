const FIELDS = ['arrival', 'bring', 'accessibility', 'parking', 'welcoming'];
const money = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000000 && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001;
function normalizePlanning(body, currency) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !['practical', 'budget'].includes(k))) throw new Error('Información inválida');
  const result = {};
  if (body.practical !== undefined) {
    if (!body.practical || typeof body.practical !== 'object' || Array.isArray(body.practical) || Object.keys(body.practical).some(k => !FIELDS.includes(k))) throw new Error('Información práctica inválida');
    result.practicalInfo = {};
    for (const key of FIELDS) { const value = body.practical[key] ?? ''; if (typeof value !== 'string' || value.length > 500) throw new Error('Cada indicación admite hasta 500 caracteres'); result.practicalInfo[key] = value.trim(); }
  }
  if (body.budget !== undefined) {
    const budget = body.budget;
    if (!budget || typeof budget !== 'object' || Array.isArray(budget) || Object.keys(budget).some(k => !['complete', 'mandatory', 'optional'].includes(k)) || typeof budget.complete !== 'boolean') throw new Error('Presupuesto inválido');
    result.outingBudget = { complete: budget.complete };
    for (const key of ['mandatory', 'optional']) {
      if (!Array.isArray(budget[key]) || budget[key].length > 12) throw new Error('Máximo 12 gastos por sección');
      result.outingBudget[key] = budget[key].map(row => {
        if (!row || typeof row.label !== 'string' || !row.label.trim() || row.label.length > 100 || !money(row.amount) || row.currency !== currency || Object.keys(row).some(k => !['label', 'amount', 'currency'].includes(k))) throw new Error('Revisa el concepto, monto y moneda de los gastos');
        return { label: row.label.trim(), amount: row.amount, currency };
      });
    }
  }
  if (!Object.keys(result).length) throw new Error('No hay cambios');
  return result;
}
function budgetSummary(event) {
  const currency = event.price?.currency || 'USD';
  const entryKnown = money(event.price?.amount);
  const entry = entryKnown ? event.price.amount : null;
  const budget = event.outingBudget || {};
  const rows = key => (budget[key] || []).filter(row => money(row.amount) && row.currency === currency).map(row => ({ label: row.label, amount: row.amount, currency }));
  const mandatory = rows('mandatory'), optional = rows('optional');
  const cents = mandatory.reduce((total, row) => total + Math.round(row.amount * 100), 0);
  const consistent = mandatory.length === (budget.mandatory || []).length && optional.length === (budget.optional || []).length;
  return { currency, entry, mandatory, optional, complete: budget.complete === true && entryKnown && consistent, knownMinimum: entryKnown ? (Math.round(entry * 100) + cents) / 100 : null };
}
module.exports = { FIELDS, normalizePlanning, budgetSummary };
