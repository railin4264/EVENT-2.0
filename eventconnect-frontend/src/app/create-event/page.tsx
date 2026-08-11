import { redirect } from 'next/navigation'

// The home CTA and empty-state link to /create-event, but the actual
// create-event form lives at /events/create. Redirect to keep both working.
export default function CreateEventRedirect() {
  redirect('/events/create')
}
