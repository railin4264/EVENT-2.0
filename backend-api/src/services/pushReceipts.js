const PushReceipt = require('../models/PushReceipt');
const User = require('../models/User');
async function checkPushReceipts({ fetchImpl = global.fetch } = {}) {
  const records = await PushReceipt.find({ status: 'pending', checkAt: { $lte: new Date() } }).select('+token').limit(100).lean();
  if (!records.length) return 0;
  const response = await fetchImpl('https://exp.host/--/api/v2/push/getReceipts', {
    method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/json', ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) },
    body: JSON.stringify({ ids: records.map(record => record.ticketId) })
  });
  if (!response.ok) throw new Error('Push receipt provider unavailable');
  const { data = {} } = await response.json();
  for (const record of records) {
    const receipt = data[record.ticketId];
    const status = receipt?.status === 'ok' ? 'delivered_to_provider' : receipt?.status === 'error' ? 'failed'
      : Date.now() - new Date(record.createdAt).getTime() > 24 * 3600000 ? 'unknown' : 'pending';
    await PushReceipt.updateOne({ _id: record._id, status: 'pending' }, { $set: { status, checkAt: new Date(Date.now() + 900000) } });
    if (receipt?.details?.error === 'DeviceNotRegistered') await User.updateOne({ _id: record.recipient }, { $pull: { pushTokens: { token: record.token } } });
  }
  return records.length;
}
module.exports = { checkPushReceipts };
