import { explicitEventInstant } from '@/lib/event-time-zone'
import { z } from 'zod'
import { COUNTRY_CODES, countryName } from './country-catalog'

export function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function localDateInput(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function eventSchedule(data: { date?: string; time?: string; endTime?: string; timeZone?: string }, now = new Date()) {
  const zone = data.timeZone || deviceTimeZone()
  const start = new Date(explicitEventInstant(data.date || '', data.time || '', zone))
  if (start <= now) throw new Error('El inicio del evento debe ser una fecha y hora válidas en el futuro')
  const limit = new Date(now)
  limit.setFullYear(limit.getFullYear() + 2)
  if (start > limit) throw new Error('La fecha no puede superar dos años en el futuro')
  let end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  if (data.endTime) {
    try { end = new Date(explicitEventInstant(data.date || '', data.endTime, zone)) }
    catch (error) { throw new Error(`Revisa la hora final: ${(error as Error).message}`) }
    if (end <= start) {
      const day = new Date(`${data.date}T12:00:00Z`)
      day.setUTCDate(day.getUTCDate() + 1)
      try { end = new Date(explicitEventInstant(day.toISOString().slice(0, 10), data.endTime, zone)) }
      catch (error) { throw new Error(`Revisa la hora final: ${(error as Error).message}`) }
    }
  }
  return { date: start.toISOString(), endDate: end.toISOString() }
}

export const eventSchema = z.object({
  title: z.string().trim().min(5, 'El título debe tener al menos 5 caracteres').max(100, 'Máximo 100 caracteres')
    .regex(/^[a-zA-Z0-9\s\u00C0-\u017F\u0400-\u04FF.,!?'()\-:;&"/@#$%*+=[\]{}|~`<>]+$/, 'Usa letras, números y puntuación; evita emojis en el título'),
  description: z.string().trim().min(10, 'Describe el evento con al menos 10 caracteres').max(2000, 'Máximo 2000 caracteres'),
  category: z.enum(['technology', 'music', 'art', 'dance', 'outdoors', 'sports', 'wellness', 'food', 'workshop', 'education', 'literature', 'gaming', 'film', 'photography', 'culture', 'community', 'family', 'networking', 'nightlife', 'entertainment', 'business', 'health', 'party', 'social', 'other', 'religion', 'politics', 'charity', 'science']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Selecciona una fecha válida'),
  timeZone: z.string().optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Selecciona una hora válida'),
  endTime: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, 'Selecciona una hora válida').optional(),
  location: z.object({
    address: z.string().trim().max(200, 'Máximo 200 caracteres'),
    venue: z.string().trim().max(100, 'Máximo 100 caracteres').optional(),
    city: z.string().trim().max(100, 'Máximo 100 caracteres').optional(),
    country: z.string().trim().max(100, 'Máximo 100 caracteres').optional(),
    countryCode: z.string().optional().refine(value => !value || COUNTRY_CODES.includes(value), 'Selecciona un país válido'),
    coordinates: z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)]).optional(),
  }),
  price: z.object({
    amount: z.number().finite().min(0, 'El precio no puede ser negativo').max(1000000, 'Precio máximo: 1000000')
      .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, 'Usa como máximo dos decimales'),
    currency: z.enum(['DOP', 'MXN', 'USD', 'EUR']),
  }),
  maxAttendees: z.number().int('La capacidad debe ser un número entero').min(1, 'Debe permitir al menos 1 asistente').max(10000, 'Máximo 10000 asistentes'),
  isPrivate: z.boolean(),
  isUnofficial: z.boolean().default(false),
  isSecretLocation: z.boolean().default(false),
  ticketUrl: z.string().trim().max(500).optional(),
  activityType: z.string().trim().max(60).optional(),
  sourceIdeaId: z.string().optional(),
  tags: z.array(z.string().max(30).regex(/^[a-zA-Z0-9\u00C0-\u017F_-]+$/, 'Usa letras, números, guiones o guiones bajos')).max(10),
  ageRestriction: z.object({
    minAge: z.number().int().min(0).max(120).default(0),
    maxAge: z.number().int().min(0).max(120).optional(),
    isAdultOnly: z.boolean().default(false),
  }).optional(),
  isVirtual: z.boolean().default(false),
  virtualLink: z.string().trim().max(500).optional(),
  accessibility: z.array(z.string()).default([]),
}).superRefine((data, ctx) => {
  try { eventSchedule(data) } catch (error) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['time'], message: (error as Error).message })
  }
  if (data.isVirtual) {
    try {
      const url = new URL(data.virtualLink || '')
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error()
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['virtualLink'], message: 'Agrega un enlace de reunión HTTP o HTTPS válido' })
    }
  } else {
    if (!data.location.countryCode) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['location', 'countryCode'], message: 'Selecciona el país del evento' })
    if (!data.location.city) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['location', 'city'], message: 'Escribe la ciudad del evento' })
    if (data.location.address.length < 5) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['location', 'address'], message: 'Escribe la dirección completa (mínimo 5 caracteres)' })
    if (!data.location.coordinates) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['location', 'coordinates'], message: 'Selecciona un resultado o indica la latitud y longitud reales' })
  }
  const age = data.ageRestriction
  if (age?.maxAge !== undefined && age.maxAge < (age.isAdultOnly ? Math.max(18, age.minAge) : age.minAge)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ageRestriction', 'maxAge'], message: 'La edad máxima debe ser igual o mayor que la mínima' })
  }
})

export type EventFormData = z.infer<typeof eventSchema>

export function createEventPayload(data: EventFormData, images: { url: string; publicId?: string }[] = []) {
  const age = data.ageRestriction
  const timeZone = data.timeZone || deviceTimeZone()
  const metadata = { city: data.location.city?.trim() || undefined, countryCode: data.location.countryCode || undefined,
    country: data.location.countryCode ? countryName(data.location.countryCode) : undefined }
  return {
    ...data,
    ...eventSchedule(data),
    time: undefined,
    endTime: undefined,
    timeZone,
    location: data.isVirtual ? undefined : { ...data.location, ...metadata, type: 'Point' as const },
    virtualLink: data.isVirtual ? data.virtualLink : undefined,
    ticketUrl: data.ticketUrl && /^https?:\/\//i.test(data.ticketUrl) ? data.ticketUrl : undefined,
    activityType: data.activityType || undefined,
    sourceIdeaId: data.sourceIdeaId || undefined,
    ageRestriction: age ? { ...age, minAge: age.isAdultOnly ? Math.max(18, age.minAge) : age.minAge } : undefined,
    images,
  }
}
