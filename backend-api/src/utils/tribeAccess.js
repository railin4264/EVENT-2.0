function getIdString(value) {
  if (!value) return '';
  return String(value._id || value);
}

// Membership status is authoritative. Creator and platform administration are
// explicit exceptions, rather than stale roles left on inactive memberships.
function getTribeAccess(tribe, userId, role) {
  const id = getIdString(userId);
  const members = Array.isArray(tribe.members) ? tribe.members : [];
  const isCreator = Boolean(id && id === getIdString(tribe.creator));
  const isPlatformAdmin = Boolean(id && role === 'admin');
  const exception = isCreator || isPlatformAdmin;
  const entries = id ? members.filter(member => getIdString(member.user) === id) : [];
  const isBanned = !exception && entries.some(member => member.status === 'banned');
  const activeMember = !isBanned && entries.find(member => !member.status || member.status === 'active');
  const isMember = Boolean(exception || activeMember);
  const isAdmin = Boolean(exception || (activeMember && activeMember.role === 'admin'));
  const isModerator = Boolean(isAdmin || (activeMember && activeMember.role === 'moderator'));
  const privacy = tribe.settings?.privacy || 'public';
  const membership = tribe.settings?.membership || (privacy === 'private' ? 'approval_required' : 'open');
  const inviteOnly = privacy === 'secret' || membership === 'invite_only';
  const requiresApproval = privacy === 'private' || membership === 'approval_required';
  const isPrivate = privacy !== 'public' || membership !== 'open';
  const available = tribe.isActive !== false;
  const joinRequest = id ? (tribe.joinRequests || []).find(request => getIdString(request.user) === id) : null;
  const hasPendingRequest = Boolean(id && !isMember && !isBanned && joinRequest?.status === 'pending');
  return {
    isCreator, isPlatformAdmin, isMember, isAdmin, isModerator, isBanned,
    privacy, membership, isPrivate, requiresApproval,
    userRole: isAdmin ? 'admin' : isModerator ? 'moderator' : isMember ? 'member' : null,
    hasPendingRequest,
    joinRequestStatus: isBanned ? 'banned' : isMember ? 'member' : joinRequest?.status || 'none',
    canDiscover: available && (privacy !== 'secret' || isMember),
    canViewContent: available && !isBanned && (isMember || !isPrivate),
    canManageRequests: available && isModerator,
    canRequestJoin: Boolean(available && id && !isMember && !isBanned && !inviteOnly && requiresApproval),
    canJoin: Boolean(available && id && !isMember && !isBanned && !inviteOnly && !requiresApproval)
  };
}

function tribeError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

// Compare-and-swap only membership fields. Concurrent requests/decisions retry
// from the latest document and never replace posts, stories or tribe settings.
async function mutateTribeMembership(Tribe, id, change) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const tribe = await Tribe.findById(id);
    if (!tribe) throw tribeError(404, 'Tribu no encontrada');
    const result = change(tribe);
    if (!result.changed) return result;
    const updated = await Tribe.updateOne({ _id: tribe._id, __v: tribe.__v }, {
      $set: { members: tribe.members.toObject(), joinRequests: tribe.joinRequests.toObject() },
      $inc: { __v: 1 }
    }, { runValidators: true });
    if (updated.modifiedCount === 1) return result;
  }
  throw tribeError(409, 'La tribu cambió mientras procesábamos la solicitud. Inténtalo de nuevo.');
}

module.exports = { getIdString, getTribeAccess, tribeError, mutateTribeMembership };
