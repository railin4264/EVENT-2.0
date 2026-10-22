import { describe, expect, it } from 'vitest'
import { directorySupplier } from './suppliers'
describe('supplier API contracts', () => {
  it('reads the actual flat supplier schema without crashing or duplicating the country prefix', () => {
    const value = directorySupplier({ _id: 'a', name: 'Sonido del Caribe', category: 'dj_sound', city: 'Santiago', whatsapp: '+1 809 555 0100', rating: 4.8, reviewsCount: 12, priceRange: 'Desde RD$ 5000', services: ['Sonido'], isVerified: true })!
    expect(value.city).toBe('Santiago'); expect(value.rating).toBe(4.8); expect(value.contactUrl).toContain('wa.me/18095550100?'); expect(value.price).toBe('Desde RD$ 5000')
  })
  it('accepts nested legacy contacts and preserves foreign currency', () => {
    const value = directorySupplier({ id: 'b', name: 'Cámara Madrid', contact: { whatsapp: '+34 612 345 678' }, location: { city: 'Madrid' }, pricing: { startingPrice: 150, currency: 'EUR' }, rating: { average: 4.5, count: 8 }, tags: ['Fotografía'] })!
    expect(value.contactUrl).toContain('wa.me/34612345678?'); expect(value.price).toContain('150'); expect(value.rating).toBe(4.5)
  })
  it('keeps missing or malformed optional data unknown and does not invent a contact', () => {
    const value = directorySupplier({ _id: 'c', name: 'Nuevo equipo', rating: {}, services: [null, 3], contact: {} })!
    expect(value.rating).toBeNull(); expect(value.contactUrl).toBeNull(); expect(value.services).toEqual([]); expect(value.price).toBe('A cotizar'); expect(value.verified).toBe(false)
    expect(directorySupplier(null)).toBeNull()
  })
})
