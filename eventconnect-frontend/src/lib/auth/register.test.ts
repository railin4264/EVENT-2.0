import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerSchema } from './register'

const valid = { name: 'Ana', username: 'ana_23', email: 'ana@example.test', birthDate: '2000-04-15', password: 'Seguro123!', acceptTerms: true }

afterEach(() => vi.useRealTimers())

describe('simple registration', () => {
  it('accepts a single name without a surname, phone, interests or repeated password', () => {
    expect(registerSchema.parse({ ...valid, name: ' Ana ', email: ' ana@example.test ' })).toEqual(valid)
  })

  it('requires consent and preserves password and identity validation', () => {
    for (const changes of [{ acceptTerms: false }, { password: '12345678' }, { username: 'two words' }, { email: 'invalid' }, { name: '' }]) {
      expect(registerSchema.safeParse({ ...valid, ...changes }).success).toBe(false)
    }
  })

  it('rejects invalid calendar dates and future birthdays', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-16T12:00:00Z'))
    for (const birthDate of ['', '2000-02-30', '2027-01-01', 'not-a-date']) {
      expect(registerSchema.safeParse({ ...valid, birthDate }).success).toBe(false)
    }
    expect(registerSchema.safeParse({ ...valid, birthDate: '2000-02-29' }).success).toBe(true)
  })
})
