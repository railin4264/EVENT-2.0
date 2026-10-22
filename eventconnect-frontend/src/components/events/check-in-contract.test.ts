import { expect, it } from 'vitest'
import { checkInFailure, confirmedAdmission, isAdmissionCode } from './check-in-contract'

const code = `EC:${'a'.repeat(24)}:${'b'.repeat(24)}:${'c'.repeat(64)}`
it('accepts signed EC tickets and rejects arbitrary URLs, truncated signatures and extra fields', () => {
  expect(isAdmissionCode(` ${code} `)).toBe(true)
  for (const invalid of ['https://example.test', code.slice(0, -1), code + ':x', 'EC:anything']) expect(isAdmissionCode(invalid)).toBe(false)
})
it('requires both server success and explicit valid admission with actual group size', () => {
  expect(confirmedAdmission({ success: true, data: { valid: true, quantity: 2, orderNumber: 'ORD-1' } })).toEqual({ quantity: 2, orderNumber: 'ORD-1' })
  for (const value of [null, {}, { success: false, data: { valid: true, quantity: 1, orderNumber: 'x' } }, { success: true, data: { quantity: 1, orderNumber: 'x' } }, { success: true, data: { valid: true, quantity: 0, orderNumber: 'x' } }, { success: true, data: { valid: true, quantity: 1.5, orderNumber: 'x' } }]) expect(confirmedAdmission(value)).toBeNull()
})
it('distinguishes no connection, duplicate/conflicting tickets and unconfirmed network results', () => {
  expect(checkInFailure({}, false)).toContain('Sin conexión')
  expect(checkInFailure({ response: { status: 409 } }, true)).toContain('ya utilizada')
  expect(checkInFailure({}, true)).toContain('No se confirmó')
})
