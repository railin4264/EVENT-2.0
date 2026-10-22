import type { EventPhase } from './event-phase'

export interface EventSectionPlanInput {
  phase: EventPhase
  category?: string
  isVirtual?: boolean
  eventType?: 'in_person' | 'virtual' | 'hybrid'
  countryCode?: string
  coordinates?: unknown
  imported?: boolean
}

export interface EventSectionPlan {
  online: boolean
  inPerson: boolean
  virtualStage: boolean
  timezoneClock: boolean
  hospitality: boolean
  weather: boolean
  navigation: boolean
  calendar: boolean
  transitDominicanRepublic: boolean
  tripBudget: boolean
  soloTraveler: boolean
  companions: boolean
  songVoting: boolean
  conversationOpen: boolean
}

// Categories where requesting songs to the organizer makes sense.
const MUSICAL_CATEGORIES = new Set(['music', 'nightlife', 'party', 'dance'])

function hasMapPoint(value: unknown) {
  return Array.isArray(value) && value.length === 2 && value.every(n => typeof n === 'number' && Number.isFinite(n)) &&
    !(value[0] === 0 && value[1] === 0)
}

/**
 * Decide which detail sections fit an event. A virtual event gets the stream and
 * time zones instead of transport, weather and stays; song requests only appear for
 * musical nights; planning tools disappear once the event is over.
 * Imported listings have no organizer on EventNow to read song requests.
 */
export function eventSectionPlan(input: EventSectionPlanInput): EventSectionPlan {
  const online = input.eventType === 'virtual' || input.eventType === 'hybrid' || Boolean(input.isVirtual)
  const inPerson = input.eventType === 'hybrid' || !online
  const upcoming = input.phase === 'upcoming'
  const active = upcoming || input.phase === 'live'
  const located = inPerson && hasMapPoint(input.coordinates)
  const musical = MUSICAL_CATEGORIES.has(String(input.category || '').toLowerCase())

  return {
    online,
    inPerson,
    virtualStage: online && input.phase !== 'cancelled',
    timezoneClock: online && active,
    hospitality: inPerson && upcoming,
    weather: located && active,
    navigation: located && active,
    calendar: upcoming,
    transitDominicanRepublic: located && active && input.countryCode === 'DO',
    tripBudget: inPerson && upcoming,
    soloTraveler: inPerson && upcoming,
    companions: inPerson && active,
    songVoting: musical && active && !input.imported,
    conversationOpen: input.phase === 'live'
  }
}
