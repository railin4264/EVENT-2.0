export interface HospitalityEvent {
  title: string
  date?: string | Date
  endDate?: string | Date
  timeZone?: string
  isSecretLocation?: boolean
  isAttending?: boolean
  location?: string | { venue?: string; address?: string; city?: string; country?: string; coordinates?: number[] }
  isRecurring?: boolean
  recurringSchedule?: { frequency?: string; dayName?: string; timeText?: string }
  isCommercialDeal?: boolean
  commercialBrand?: string
  commercialOffer?: string
  isTourOrTrip?: boolean
  tourDetails?: { departurePoint?: string; includes?: string[] }
}

/** Search destinations come from published event data, never an assumed city. */
export function hospitalityPlan(event: HospitalityEvent, options: { nightsBefore?: number; nightsAfter?: number; guests?: number } = {}) {
  const guests = Math.max(1, Math.min(16, Math.trunc(options.guests || 4)))
  const nightsBefore = Math.max(0, Math.min(7, Math.trunc(options.nightsBefore || 0)))
  const nightsAfter = Math.max(1, Math.min(14, Math.trunc(options.nightsAfter || 1)))
  const location = typeof event.location === 'object' && event.location ? event.location : {}
  const destination = [location.city, location.country].filter(Boolean).join(', ')
  const reserved = Boolean(event.isSecretLocation && !event.isAttending)
  const venue = reserved ? '' : location.venue || location.address || (typeof event.location === 'string' ? event.location : '')
  const [lng, lat] = reserved ? [] : location.coordinates || []
  const validCoordinates = typeof lat === 'number' && Number.isFinite(lat) && Math.abs(lat) <= 90 &&
    typeof lng === 'number' && Number.isFinite(lng) && Math.abs(lng) <= 180
  const uber = new URL('https://m.uber.com/ul/')
  uber.searchParams.set('action', 'setPickup')
  uber.searchParams.set('pickup', 'my_location')
  if (validCoordinates) {
    uber.searchParams.set('dropoff[latitude]', String(lat))
    uber.searchParams.set('dropoff[longitude]', String(lng))
  }
  if (venue) uber.searchParams.set('dropoff[nickname]', [venue, destination].filter(Boolean).join(', '))
  const airbnb = new URL(`https://www.airbnb.com/s/${encodeURIComponent(destination)}/homes`)
  airbnb.searchParams.set('adults', String(guests))
  const booking = new URL('https://www.booking.com/searchresults.html')
  booking.searchParams.set('ss', destination)
  booking.searchParams.set('group_adults', String(guests))
  const start = event.date ? new Date(event.date) : null
  const end = event.endDate ? new Date(event.endDate) : null
  let stay = ''
  // Recurring activities need a chosen occurrence; past or invalid dates are not prefilled.
  if (!event.isRecurring && start && Number.isFinite(start.getTime()) && start.getTime() > Date.now()) {
    const localDay = (date: Date) => {
      try {
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: event.timeZone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map(p => [p.type, p.value]))
        return new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`)
      } catch { return new Date(`${date.toISOString().slice(0, 10)}T12:00:00Z`) }
    }
    const checkin = localDay(start)
    checkin.setUTCDate(checkin.getUTCDate() - nightsBefore)
    const today = localDay(new Date())
    if (checkin < today) checkin.setTime(today.getTime())
    const checkout = localDay(end && end > start ? end : start)
    checkout.setUTCDate(checkout.getUTCDate() + nightsAfter)
    const checkinText = checkin.toISOString().slice(0, 10)
    const checkoutText = checkout.toISOString().slice(0, 10)
    for (const url of [airbnb, booking]) {
      url.searchParams.set('checkin', checkinText)
      url.searchParams.set('checkout', checkoutText)
    }
    stay = `${checkinText} → ${checkoutText}`
  }
  return {
    destination, venue, reserved, stay, guests,
    uber: !reserved && (validCoordinates || venue) ? uber.toString() : null,
    airbnb: destination ? airbnb.toString() : null,
    booking: destination ? booking.toString() : null,
    trivago: destination ? `https://www.trivago.com/en-US/srl/${encodeURIComponent(destination)}` : null,
    recurrence: [event.recurringSchedule?.dayName, event.recurringSchedule?.timeText].filter(Boolean).join(' · ') || 'Consulta la próxima fecha con el organizador',
  }
}
