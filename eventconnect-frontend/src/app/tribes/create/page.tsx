'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Users, Globe, Lock, Shield, Camera, Plus, X, Settings, FileText, Crown, User, ChevronDown, Image as ImageIcon, Star, Info, CheckCircle, AlertCircle, MapPin, Palette } from 'lucide-react'

// Aliases para iconos no disponibles en lucide-react 0.408.0
const Tag = FileText
const UserPlus = User
const Upload = Camera
const Hash = FileText
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'

interface TribeFormData {
  name: string
  description: string
  category: string
  privacy: 'public' | 'private' | 'secret'
  requiresApproval: boolean
  allowInvites: boolean
  maxMembers: string
  rules: string[]
  tags: string[]
  bannerUrl: string
  logoUrl: string
  colorTheme: string
  allowEvents: boolean
  allowPolls: boolean
  allowFiles: boolean
  moderators: string[]
  welcomeMessage: string
  socialLinks: {
    website: string
    discord: string
    telegram: string
    whatsapp: string
  }
  location: {
    address: string
    isVirtual: boolean
  }
}

export default function CreateTribePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newRule, setNewRule] = useState('')
  const [newTag, setNewTag] = useState('')
  const [newModerator, setNewModerator] = useState('')

  const [formData, setFormData] = useState<TribeFormData>({
    name: '',
    description: '',
    category: '',
    privacy: 'public',
    requiresApproval: false,
    allowInvites: true,
    maxMembers: '',
    rules: [],
    tags: [],
    bannerUrl: '',
    logoUrl: '',
    colorTheme: 'blue',
    allowEvents: true,
    allowPolls: true,
    allowFiles: true,
    moderators: [],
    welcomeMessage: '',
    socialLinks: {
      website: '',
      discord: '',
      telegram: '',
      whatsapp: ''
    },
    location: {
      address: '',
      isVirtual: false
    }
  })

  const steps = [
    { id: 1, title: 'Información Básica', icon: Users },
    { id: 2, title: 'Privacidad y Reglas', icon: Shield },
    { id: 3, title: 'Personalización', icon: Palette },
    { id: 4, title: 'Configuración Avanzada', icon: Settings },
    { id: 5, title: 'Finalizar', icon: Crown }
  ]

  const categories = [
    { id: 'tech', name: 'Tecnología', emoji: '💻', color: 'from-blue-500 to-cyan-500' },
    { id: 'business', name: 'Negocios', emoji: '💼', color: 'from-green-500 to-emerald-500' },
    { id: 'design', name: 'Diseño', emoji: '🎨', color: 'from-purple-500 to-pink-500' },
    { id: 'music', name: 'Música', emoji: '🎵', color: 'from-orange-500 to-red-500' },
    { id: 'education', name: 'Educación', emoji: '📚', color: 'from-indigo-500 to-blue-500' },
    { id: 'health', name: 'Salud y Bienestar', emoji: '🏥', color: 'from-green-500 to-teal-500' },
    { id: 'sports', name: 'Deportes', emoji: '⚽', color: 'from-blue-500 to-green-500' },
    { id: 'gaming', name: 'Gaming', emoji: '🎮', color: 'from-purple-500 to-blue-500' },
    { id: 'art', name: 'Arte y Cultura', emoji: '🖼️', color: 'from-pink-500 to-orange-500' },
    { id: 'food', name: 'Gastronomía', emoji: '🍽️', color: 'from-orange-500 to-yellow-500' },
    { id: 'travel', name: 'Viajes', emoji: '✈️', color: 'from-blue-500 to-purple-500' },
    { id: 'other', name: 'Otro', emoji: '📋', color: 'from-gray-500 to-slate-500' }
  ]

  const privacyOptions = [
    {
      id: 'public',
      name: 'Pública',
      description: 'Cualquiera puede ver y unirse a la tribu',
      icon: Globe,
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'private',
      name: 'Privada',
      description: 'Visible en búsquedas, requiere solicitud para unirse',
      icon: Lock,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'secret',
      name: 'Secreta',
      description: 'Solo visible por invitación directa',
      icon: Shield,
      color: 'from-purple-500 to-pink-500'
    }
  ]

  const colorThemes = [
    { id: 'blue', name: 'Azul', gradient: 'from-blue-500 to-cyan-500' },
    { id: 'purple', name: 'Morado', gradient: 'from-purple-500 to-pink-500' },
    { id: 'green', name: 'Verde', gradient: 'from-green-500 to-emerald-500' },
    { id: 'orange', name: 'Naranja', gradient: 'from-orange-500 to-red-500' },
    { id: 'indigo', name: 'Índigo', gradient: 'from-indigo-500 to-purple-500' },
    { id: 'teal', name: 'Teal', gradient: 'from-teal-500 to-cyan-500' }
  ]

  const createTribeMutation = useMutation({
    mutationFn: async (tribeData: TribeFormData) => {
      const response = await apiClient.post('/tribes', {
        ...tribeData,
        isPublic: tribeData.privacy === 'public'
      })
      return response.data
    },
    onSuccess: (data) => {
      toast.success('Tribu creada exitosamente')
      router.push(`/tribes/${data._id}`)
    },
    onError: () => {
      toast.error('Error al crear la tribu')
    }
  })

  const updateFormData = (field: keyof TribeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const updateSocialLinks = (platform: keyof TribeFormData['socialLinks'], value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [platform]: value }
    }))
  }

  const addRule = () => {
    if (newRule.trim() && !formData.rules.includes(newRule.trim())) {
      updateFormData('rules', [...formData.rules, newRule.trim()])
      setNewRule('')
    }
  }

  const removeRule = (ruleToRemove: string) => {
    updateFormData('rules', formData.rules.filter(rule => rule !== ruleToRemove))
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      updateFormData('tags', [...formData.tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    updateFormData('tags', formData.tags.filter(tag => tag !== tagToRemove))
  }

  const addModerator = () => {
    if (newModerator.trim() && !formData.moderators.includes(newModerator.trim())) {
      updateFormData('moderators', [...formData.moderators, newModerator.trim()])
      setNewModerator('')
    }
  }

  const removeModerator = (moderatorToRemove: string) => {
    updateFormData('moderators', formData.moderators.filter(mod => mod !== moderatorToRemove))
  }

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.name || !formData.description || !formData.category) {
      toast.error('Por favor completa todos los campos obligatorios')
      return
    }

    createTribeMutation.mutate(formData)
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim() && formData.description.trim() && formData.category
      case 2:
        return true // Privacy settings have defaults
      case 3:
        return true // Customization is optional
      case 4:
        return true // Advanced settings are optional
      default:
        return true
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>

            <div>
              <h1 className="font-bold text-gray-900 dark:text-white">Crear Tribu</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Paso {currentStep} de {steps.length}
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            {Math.round((currentStep / steps.length) * 100)}%
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: `${(currentStep / steps.length) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="px-4 pb-4">
          <div className="flex justify-between">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.id}
                  className={`flex flex-col items-center ${step.id <= currentStep ? 'text-purple-600' : 'text-gray-400 dark:text-gray-500'
                    }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${step.id <= currentStep
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
                    }`}>
                    {step.id <= currentStep ? '✓' : step.id}
                  </div>
                  <span className="text-xs mt-1 text-center max-w-16">{step.title}</span>
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -100, opacity: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Información Básica</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Define los elementos esenciales de tu tribu
                    </p>
                  </div>

                  {/* Tribe Logo */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Logo de la tribu
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          className="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Camera className="w-8 h-8 text-gray-400" />
                        </motion.button>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">Sube el logo de tu tribu</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Recomendado: 400x400px, PNG o JPG
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tribe Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Nombre de la tribu *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                      placeholder="Ej. Desarrolladores Frontend CDMX"
                      className="w-full p-4 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Descripción *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                      placeholder="Describe el propósito de tu tribu, qué tipo de contenido comparten, objetivos, etc."
                      rows={4}
                      className="w-full p-4 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Categoría *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {categories.map((category) => (
                        <motion.button
                          key={category.id}
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => updateFormData('category', category.id)}
                          className={`p-3 rounded-xl border transition-all ${formData.category === category.id
                              ? 'border-purple-500 bg-purple-500/10 text-purple-600'
                              : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                          <div className="text-2xl mb-1">{category.emoji}</div>
                          <div className="text-sm font-medium">{category.name}</div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Etiquetas (opcional)
                    </label>
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Agregar etiqueta"
                        className="flex-1 p-3 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={addTag}
                        className="p-3 bg-purple-500 text-white rounded-xl"
                      >
                        <Plus className="w-5 h-5" />
                      </motion.button>
                    </div>

                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <motion.div
                            key={index}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 text-purple-600 rounded-full text-sm"
                          >
                            #{tag}
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </motion.button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-purple-500" />
                      Ubicación de la Tribu
                    </h4>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                      <input
                        type="checkbox"
                        id="isVirtualStep1"
                        checked={formData.location.isVirtual}
                        onChange={(e) => updateFormData('location', { ...formData.location, isVirtual: e.target.checked })}
                        className="w-5 h-5 text-purple-500 bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="isVirtualStep1" className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold cursor-pointer">
                        Tribu 100% Virtual (Sin sede física)
                      </label>
                    </div>

                    {!formData.location.isVirtual && (
                      <div>
                        <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                          Ciudad, País o Dirección principal
                        </label>
                        <input
                          type="text"
                          value={formData.location.address}
                          onChange={(e) => updateFormData('location', { ...formData.location, address: e.target.value })}
                          placeholder="Ej. Madrid, Barcelona..."
                          className="w-full p-4 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Privacy and Rules */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -100, opacity: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Privacidad y Reglas</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Configura quién puede unirse y las reglas de tu tribu
                    </p>
                  </div>

                  {/* Privacy Settings */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Nivel de privacidad
                    </h3>
                    <div className="space-y-3">
                      {privacyOptions.map((option) => {
                        const Icon = option.icon
                        return (
                          <motion.button
                            key={option.id}
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => updateFormData('privacy', option.id)}
                            className={`w-full p-4 rounded-xl border text-left transition-all ${formData.privacy === option.id
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${option.color} flex items-center justify-center`}>
                                <Icon className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{option.name}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{option.description}</p>
                              </div>
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Additional Settings */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Configuración adicional
                    </h3>

                    <div className="space-y-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => updateFormData('requiresApproval', !formData.requiresApproval)}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${formData.requiresApproval
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <UserPlus className="w-5 h-5" />
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Requiere aprobación para unirse</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Los nuevos miembros deben ser aprobados por moderadores
                            </p>
                          </div>
                        </div>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => updateFormData('allowInvites', !formData.allowInvites)}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${formData.allowInvites
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5" />
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Permitir invitaciones de miembros</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Los miembros pueden invitar a otros a unirse
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    </div>
                  </div>

                  {/* Max Members */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Límite de miembros (opcional)
                    </label>
                    <input
                      type="number"
                      value={formData.maxMembers}
                      onChange={(e) => updateFormData('maxMembers', e.target.value)}
                      placeholder="Ej. 500 (deja vacío para ilimitado)"
                      min="1"
                      className="w-full p-4 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Rules */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Reglas de la tribu
                    </label>
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newRule}
                        onChange={(e) => setNewRule(e.target.value)}
                        placeholder="Agregar regla"
                        className="flex-1 p-3 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRule())}
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={addRule}
                        className="p-3 bg-purple-500 text-white rounded-xl"
                      >
                        <Plus className="w-5 h-5" />
                      </motion.button>
                    </div>

                    {formData.rules.length > 0 && (
                      <div className="space-y-2">
                        {formData.rules.map((rule, index) => (
                          <motion.div
                            key={index}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-xl"
                          >
                            <span className="font-semibold text-purple-600">{index + 1}.</span>
                            <span className="flex-1 text-sm text-gray-900 dark:text-white">{rule}</span>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              type="button"
                              onClick={() => removeRule(rule)}
                              className="text-red-500 hover:bg-red-500/10 p-1 rounded-full"
                            >
                              <X className="w-4 h-4" />
                            </motion.button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Customization */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -100, opacity: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Personalización</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Personaliza la apariencia de tu tribu
                    </p>
                  </div>

                  {/* Banner Image */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Banner de la tribu
                    </label>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                      <div className="text-center">
                        <p className="font-medium text-gray-900 dark:text-white">Subir banner</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">1200x300px recomendado</p>
                      </div>
                    </motion.button>
                  </div>

                  {/* Color Theme */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Tema de color
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {colorThemes.map((theme) => (
                        <motion.button
                          key={theme.id}
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => updateFormData('colorTheme', theme.id)}
                          className={`p-4 rounded-xl border-2 transition-all ${formData.colorTheme === theme.id
                              ? 'border-purple-500'
                              : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                            }`}
                        >
                          <div className={`w-full h-8 bg-gradient-to-r ${theme.gradient} rounded-lg mb-2`} />
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{theme.name}</p>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Welcome Message */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Mensaje de bienvenida (opcional)
                    </label>
                    <textarea
                      value={formData.welcomeMessage}
                      onChange={(e) => updateFormData('welcomeMessage', e.target.value)}
                      placeholder="Mensaje que verán los nuevos miembros al unirse..."
                      rows={3}
                      className="w-full p-4 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Social Links */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Enlaces sociales (opcional)
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Sitio web
                        </label>
                        <input
                          type="url"
                          value={formData.socialLinks.website}
                          onChange={(e) => updateSocialLinks('website', e.target.value)}
                          placeholder="https://mitribu.com"
                          className="w-full p-3 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Discord
                        </label>
                        <input
                          type="text"
                          value={formData.socialLinks.discord}
                          onChange={(e) => updateSocialLinks('discord', e.target.value)}
                          placeholder="https://discord.gg/..."
                          className="w-full p-3 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Telegram
                        </label>
                        <input
                          type="text"
                          value={formData.socialLinks.telegram}
                          onChange={(e) => updateSocialLinks('telegram', e.target.value)}
                          placeholder="@mitribu"
                          className="w-full p-3 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          WhatsApp
                        </label>
                        <input
                          type="text"
                          value={formData.socialLinks.whatsapp}
                          onChange={(e) => updateSocialLinks('whatsapp', e.target.value)}
                          placeholder="https://chat.whatsapp.com/..."
                          className="w-full p-3 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Advanced Settings */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -100, opacity: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Configuración Avanzada</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Configura las funcionalidades disponibles en tu tribu
                    </p>
                  </div>

                  {/* Features */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Funcionalidades permitidas
                    </h3>

                    <div className="space-y-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => updateFormData('allowEvents', !formData.allowEvents)}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${formData.allowEvents
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5" />
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Crear eventos</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Los miembros pueden organizar eventos para la tribu
                            </p>
                          </div>
                        </div>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => updateFormData('allowPolls', !formData.allowPolls)}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${formData.allowPolls
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <Hash className="w-5 h-5" />
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Crear encuestas</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Los miembros pueden crear encuestas y votaciones
                            </p>
                          </div>
                        </div>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => updateFormData('allowFiles', !formData.allowFiles)}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${formData.allowFiles
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <Upload className="w-5 h-5" />
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Compartir archivos</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Los miembros pueden subir y compartir archivos
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    </div>
                  </div>

                  {/* Moderators */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Moderadores adicionales (opcional)
                    </label>
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={newModerator}
                        onChange={(e) => setNewModerator(e.target.value)}
                        placeholder="Nombre de usuario o email"
                        className="flex-1 p-3 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addModerator())}
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={addModerator}
                        className="p-3 bg-purple-500 text-white rounded-xl"
                      >
                        <Plus className="w-5 h-5" />
                      </motion.button>
                    </div>

                    {formData.moderators.length > 0 && (
                      <div className="space-y-2">
                        {formData.moderators.map((moderator, index) => (
                          <motion.div
                            key={index}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-xl"
                          >
                            <Crown className="w-4 h-4 text-purple-600" />
                            <span className="flex-1 text-sm text-gray-900 dark:text-white">{moderator}</span>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              type="button"
                              onClick={() => removeModerator(moderator)}
                              className="text-red-500 hover:bg-red-500/10 p-1 rounded-full"
                            >
                              <X className="w-4 h-4" />
                            </motion.button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 5: Review and Submit */}
              {currentStep === 5 && (
                <motion.div
                  key="step5"
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -100, opacity: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Revisar y Crear</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Revisa todos los detalles antes de crear tu tribu
                    </p>
                  </div>

                  {/* Tribe Preview */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${colorThemes.find(t => t.id === formData.colorTheme)?.gradient
                          } flex items-center justify-center text-white font-bold`}>
                          {formData.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 dark:text-white">{formData.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {categories.find(c => c.id === formData.category)?.name}
                            </span>
                            <span className="text-xs">•</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {privacyOptions.find(p => p.id === formData.privacy)?.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                        {formData.description}
                      </p>

                      {formData.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {formData.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-purple-500/10 text-purple-600 rounded-full text-xs"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">0 miembros</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {formData.rules.length} reglas
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Resumen de configuración</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Privacidad:</span>
                        <span className="text-gray-900 dark:text-white">{privacyOptions.find(p => p.id === formData.privacy)?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Requiere aprobación:</span>
                        <span className="text-gray-900 dark:text-white">{formData.requiresApproval ? 'Sí' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Límite de miembros:</span>
                        <span className="text-gray-900 dark:text-white">{formData.maxMembers || 'Ilimitado'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Funcionalidades:</span>
                        <span className="text-gray-900 dark:text-white">
                          {[
                            formData.allowEvents && 'Eventos',
                            formData.allowPolls && 'Encuestas',
                            formData.allowFiles && 'Archivos'
                          ].filter(Boolean).join(', ') || 'Chat básico'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Important Notes */}
                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    <h4 className="font-semibold text-purple-600 mb-2">📋 Antes de crear</h4>
                    <ul className="text-sm text-purple-600 space-y-1">
                      <li>• Tu tribu aparecerá en búsquedas según su configuración de privacidad</li>
                      <li>• Serás el administrador principal con todos los permisos</li>
                      <li>• Podrás modificar la configuración después de crear la tribu</li>
                      <li>• Los moderadores podrán ayudarte a gestionar la comunidad</li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        {/* Bottom Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-4xl mx-auto flex gap-3">
            {currentStep > 1 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={prevStep}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-colors"
              >
                Anterior
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type={currentStep === steps.length ? "submit" : "button"}
              onClick={currentStep === steps.length ? handleSubmit : nextStep}
              disabled={!isStepValid() || createTribeMutation.isPending}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {createTribeMutation.isPending ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Creando tribu...
                </>
              ) : (
                <>
                  {currentStep === steps.length ? 'Crear tribu' : 'Continuar'}
                  {currentStep < steps.length && <ChevronDown className="w-5 h-5 rotate-[-90deg]" />}
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}