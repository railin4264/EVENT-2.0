export function isAdmissionCode(value: string): boolean {
  return /^EC:[a-f0-9]{24}:[a-f0-9]{24}:[a-f0-9]{64}$/i.test(value.trim())
}

export interface Admission { quantity: number; orderNumber: string }

export function confirmedAdmission(value: unknown): Admission | null {
  const result = value as { success?: boolean; data?: { valid?: boolean; quantity?: number; orderNumber?: string } } | null
  const data = result?.data
  if (result?.success !== true || data?.valid !== true || !Number.isInteger(data.quantity) || (data.quantity ?? 0) < 1 || typeof data.orderNumber !== 'string' || !data.orderNumber.trim()) return null
  return { quantity: data.quantity!, orderNumber: data.orderNumber }
}

export function checkInFailure(value: unknown, online: boolean): string {
  if (!online) return 'Sin conexión. No se registró esta entrada. Conéctate y vuelve a validarla.'
  const failure = value as { response?: { status?: number; data?: { message?: string } } }
  if (failure?.response?.status === 409) return 'Entrada ya utilizada, cancelada o no válida para este evento. Revisa la entrada antes de permitir el acceso.'
  return failure?.response?.data?.message || 'No se confirmó el registro. Comprueba la conexión y consulta la entrada antes de reintentar.'
}
