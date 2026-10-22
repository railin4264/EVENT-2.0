import { describe, expect, it } from 'vitest'
import { eventSectionPlan } from './event-section-plan'

const santoDomingo: [number, number] = [-69.93, 18.48]

describe('eventSectionPlan', () => {
  it('gives a virtual event its stream and time zones, never transport, weather or stays', () => {
    const plan = eventSectionPlan({ phase: 'upcoming', category: 'technology', isVirtual: true, coordinates: [0, 20] })
    expect(plan).toMatchObject({ virtualStage: true, timezoneClock: true, hospitality: false, weather: false, navigation: false, tripBudget: false, companions: false })
  })

  it('keeps both sides for a hybrid event', () => {
    const plan = eventSectionPlan({ phase: 'upcoming', category: 'music', eventType: 'hybrid', isVirtual: true, coordinates: santoDomingo })
    expect(plan).toMatchObject({ virtualStage: true, navigation: true, weather: true, songVoting: true })
  })

  it('offers song requests only for musical nights', () => {
    expect(eventSectionPlan({ phase: 'upcoming', category: 'nightlife', coordinates: santoDomingo })).toMatchObject({ songVoting: true })
    expect(eventSectionPlan({ phase: 'upcoming', category: 'business', coordinates: santoDomingo })).toMatchObject({ songVoting: false })
  })

  it('hides song requests on imported listings with no organizer to read them', () => {
    expect(eventSectionPlan({ phase: 'upcoming', category: 'music', coordinates: santoDomingo, imported: true }).songVoting).toBe(false)
  })

  it('drops planning tools after the event and opens the conversation while it is live', () => {
    expect(eventSectionPlan({ phase: 'ended', category: 'music', coordinates: santoDomingo })).toMatchObject({ hospitality: false, navigation: false, calendar: false, songVoting: false, conversationOpen: false })
    expect(eventSectionPlan({ phase: 'live', category: 'music', coordinates: santoDomingo })).toMatchObject({ navigation: true, calendar: false, conversationOpen: true })
  })

  it('shows Dominican emergency contacts only for located events in the Dominican Republic', () => {
    expect(eventSectionPlan({ phase: 'upcoming', countryCode: 'DO', coordinates: santoDomingo }).transitDominicanRepublic).toBe(true)
    expect(eventSectionPlan({ phase: 'upcoming', countryCode: 'MX', coordinates: [-99.13, 19.43] }).transitDominicanRepublic).toBe(false)
    expect(eventSectionPlan({ phase: 'upcoming', countryCode: 'DO' }).transitDominicanRepublic).toBe(false)
  })
})
