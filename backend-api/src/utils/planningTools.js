const keys = [
  'title',
  'description',
  'date',
  'time',
  'timeZone',
  'address',
  'city',
  'country',
  'currency',
  'amount',
];
function cleanDraft(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Revisa los campos del borrador.');
  const output = {};
  const lengths = {
    title: 100,
    description: 2000,
    address: 200,
    city: 100,
    country: 100,
    date: 10,
    time: 5,
    timeZone: 100,
    currency: 3,
  };
  for (const key of keys) {
    if (input[key] === undefined || input[key] === '') continue;
    if (key === 'amount') {
      if (
        typeof input[key] !== 'number' ||
        !Number.isFinite(input[key]) ||
        input[key] < 0 ||
        input[key] > 1000000 ||
        Math.abs(input[key] * 100 - Math.round(input[key] * 100)) > 1e-6
      )
        throw new Error('Monto inválido.');
      output[key] = input[key];
    } else {
      if (typeof input[key] !== 'string' || input[key].length > lengths[key])
        throw new Error(`Campo inválido: ${key}`);
      output[key] = input[key].trim();
    }
  }
  if (
    output.date &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(output.date) ||
      !Number.isFinite(Date.parse(`${output.date}T00:00:00Z`)) ||
      new Date(`${output.date}T00:00:00Z`).toISOString().slice(0, 10) !==
        output.date)
  )
    throw new Error('Fecha inválida.');
  if (output.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(output.time))
    throw new Error('Hora inválida.');
  if (output.timeZone) {
    try {
      new Intl.DateTimeFormat('es', { timeZone: output.timeZone }).format();
    } catch (_) {
      throw new Error('Zona horaria inválida.');
    }
  }
  if (
    output.currency &&
    !['DOP', 'USD', 'EUR', 'MXN'].includes(output.currency)
  )
    throw new Error('Moneda inválida.');
  return output;
}
function parseConversation(text) {
  if (typeof text !== 'string' || !text.trim() || text.length > 6000)
    throw new Error('Pega entre 1 y 6000 caracteres.');
  const fields = {},
    warnings = [
      'Revisa los datos: no se publica ni se guarda el texto pegado.',
    ];
  const lines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const labelled = (name) =>
    lines
      .find((s) => new RegExp(`^(?:${name})\\s*:`, 'i').test(s))
      ?.replace(/^[^:]+:\s*/, '');
  fields.title = (labelled('título|titulo|plan') || lines[0]).slice(0, 100);
  const dates = [...new Set(text.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [])];
  if (dates.length === 1) fields.date = dates[0];
  else warnings.push('Confirma la fecha completa (año-mes-día).');
  const time = labelled('hora');
  if (time && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)) fields.time = time;
  else warnings.push('Confirma la hora de inicio en formato de 24 horas.');
  const zone = labelled('zona horaria');
  if (zone) {
    try {
      new Intl.DateTimeFormat('es', { timeZone: zone }).format();
      fields.timeZone = zone;
    } catch (_) {
      warnings.push('Confirma una zona horaria IANA válida.');
    }
  } else
    warnings.push(
      'Selecciona la zona horaria; no se deduce de tu dispositivo.',
    );
  for (const [key, label] of [
    ['address', 'dirección|direccion|lugar'],
    ['city', 'ciudad'],
    ['country', 'país|pais'],
    ['description', 'descripción|descripcion'],
  ]) {
    const value = labelled(label);
    if (value)
      fields[key] = value.slice(
        0,
        key === 'description' ? 2000 : key === 'address' ? 200 : 100,
      );
  }
  const price = labelled('precio');
  const match = price?.match(/^(DOP|USD|EUR|MXN)\s+(\d+(?:\.\d{1,2})?)$/i);
  if (match) {
    fields.currency = match[1].toUpperCase();
    fields.amount = Number(match[2]);
  } else if (price) warnings.push('Precio ambiguo: confirma moneda y monto.');
  try {
    return { fields: cleanDraft(fields), warnings };
  } catch (_) {
    delete fields.date;
    return {
      fields: cleanDraft(fields),
      warnings: [...warnings, 'La fecha extraída no existe; corrígela.'],
    };
  }
}
function freeWindow(query, now = Date.now()) {
  const iso =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
  if (
    typeof query.from !== 'string' ||
    typeof query.until !== 'string' ||
    !iso.test(query.from) ||
    !iso.test(query.until)
  )
    throw new Error('Indica inicio y regreso con zona horaria explícita.');
  for (const value of [query.from, query.until]) {
    const day = value.slice(0, 10);
    if (
      !Number.isFinite(Date.parse(`${day}T00:00:00Z`)) ||
      new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day
    )
      throw new Error('Fecha del intervalo inválida.');
  }
  const from = Date.parse(query.from),
    until = Date.parse(query.until),
    travelMinutes =
      query.travelMinutes === undefined ? 0 : Number(query.travelMinutes);
  if (
    !Number.isFinite(from) ||
    !Number.isFinite(until) ||
    from < now ||
    until <= from ||
    until - from > 7 * 86400000 ||
    !Number.isInteger(travelMinutes) ||
    travelMinutes < 0 ||
    travelMinutes > 180
  )
    throw new Error(
      'Ventana inválida: máximo 7 días y traslado de 0 a 180 minutos por trayecto.',
    );
  if (
    query.city !== undefined &&
    (typeof query.city !== 'string' || query.city.length > 100)
  )
    throw new Error('Ciudad inválida.');
  return {
    from: new Date(from + travelMinutes * 60000),
    until: new Date(until - travelMinutes * 60000),
    travelMinutes,
    city: query.city?.trim(),
  };
}
module.exports = { cleanDraft, parseConversation, freeWindow };
