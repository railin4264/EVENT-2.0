const PROFILE_FIELDS = '_id username firstName avatar isPrivate isActive settings.privacy.showProfile settings.privacy.showAttendedEvents';

function publicProfile(user) {
  return Boolean(user && typeof user === 'object' && user._id && user.isActive === true
    && user.isPrivate !== true && user.settings?.privacy?.showProfile === true
    && user.settings?.privacy?.showAttendedEvents === true);
}

// Never infer physical presence from an RSVP. The count includes unique confirmations only.
function summarizeAttendance(attendees = [], limit = 12) {
  const confirmed = new Map();
  for (const entry of attendees) {
    const id = entry?.user?._id || entry?.user;
    if (id && ['attending', 'confirmed'].includes(entry.status)) confirmed.set(String(id), entry);
  }
  const visibleAttendees = [...confirmed.values()].filter(entry => publicProfile(entry.user))
    .slice(0, limit).map(({ user }) => ({ id: String(user._id), firstName: user.firstName || '',
      username: user.username || '', avatar: typeof user.avatar === 'string' ? user.avatar : '' }));
  return { confirmedCount: confirmed.size, visibleAttendees, hiddenCount: confirmed.size - visibleAttendees.length };
}

function safeAttendanceEntries(attendees = [], viewerId) {
  return attendees.map(entry => {
    const record = typeof entry.toObject === 'function' ? entry.toObject() : entry;
    const user = record.user;
    const own = viewerId && String(user?._id || user) === String(viewerId);
    const visible = ['attending', 'confirmed'].includes(record.status) && publicProfile(user);
    // A viewer may still inspect their own RSVP; no privacy configuration travels to the client.
    return { status: record.status, ...(own ? { isSolo: record.isSolo } : {}), user: own || visible
      ? { _id: user._id, username: user.username, firstName: user.firstName, avatar: user.avatar }
      : null };
  });
}

module.exports = { PROFILE_FIELDS, publicProfile, summarizeAttendance, safeAttendanceEntries };
