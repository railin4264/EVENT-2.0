'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldAlert, Clock, CheckCircle, FileText, Globe, Phone, Building, AlertTriangle } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'

interface VerificationState {
  status: 'none' | 'pending' | 'verified' | 'rejected'
  organizationName?: string
  documentType?: string
  documentNumber?: string
  socialProofUrl?: string
  phoneNumber?: string
  notes?: string
  submittedAt?: string
  rejectionReason?: string
}

export default function OrganizerVerificationSettings() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<VerificationState>({ status: 'none' })
  const [formData, setFormData] = useState({
    organizationName: '',
    documentType: 'cedula',
    documentNumber: '',
    socialProofUrl: '',
    phoneNumber: '',
    notes: ''
  })

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/users/organizer-verification/status')
      if (res.data?.success) {
        setStatus(res.data.verification || { status: 'none' })
        if (res.data.verification) {
          setFormData(prev => ({
            ...prev,
            organizationName: res.data.verification.organizationName || '',
            documentType: res.data.verification.documentType || 'cedula',
            documentNumber: res.data.verification.documentNumber || '',
            socialProofUrl: res.data.verification.socialProofUrl || '',
            phoneNumber: res.data.verification.phoneNumber || '',
            notes: res.data.verification.notes || ''
          }))
        }
      }
    } catch (err) {
      console.error('Error fetching verification status:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.documentNumber.trim() || !formData.phoneNumber.trim()) {
      toast.error('Número de documento y teléfono son obligatorios')
      return
    }

    setSubmitting(true)
    try {
      const res = await apiClient.post('/users/organizer-verification/submit', formData)
      if (res.data?.success) {
        toast.success(res.data.message || 'Solicitud de verificación enviada')
        setStatus(res.data.verification)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al enviar la solicitud')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="glass border border-border/50 rounded-3xl p-8 backdrop-blur-xl bg-card/40 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded mb-4" />
        <div className="h-4 w-72 bg-muted rounded mb-8" />
        <div className="h-32 bg-muted rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="glass border border-border/50 rounded-3xl p-6 lg:p-8 backdrop-blur-xl bg-card/40">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Verificación Oficial de Organizador</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Protege a tu comunidad y genera confianza absoluta. Los organizadores verificados muestran una insignia de confianza 🛡️ en sus eventos y perfil, previniendo engaños y fraudes.
            </p>
          </div>
        </div>

        {/* Status: Verified */}
        {status.status === 'verified' && (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
              <CheckCircle className="w-6 h-6" />
              <span>¡Cuenta de Organizador Verificada!</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tu identidad y trayectoria han sido validadas por el equipo de EventNow. Todos tus eventos creados muestran la insignia oficial de confianza 🛡️ y están libres de avisos de precaución.
            </p>
            {status.organizationName && (
              <p className="text-xs font-semibold text-foreground">
                Organización acreditada: <span className="text-emerald-400">{status.organizationName}</span>
              </p>
            )}
          </div>
        )}

        {/* Status: Pending */}
        {status.status === 'pending' && (
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-lg">
              <Clock className="w-6 h-6 animate-pulse" />
              <span>Solicitud de verificación en revisión</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Hemos recibido tus datos y documento de identidad ({status.documentType?.toUpperCase()} ···{status.documentNumber?.slice(-4)}). Nuestro equipo de moderación revisará la información para proteger a los asistentes de fraudes y activar tu insignia en un plazo habitual de 24 a 48 horas.
            </p>
          </div>
        )}

        {/* Status: Rejected */}
        {status.status === 'rejected' && (
          <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 space-y-3 mb-6">
            <div className="flex items-center gap-2 text-red-400 font-bold text-lg">
              <ShieldAlert className="w-6 h-6" />
              <span>Solicitud rechazada</span>
            </div>
            <p className="text-sm leading-relaxed">
              Motivo informado por moderación: <strong className="text-white">{status.rejectionReason || 'Documento no legible o datos de contacto no verificables.'}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Puedes corregir la información en el formulario a continuación y volver a solicitar la verificación.
            </p>
          </div>
        )}

        {/* Verification Form (shown when none, rejected, or re-submitting) */}
        {status.status !== 'verified' && status.status !== 'pending' && (
          <form onSubmit={handleSubmit} className="space-y-5 mt-6 border-t border-border/50 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-primary" /> Nombre del organizador o colectivo
                </label>
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={e => setFormData({ ...formData, organizationName: e.target.value })}
                  placeholder="Ej: Colectivo Cultural, Academia, o tu nombre"
                  className="w-full p-3.5 glass bg-background/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-primary" /> Teléfono o WhatsApp de contacto oficial *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="Ej: +1 809-555-0123"
                  className="w-full p-3.5 glass bg-background/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" /> Tipo de documento de identidad *
                </label>
                <select
                  value={formData.documentType}
                  onChange={e => setFormData({ ...formData, documentType: e.target.value })}
                  className="w-full p-3.5 glass bg-background/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="cedula">Cédula de Identidad y Electoral (RD)</option>
                  <option value="rnc">RNC (Registro Nacional del Contribuyente - RD)</option>
                  <option value="passport">Pasaporte</option>
                  <option value="business_license">Licencia Comercial / Registro Mercantil</option>
                  <option value="other">Otro documento oficial</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Número de documento *
                </label>
                <input
                  type="text"
                  required
                  value={formData.documentNumber}
                  onChange={e => setFormData({ ...formData, documentNumber: e.target.value })}
                  placeholder="Ej: 001-XXXXXXX-X ó RNC de empresa"
                  className="w-full p-3.5 glass bg-background/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-primary" /> Enlace a red social o página web de prueba
              </label>
              <input
                type="url"
                value={formData.socialProofUrl}
                onChange={e => setFormData({ ...formData, socialProofUrl: e.target.value })}
                placeholder="Ej: https://instagram.com/tu_cuenta_o_colectivo"
                className="w-full p-3.5 glass bg-background/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ayuda a nuestro equipo a comprobar rápidamente tu autenticidad y comunidad previa.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Notas adicionales para el equipo de moderación (opcional)
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Cuéntanos brevemente qué tipo de actividades organizas habitualmente..."
                className="w-full p-3.5 glass bg-background/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? 'Enviando solicitud...' : 'Solicitar verificación de organizador 🛡️'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
