import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Escribe tu nombre').max(50, 'Máximo 50 caracteres'),
  username: z.string().trim().min(3, 'Mínimo 3 caracteres').max(30, 'Máximo 30 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Usa letras, números o guiones bajos'),
  email: z.string().trim().email('Escribe un correo válido'),
  birthDate: z.string().refine(value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const date = new Date(`${value}T00:00:00`)
    const [year, month, day] = value.split('-').map(Number)
    return date.getFullYear() === year && date.getMonth() === month - 1 &&
      date.getDate() === day && date.getTime() < Date.now()
  }, 'Escribe una fecha de nacimiento válida en el pasado'),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(128, 'Máximo 128 caracteres')
    .regex(/[a-z]/, 'Añade una minúscula')
    .regex(/[A-Z]/, 'Añade una mayúscula')
    .regex(/\d/, 'Añade un número')
    .regex(/[@$!%*?&]/, 'Añade un símbolo: @$!%*?&'),
  countryCode: z.string().default('DO').optional(),
  country: z.string().default('República Dominicana').optional(),
  gender: z.enum(['female', 'male', 'non_binary', 'other', 'prefer_not_to_say']).default('prefer_not_to_say').optional(),
  interests: z.array(z.string()).default([]).optional(),
  acceptTerms: z.boolean().refine(value => value, 'Debes aceptar los términos y la privacidad'),
})

export type RegisterFormData = z.infer<typeof registerSchema>
