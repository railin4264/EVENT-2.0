import { describe, expect, it } from 'vitest'
import { buildProfileUpdate, normalizeProfile, safeSocialUrl, validateProfileImage } from './profile-utils'

describe('profile API contract', () => {
  it('accepts MongoDB ids and missing public profile fields', () => {
    const profile = normalizeProfile({ _id: 'user-1', firstName: 'Ana' })
    expect(profile.id).toBe('user-1')
    expect(profile.interests).toEqual([])
    expect(profile.socialLinks).toEqual({})
    expect(profile.email).toBeUndefined()
  })
  it('does not send hidden metadata or unchanged optional phone fields', () => {
    const original = normalizeProfile({ id: 'user-1', phone: '', bio: 'Antes' })
    expect(buildProfileUpdate(original, { ...original, bio: ' Ahora ', email: 'ignored@example.com' })).toEqual({ bio: 'Ahora' })
  })
  it('preserves geospatial coordinates when changing the location label', () => {
    const original = normalizeProfile({ id: 'user-1', location: { type: 'Point', coordinates: [-69, 18], address: 'Antes' } })
    expect(buildProfileUpdate(original, { ...original, location: { ...original.location!, address: 'Ahora' } })).toEqual({ location: { type: 'Point', coordinates: [-69, 18], address: 'Ahora' } })
  })
  it('rejects empty names and oversized biographies', () => {
    const original = normalizeProfile({ id: 'user-1', firstName: 'Ana' })
    expect(() => buildProfileUpdate(original, { firstName: ' ' })).toThrow('nombre')
    expect(() => buildProfileUpdate(original, { bio: 'x'.repeat(501) })).toThrow('500')
  })
  it('rejects unsupported images and files over the server limit', () => {
    expect(validateProfileImage({ type: 'image/svg+xml', size: 10 })).toBeTruthy()
    expect(validateProfileImage({ type: 'image/png', size: 10 * 1024 * 1024 + 1 })).toBeTruthy()
    expect(validateProfileImage({ type: 'image/jpeg', size: 1024 })).toBeNull()
  })
  it('only opens http links and accepts protocol-free websites', () => {
    expect(safeSocialUrl('example.com')).toBe('https://example.com/')
    expect(safeSocialUrl('javascript:alert(1)')).toBeNull()
    expect(safeSocialUrl('data:text/html,x')).toBeNull()
  })
})
