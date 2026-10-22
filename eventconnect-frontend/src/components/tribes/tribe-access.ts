export interface TribeAccess {
  isMember: boolean
  isAdmin: boolean
  isBanned: boolean
  canViewContent: boolean
  canManageRequests: boolean
  canRequestJoin: boolean
  canJoin: boolean
  hasPendingRequest: boolean
  joinRequestStatus: 'member' | 'pending' | 'rejected' | 'approved' | 'banned' | 'none'
  membership: 'open' | 'approval_required' | 'invite_only'
  privacy: 'public' | 'private' | 'secret'
}

/** Server capability flags take precedence, including explicit false values. */
export function readTribeAccess(input: any, userId: string): TribeAccess {
  const raw = input || {}
  const privacy = raw.privacy || raw.settings?.privacy || (raw.isPrivate ? 'private' : 'public')
  const membership = raw.membership || raw.settings?.membership || (raw.requiresApproval || privacy !== 'public' ? 'approval_required' : 'open')
  const members = Array.isArray(raw.members) ? raw.members : []
  const ownMember = userId ? members.find((member: any) => String(member?.user?._id || member?.user || '') === userId) : undefined
  const active = ownMember?.status === 'active'
  const creator = Boolean(userId && String(raw.createdBy?._id || raw.createdBy || raw.creator?._id || raw.creator || '') === userId)
  const isBanned = raw.isBanned === true || ownMember?.status === 'banned'
  const isMember = !isBanned && Boolean(userId && (typeof raw.isMember === 'boolean' ? raw.isMember : active || creator))
  const isAdmin = !isBanned && Boolean(userId && (typeof raw.isAdmin === 'boolean' ? raw.isAdmin : creator || (active && ownMember?.role === 'admin')))
  const pending = Boolean(userId && (raw.hasPendingRequest === true || raw.joinRequestStatus === 'pending'))
  const status = isBanned ? 'banned' : isMember ? 'member' : pending ? 'pending' : ['rejected', 'approved'].includes(raw.joinRequestStatus) ? raw.joinRequestStatus : 'none'
  const inviteOnly = membership === 'invite_only' || privacy === 'secret'
  const eligible = Boolean(userId && !isMember && !isBanned && !pending && !inviteOnly)
  const capability = (key: string, fallback: boolean) => typeof raw[key] === 'boolean' ? raw[key] : fallback
  return {
    isMember, isAdmin, isBanned,
    canViewContent: !isBanned && capability('canViewContent', privacy === 'public' || isMember || isAdmin),
    canManageRequests: Boolean(userId && !isBanned && capability('canManageRequests', creator || (active && ['admin', 'moderator'].includes(ownMember?.role)))),
    canJoin: eligible && capability('canJoin', membership === 'open'),
    canRequestJoin: eligible && capability('canRequestJoin', membership === 'approval_required'),
    hasPendingRequest: pending && !isBanned,
    joinRequestStatus: status,
    membership, privacy,
  }
}
