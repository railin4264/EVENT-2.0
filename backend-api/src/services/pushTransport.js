const firebase = require('../config/firebase');
const isExpoToken = token => /^(ExponentPushToken|ExpoPushToken)\[[a-zA-Z0-9_-]+\]$/.test(token);
const stringData = data => Object.fromEntries(Object.entries(data || {}).filter(([, value]) => value !== undefined && value !== null)
  .map(([key, value]) => [key, typeof value === 'string' ? value : value?._bsontype === 'ObjectId' ? value.toHexString() : value instanceof Date ? value.toISOString() : JSON.stringify(value)]));

// Provider acceptance is distinct from delivery to, or reading on, a device.
async function sendPush(tokens, payload, { fetchImpl = global.fetch, firebaseService = firebase } = {}) {
  const unique = [...new Set(tokens)].filter(token => typeof token === 'string' && token.length <= 4096);
  const expo = unique.filter(isExpoToken), fcm = unique.filter(token => !isExpoToken(token));
  const result = { success: false, successCount: 0, tokensToRemove: [], receipts: [] };
  if (fcm.length) {
    const sent = await firebaseService.sendToDevices(fcm, { title: payload.title, body: payload.body }, stringData(payload.data));
    result.successCount += sent.successCount || 0;
    result.tokensToRemove.push(...(sent.tokensToRemove || []));
  }
  if (expo.length) {
    const response = await fetchImpl('https://exp.host/--/api/v2/push/send', {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json', ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) },
      body: JSON.stringify(expo.map(to => ({ to, title: payload.title, body: payload.body, data: payload.data,
        sound: 'default', badge: payload.badge, channelId: 'eventconnect_general' })))
    });
    if (response.ok) {
      const body = await response.json();
      const tickets = Array.isArray(body.data) ? body.data : body.data ? [body.data] : [];
      tickets.forEach((ticket, index) => {
        if (ticket.status === 'ok' && typeof ticket.id === 'string') {
          result.successCount++;
          result.receipts.push({ ticketId: ticket.id, token: expo[index] });
        } else if (ticket.details?.error === 'DeviceNotRegistered') result.tokensToRemove.push(expo[index]);
      });
    }
  }
  result.success = result.successCount > 0;
  return result;
}
module.exports = { isExpoToken, stringData, sendPush };
