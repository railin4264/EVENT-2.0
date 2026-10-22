function confirmedRegistrations(attendees = []) {
  return new Set(attendees.filter(a => ['attending', 'confirmed'].includes(a.status) && a.user)
    .map(a => String(a.user._id || a.user))).size;
}

/** Give other organizers space before filling remaining slots with repeated hosts. */
function diversifyRecommendations(candidates, limit) {
  const sorted = [...candidates].sort((a, b) => b.score - a.score ||
    new Date(a.ev.date) - new Date(b.ev.date) || String(a.ev._id).localeCompare(String(b.ev._id)));
  const chosen = [], deferred = [], perOrganizer = new Map();
  for (const item of sorted) {
    const owner = String(item.ev.createdBy?._id || item.ev.createdBy || item.ev._id);
    const count = perOrganizer.get(owner) || 0;
    if (count >= 2) deferred.push(item);
    else { chosen.push(item); perOrganizer.set(owner, count + 1); }
  }
  return [...chosen, ...deferred].slice(0, limit);
}

module.exports = { confirmedRegistrations, diversifyRecommendations };
