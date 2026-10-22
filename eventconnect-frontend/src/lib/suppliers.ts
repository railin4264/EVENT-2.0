export interface DirectorySupplier {
  id: string; name: string; category: string; description: string; city: string; price: string
  rating: number | null; reviews: number; verified: boolean; services: string[]; contactUrl: string | null
}
const string = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const number = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
export function directorySupplier(value: any): DirectorySupplier | null {
  if (!value || !string(value._id || value.id) || !string(value.name)) return null
  const rawPhone = string(value.whatsapp || value.contact?.whatsapp || value.phone || value.contact?.phone)
  let phone = rawPhone.replace(/\D/g, '')
  if (rawPhone.startsWith('00')) phone = phone.slice(2)
  if (phone.length === 10 && /^(809|829|849)/.test(phone)) phone = '1' + phone
  const email = string(value.email || value.contact?.email)
  const contactUrl = /^\d{8,15}$/.test(phone) ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hola ${value.name}. Vi tus servicios en EventNow y quisiera una cotización para un evento.`)}` : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${encodeURIComponent(email)}` : null
  const amount = number(value.pricing?.startingPrice ?? value.startingPriceDOP)
  let price = string(value.priceRange) || 'A cotizar'
  if (!string(value.priceRange) && amount !== null && amount > 0) {
    const currency = string(value.pricing?.currency) || 'DOP'
    try { price = 'Desde ' + new Intl.NumberFormat('es-DO', { style: 'currency', currency }).format(amount) } catch { price = 'A cotizar' }
  }
  const rating = number(typeof value.rating === 'object' ? value.rating?.average : value.rating)
  return { id: value._id || value.id, name: string(value.name), category: string(value.category), description: string(value.description), city: string(value.city || value.location?.city) || 'Ubicación por confirmar', price,
    rating: rating !== null && rating <= 5 ? rating : null, reviews: Math.floor(number(value.reviewsCount ?? value.rating?.count) || 0), verified: value.isVerified === true || value.verified === true,
    services: (Array.isArray(value.services) ? value.services : Array.isArray(value.tags) ? value.tags : []).filter((s: unknown): s is string => typeof s === 'string'), contactUrl }
}
