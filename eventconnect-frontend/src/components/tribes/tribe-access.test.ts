import { describe, expect, it } from 'vitest'
import { readTribeAccess } from './tribe-access'

describe('tribe capabilities', () => {
  it('allows an active moderator to review requests without granting tribe settings administration', () => {
    const access = readTribeAccess({ privacy: 'private', members: [{ user: 'mod', status: 'active', role: 'moderator' }] }, 'mod')
    expect(access.isMember).toBe(true)
    expect(access.isAdmin).toBe(false)
    expect(access.canViewContent).toBe(true)
    expect(access.canManageRequests).toBe(true)
  })
  it('does not restore privileges to an inactive administrator', () => {
    const access = readTribeAccess({ privacy: 'private', membership: 'approval_required', members: [{ user: 'old', status: 'inactive', role: 'admin' }] }, 'old')
    expect(access.isMember).toBe(false)
    expect(access.isAdmin).toBe(false)
    expect(access.canManageRequests).toBe(false)
    expect(access.canViewContent).toBe(false)
    expect(access.canRequestJoin).toBe(true)
  })
  it('honors explicit denied server capabilities even when local member data suggests a privilege', () => {
    const access = readTribeAccess({ isMember: false, canViewContent: false, canManageRequests: false, canRequestJoin: false, members: [{ user: 'a', role: 'admin', status: 'active' }] }, 'a')
    expect(access.canViewContent).toBe(false)
    expect(access.canManageRequests).toBe(false)
    expect(access.canRequestJoin).toBe(false)
  })
  it('distinguishes pending, rejected, banned and invitation policies', () => {
    const policy = { privacy: 'private', membership: 'approval_required' }
    expect(readTribeAccess({ ...policy, joinRequestStatus: 'pending' }, 'a')).toMatchObject({ hasPendingRequest: true, canRequestJoin: false, canJoin: false })
    expect(readTribeAccess({ ...policy, joinRequestStatus: 'rejected' }, 'a')).toMatchObject({ joinRequestStatus: 'rejected', canRequestJoin: true })
    expect(readTribeAccess({ ...policy, isBanned: true, canViewContent: true, canJoin: true }, 'a')).toMatchObject({ isBanned: true, canViewContent: false, canRequestJoin: false, canJoin: false })
    expect(readTribeAccess({ ...policy, membership: 'invite_only', canRequestJoin: true, canJoin: true }, 'a')).toMatchObject({ canRequestJoin: false, canJoin: false })
    expect(readTribeAccess({ ...policy, privacy: 'secret', canJoin: true }, 'a').canJoin).toBe(false)
  })
  it('never offers joining to a guest and keeps public approval separate from content privacy', () => {
    expect(readTribeAccess({ privacy: 'public', membership: 'approval_required' }, '')).toMatchObject({ canViewContent: true, canJoin: false, canRequestJoin: false })
    expect(readTribeAccess({ privacy: 'public', membership: 'approval_required' }, 'a')).toMatchObject({ canViewContent: true, canJoin: false, canRequestJoin: true })
  })
})
