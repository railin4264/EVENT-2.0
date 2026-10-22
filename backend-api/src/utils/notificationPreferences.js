const channels = ['email', 'push', 'inApp'];
const categories = ['events', 'tribes', 'messages', 'achievements', 'marketing', 'system'];
function preferencesFor(user) {
  const saved = user.notificationSettings?.channelPreferences || {};
  return Object.fromEntries(channels.map(channel => [channel, Object.fromEntries(categories.map(category =>
    [category, saved[channel]?.[category] ?? !(channel === 'push' && category === 'system')]))]));
}
function preferenceUpdate(body) {
  const update = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Preferencias inválidas');
  for (const [channel, values] of Object.entries(body)) {
    if (!channels.includes(channel) || !values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Canal de notificación inválido');
    for (const [category, enabled] of Object.entries(values)) {
      if (!categories.includes(category) || typeof enabled !== 'boolean') throw new Error('Preferencia de notificación inválida');
      update[`notificationSettings.channelPreferences.${channel}.${category}`] = enabled;
    }
  }
  if (!Object.keys(update).length) throw new Error('Incluye al menos una preferencia');
  return update;
}
function notificationCategory(notification) {
  if (notification.type === 'message' || notification.type === 'new_message') return 'messages';
  if (notification.type?.startsWith('event_')) return 'events';
  if (notification.type?.startsWith('tribe_')) return 'tribes';
  if (notification.type?.startsWith('achievement')) return 'achievements';
  if (notification.type === 'promotion') return 'marketing';
  return notification.category || 'system';
}
function inAppNotificationFilter(user, types) {
  const preferences = preferencesFor(user).inApp;
  const canonical = user.settings?.notifications || {};
  const hidden = types.filter(type => preferences[notificationCategory({ type })] === false ||
    (type === 'event_reminder' && canonical.eventReminders === false) ||
    (type === 'message' && canonical.newMessages === false));
  return hidden.length ? { type: { $nin: hidden } } : {};
}
module.exports = { preferencesFor, preferenceUpdate, notificationCategory, inAppNotificationFilter };
