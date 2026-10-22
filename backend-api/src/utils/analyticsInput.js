const crypto = require('crypto');
const sensitive = /password|secret|token|authorization|cookie|email|phone|firstName|lastName|address|coordinates|latitude|longitude|message|body|^name$|^location$/i;
function safeUrl(value) {
  try {
    const url = new URL(value, 'https://redacted.invalid');
    return url.pathname.replace(/\/[a-f0-9]{32,}/gi, '/[private]').slice(0, 300);
  } catch { return ''; }
}
function safeProperties(value, depth = 0) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || depth > 2) return {};
  const result = {};
  for (const [key, item] of Object.entries(value).slice(0, 30)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,59}$/.test(key) || sensitive.test(key)) continue;
    if (/url|referrer|pathname/i.test(key)) result[key] = safeUrl(String(item));
    else if (typeof item === 'string') result[key] = item.slice(0, 300);
    else if (typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item))) result[key] = item;
    else if (Array.isArray(item)) result[key] = item.slice(0, 20).filter(v => typeof v === 'string' || typeof v === 'number').map(v => typeof v === 'string' ? v.slice(0, 100) : v);
    else if (item && typeof item === 'object') result[key] = safeProperties(item, depth + 1);
  }
  return result;
}
function analyticsInput(events, userId, now = Date.now()) {
  if (!Array.isArray(events) || events.length < 1 || events.length > 50) throw new Error('Envía entre 1 y 50 eventos');
  return events.map(event => {
    if (!event || typeof event.name !== 'string' || !/^[a-z][a-z0-9_]{0,79}$/i.test(event.name)) throw new Error('Nombre de evento inválido');
    if (Buffer.byteLength(JSON.stringify(event)) > 12000) throw new Error('Evento demasiado grande');
    const timestamp = event.timestamp === undefined ? new Date(now) : new Date(event.timestamp);
    if (!Number.isFinite(timestamp.getTime()) || timestamp.getTime() < now - 7 * 86400000 || timestamp.getTime() > now + 300000) throw new Error('Fecha de evento inválida');
    const properties = safeProperties(event.properties);
    const eventId = typeof event.eventId === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(event.eventId) ? event.eventId : crypto.randomUUID();
    return { eventId, name: event.name, userId: userId || null, timestamp,
      sessionId: typeof event.sessionId === 'string' ? event.sessionId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100) : null,
      properties: { ...properties, source: ['web', 'ios', 'android'].includes(event.platform) ? event.platform : 'web', serverTimestamp: new Date(now), serverVerified: false },
      url: properties.url || '', referrer: properties.referrer || '' };
  });
}
module.exports = { analyticsInput, safeProperties, safeUrl };
