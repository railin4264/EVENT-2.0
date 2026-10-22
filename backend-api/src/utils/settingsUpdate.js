const fields = {
  notifications: ['email', 'push', 'eventReminders', 'newMessages', 'weeklyDigest', 'friendPlans', 'shareAttendance'],
  privacy: ['showProfile', 'showAttendedEvents', 'showLocation'],
  preferences: ['theme', 'language', 'timezone', 'contentFilterMode', 'preferredCategories', 'hiddenCategories', 'hidePolitical', 'hideReligious', 'hideAdultOnly']
};
const booleans = new Set([...fields.notifications, ...fields.privacy, 'hidePolitical', 'hideReligious', 'hideAdultOnly']);
const arrays = new Set(['preferredCategories', 'hiddenCategories']);

function settingsUpdate(body) {
  const update = {};
  for (const [section, names] of Object.entries(fields)) {
    if (body[section] === undefined) continue;
    const values = body[section];
    if (!values || typeof values !== 'object' || Array.isArray(values)) throw Object.assign(new Error(`Configuración ${section} inválida`), { status: 400 });
    for (const name of names) {
      if (!Object.prototype.hasOwnProperty.call(values, name)) continue;
      const value = values[name];
      const valid = booleans.has(name) ? typeof value === 'boolean'
        : arrays.has(name) ? Array.isArray(value) && value.length <= 50 && value.every(v => typeof v === 'string' && v.length <= 100)
          : typeof value === 'string' && value.length > 0 && value.length <= 100;
      if (!valid) throw Object.assign(new Error(`Revisa la preferencia ${name}`), { status: 400 });
      update[`settings.${section}.${name}`] = value;
      if (section === 'notifications' && (name === 'email' || name === 'push')) update[`notificationSettings.${name}Enabled`] = value;
    }
  }
  return update;
}
module.exports = { settingsUpdate };
