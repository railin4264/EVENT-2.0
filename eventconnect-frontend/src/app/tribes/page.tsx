'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  Search,
  Plus,
  MapPin,
  Calendar,
  MessageCircle,
  Crown,
  Shield,
  Globe,
  Lock,
  Compass,
  Navigation,
  CheckCircle,
  X,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@/lib/api/client'
import toast from 'react-hot-toast'
import { EmptyState } from '@/components/ui/EmptyState'
import { useLiveLocation } from '@/hooks/useLiveLocation'
import { readTribeAccess, type TribeAccess } from '@/components/tribes/tribe-access'
import { TribeAccessPanel } from '@/components/tribes/TribeAccessPanel'
import { useTribeAccessActions } from '@/components/tribes/useTribeAccessActions'

interface Tribe extends TribeAccess {
  _id: string
  name: string
  description: string
  category: string
  avatar?: string
  cover?: string
  isPrivate: boolean
  tags?: string[]
  rules?: string[]
  createdBy: {
    _id?: string
    username: string
    firstName: string
    lastName: string
    avatar?: string
  }
  members: any[]
  stats: {
    memberCount: number
    eventCount: number
    activityLevel: 'low' | 'medium' | 'high'
  }
  location?: {
    address?: string
    city?: string
    country?: string
    coordinates?: number[]
    isVirtual?: boolean
  }
  createdAt: string
  pendingRequestsCount?: number
  isPublic?: boolean
  memberCount?: number
}

interface CreateTribeForm {
  name: string
  description: string
  category: string
  isPublic: boolean
  requiresApproval: boolean
  tags: string[]
  rules: string[]
  welcomeMessage: string
  location: {
    address: string
    coordinates?: [number, number]
    isVirtual?: boolean
  }
}

import { CATEGORY_TRANSLATIONS } from '@/lib/tribe-constants'

const categories = [
  'music',
  'technology',
  'sports',
  'art',
  'food',
  'business',
  'outdoors',
  'networking',
  'gaming',
  'cultural',
  'health',
  'travel',
  'education',
  'other'
]

export default function TribesPage() {
  const [page, setPage] = useState(1)
  const [selectedTab, setSelectedTab] = useState<'discover' | 'my-tribes' | 'requests'>('discover')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'public' | 'private'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [joinRequestTarget, setJoinRequestTarget] = useState<Tribe | null>(null)
  const [newTag, setNewTag] = useState('')
  const [newRule, setNewRule] = useState('')

  const { location: liveLocation, refreshNow, presets } = useLiveLocation(true)
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()
  const currentUserId = String(user?._id || user?.id || '')
  const accessActions = useTribeAccessActions(currentUserId)

  const [createForm, setCreateForm] = useState<CreateTribeForm>({
    name: '',
    description: '',
    category: 'music',
    isPublic: true,
    requiresApproval: false,
    tags: [],
    rules: ['Respeto mutuo entre todos los miembros', 'Compartir contenido relevante para la comunidad'],
    welcomeMessage: '¡Bienvenido/a a nuestra comunidad en EventNow!',
    location: {
      address: liveLocation.address || 'Santo Domingo, República Dominicana',
      coordinates: [liveLocation.lng, liveLocation.lat],
      isVirtual: false
    }
  })

  // Keep default create location synced with live location if user hasn't edited it
  useEffect(() => {
    if (liveLocation?.address && (!createForm.location.address || createForm.location.address.includes('Santo Domingo'))) {
      setCreateForm((prev) => ({
        ...prev,
        location: {
          ...prev.location,
          address: liveLocation.address,
          coordinates: [liveLocation.lng, liveLocation.lat]
        }
      }))
    }
  }, [liveLocation.address, liveLocation.lat, liveLocation.lng])

  useEffect(() => {
    setJoinRequestTarget(null); setShowCreateModal(false); setNewTag(''); setNewRule('')
    setCreateForm(prev => ({ ...prev, name: '', description: '', tags: [], welcomeMessage: '' }))
    setSelectedTab('discover')
  }, [currentUserId])

  useEffect(() => { setPage(1) }, [selectedTab, searchQuery, selectedCategory, privacyFilter, currentUserId])

  const tribesKey = ['tribes', selectedTab, searchQuery, selectedCategory, privacyFilter, currentUserId, page]

  const processTribeData = (tribeData: any[]): Tribe[] => {
    if (!Array.isArray(tribeData)) return []

    const currentUserId = String(user?._id || user?.id || '')

    return tribeData.map((tribe: any) => {
      const access = readTribeAccess(tribe, currentUserId)
      const creatorObj = tribe.createdBy || tribe.creator || {
        _id: '',
        username: 'organizador',
        firstName: 'Comunidad',
        lastName: 'EventNow'
      }
      const isPrivate = access.privacy !== 'public'
      const count =
        tribe.memberCount ??
        tribe.membersCount ??
        tribe.stats?.memberCount ??
        tribe.stats?.totalMembers ??
        (Array.isArray(tribe.members) ? tribe.members.length : 1)

      const avatarUrl =
        typeof tribe.avatar === 'string'
          ? tribe.avatar
          : tribe.avatar?.url || tribe.logoUrl || ''

      const coverUrl =
        typeof tribe.cover === 'string'
          ? tribe.cover
          : tribe.coverImage?.url || tribe.cover?.url || tribe.bannerUrl || ''

      const pendingRequestsCount =
        typeof tribe.pendingRequestsCount === 'number'
          ? tribe.pendingRequestsCount
          : Array.isArray(tribe.joinRequests)
            ? tribe.joinRequests.filter((r: any) => r.status === 'pending').length
            : 0

      return {
        ...tribe,
        members: access.isMember || access.isAdmin ? (Array.isArray(tribe.members) ? tribe.members : []) : [],
        createdBy: creatorObj,
        avatar: avatarUrl,
        cover: coverUrl,
        isPrivate,
        isPublic: !isPrivate,
        memberCount: count,
        stats: {
          memberCount: count,
          eventCount: tribe.stats?.eventCount ?? tribe.stats?.totalEvents ?? 0,
          activityLevel: tribe.stats?.activityLevel || (count >= 10 ? 'high' : count >= 3 ? 'medium' : 'low')
        },
        ...access,
        pendingRequestsCount
      }
    })
  }

  const { data: tribeResult, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: tribesKey,
    enabled: selectedTab === 'discover' || isAuthenticated,
    queryFn: async ({ signal }) => {
      if (selectedTab === 'my-tribes') {
        const response = await apiClient.get('/tribes/user/me', { signal })
        const raw = response.data?.tribes || response.data?.data || []
        return { items: processTribeData(raw), pagination: response.data?.pagination || { page: 1, pages: 1, total: raw.length } }
      }

      const params = new URLSearchParams({
        ...(searchQuery && { search: searchQuery }),
        ...(selectedCategory !== 'all' && { category: selectedCategory }),
        ...(privacyFilter !== 'all' && { privacy: privacyFilter }),
        limit: '24',
        page: String(page),
        ...(selectedTab === 'requests' && { scope: 'requests' })
      })

      const response = await apiClient.get(`/tribes?${params.toString()}`, { signal })
      const raw = response.data?.tribes || response.data?.data || []
      const processed = processTribeData(raw)

      return { items: processed, pagination: response.data?.pagination || { page: 1, pages: 1, total: processed.length } }
    }
  })
  const tribes = tribeResult?.items
  const pagination = tribeResult?.pagination


  // Create tribe mutation
  const createTribeMutation = useMutation({
    mutationFn: async (data: CreateTribeForm) => {
      const payload = {
        ...data,
        privacy: data.isPublic ? 'public' : 'private',
        isPrivate: !data.isPublic,
        requiresApproval: !data.isPublic || data.requiresApproval
      }
      const response = await apiClient.post('/tribes', payload)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tribes'] })
      setShowCreateModal(false)
      toast.success('¡Comunidad creada exitosamente!')
      const createdId = data?.tribe?._id || data?.data?._id
      if (createdId) {
        router.push(`/tribes/${createdId}`)
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al crear la comunidad')
    }
  })

  const handleJoinClick = (tribe: Tribe, message?: string) => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/tribes/${tribe._id}`)}`)
      return
    }
    if (!tribe.canJoin && !tribe.canRequestJoin) return
    if (tribe.canRequestJoin && !joinRequestTarget) {
      setJoinRequestTarget(tribe)
      accessActions.clearFailure()
      return
    }
    void accessActions.run({ tribeId: tribe._id, kind: 'join', message }).then(success => {
      if (success) setJoinRequestTarget(null)
    })
  }

  useEffect(() => {
    if (!joinRequestTarget) return
    const previous = document.activeElement
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus() }
  }, [joinRequestTarget])

  const handleJoinDialogKeys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !accessActions.pending) { setJoinRequestTarget(null); return }
    if (event.key !== 'Tab') return
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), textarea:not([disabled]), a[href]'))
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (!first) { event.preventDefault(); return }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  const handleUseMyLiveLocation = async () => {
    const loc = await refreshNow()
    setCreateForm((prev) => ({
      ...prev,
      location: {
        address: loc.address || `${loc.city}, ${loc.country}`,
        coordinates: [loc.lng, loc.lat],
        isVirtual: false
      }
    }))
    toast.success(`Ubicación actualizada: ${loc.city}`)
  }

  const handleCreateTribe = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=%2Ftribes')
      return
    }
    if (!createForm.name.trim() || createForm.name.trim().length < 3) {
      toast.error('El nombre de la comunidad debe tener al menos 3 caracteres')
      return
    }
    if (!createForm.description.trim() || createForm.description.trim().length < 10) {
      toast.error('La descripción debe tener al menos 10 caracteres')
      return
    }
    if (!createForm.category) {
      toast.error('Selecciona una categoría para tu comunidad')
      return
    }
    createTribeMutation.mutate(createForm)
  }

  const handleAddTag = () => {
    if (newTag.trim() && !createForm.tags.includes(newTag.trim())) {
      setCreateForm({
        ...createForm,
        tags: [...createForm.tags, newTag.trim()]
      })
      setNewTag('')
    }
  }

  const handleAddRule = () => {
    if (newRule.trim() && !createForm.rules.includes(newRule.trim())) {
      setCreateForm({
        ...createForm,
        rules: [...createForm.rules, newRule.trim()]
      })
      setNewRule('')
    }
  }

  const formatMemberCount = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
    return count.toString()
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-6 pb-24">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Top Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-border/60">
          <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <Link href="/" className="flex items-center gap-2 text-foreground font-bold hover:text-primary transition-colors">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-white">
                <Compass className="h-4 w-4" />
              </span>
              EventNow
            </Link>
            <span>/</span>
            <Link href="/discovery" className="hover:text-foreground transition-colors">Mapa en Vivo</Link>
            <Link href="/events" className="hover:text-foreground transition-colors">Eventos</Link>
            <Link href="/feed" className="hover:text-foreground transition-colors">Feed Social</Link>
            <span className="text-primary font-semibold">Comunidades</span>
          </div>

          <div className="flex items-center gap-2 text-xs bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-full">
            <Navigation className="w-3.5 h-3.5 animate-pulse" />
            <span>Tu zona activa: <strong>{liveLocation.city}, {liveLocation.countryCode}</strong></span>
            <button
              onClick={() => void refreshNow()}
              className="underline font-semibold ml-1 hover:opacity-80"
              title="Actualizar ubicación GPS en tiempo real"
            >
              Actualizar GPS
            </button>
          </div>
        </div>

        {/* Hero Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Tribus y Comunidades EventNow
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-2">
                Encuentra tu Tribu en {liveLocation.city} y toda RD
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground">
                Únete a comunidades abiertas o solicita acceso a grupos privados exclusivos para organizar planes y eventos.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => (isAuthenticated ? setShowCreateModal(true) : router.push('/login?redirect=%2Ftribes'))}
                className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                Crear Comunidad Rápida
              </button>
              <Link
                href={isAuthenticated ? '/tribes/create' : '/login?redirect=%2Ftribes%2Fcreate'}
                className="flex items-center gap-2 px-4 py-3 border border-border bg-card hover:bg-muted text-foreground rounded-2xl font-semibold text-sm transition-all"
              >
                Asistente Avanzado
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Main Tabs */}
          <div className="flex flex-wrap items-center gap-2 bg-card p-1.5 rounded-2xl border border-border">
            <button
              onClick={() => setSelectedTab('discover')}
              className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                selectedTab === 'discover'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Explorar Comunidades
            </button>
            <button
              onClick={() => (isAuthenticated ? setSelectedTab('my-tribes') : router.push('/login?redirect=%2Ftribes'))}
              className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                selectedTab === 'my-tribes'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Mis Comunidades
            </button>
            <button
              onClick={() => (isAuthenticated ? setSelectedTab('requests') : router.push('/login?redirect=%2Ftribes'))}
              className={`flex-1 min-w-[160px] px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                selectedTab === 'requests'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Lock className="w-4 h-4" />
              Solicitudes y Accesos
            </button>
          </div>
        </div>

        {/* Search, Category & Privacy Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar comunidades por nombre, ciudad o interés..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-10 py-3 bg-card border border-border rounded-2xl focus:ring-2 focus:ring-primary text-foreground transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 bg-card border border-border rounded-2xl focus:ring-2 focus:ring-primary text-foreground font-medium"
            >
              <option value="all">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_TRANSLATIONS[cat] || cat}
                </option>
              ))}
            </select>

            <div className="flex rounded-2xl border border-border bg-card p-1">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'public', label: 'Públicas' },
                { id: 'private', label: 'Privadas 🔒' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPrivacyFilter(item.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    privacyFilter === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedTab === 'requests' && <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed text-muted-foreground">
          Aquí aparecen tus solicitudes pendientes y las comunidades con solicitudes que puedes revisar. Ser moderador activo permite gestionar ingresos; una invitación no es una solicitud abierta.
        </div>}
        {/* Tribes Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-3xl p-6 border border-border bg-card animate-pulse h-80" />
            ))}
          </div>
        ) : isError ? (
          <div role="alert" className="my-10 rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-lg font-semibold mb-2">No pudimos cargar las comunidades</p>
            <p className="text-sm text-muted-foreground mb-4">Verifica tu conexión e inténtalo nuevamente.</p>
            <button
              onClick={() => void refetch()}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold"
            >
              Reintentar
            </button>
          </div>
        ) : !tribes || tribes.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              selectedTab === 'my-tribes'
                ? 'Aún no perteneces a ninguna comunidad'
                : selectedTab === 'requests'
                  ? 'No tienes solicitudes pendientes'
                  : 'No encontramos comunidades con estos filtros'
            }
            description={
              selectedTab === 'my-tribes'
                ? 'Explora comunidades públicas o solicita unirte a una comunidad privada.'
                : selectedTab === 'requests'
                  ? 'Cuando solicites unirte a una comunidad privada o recibas solicitudes en tus comunidades, aparecerán aquí.'
                  : 'Prueba limpiando los filtros o sé el primero en fundar una comunidad para este interés.'
            }
            actionLabel={selectedTab !== 'discover' ? 'Explorar Comunidades' : 'Crear Comunidad'}
            actionOnClick={
              selectedTab !== 'discover'
                ? () => setSelectedTab('discover')
                : () => (isAuthenticated ? setShowCreateModal(true) : router.push('/login?redirect=%2Ftribes'))
            }
            className="my-12 py-16"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(tribes || []).map((tribe, index) => (
              <motion.div
                key={tribe._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                className="border border-border bg-card rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:border-primary/40 transition-all flex flex-col group"
              >
                {/* Cover Image */}
                <div
                  onClick={() => router.push(`/tribes/${tribe._id}`)}
                  className="h-36 bg-gradient-to-br from-violet-600/40 via-primary/30 to-cyan-500/30 relative cursor-pointer"
                >
                  {tribe.cover && (
                    <img
                      src={tribe.cover}
                      alt={tribe.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                  <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
                    {tribe.isPrivate ? (
                      <span className="px-3 py-1 bg-amber-500/90 backdrop-blur-sm text-white font-bold text-xs rounded-full flex items-center gap-1.5 shadow-md">
                        <Lock className="w-3 h-3" />
                        Privada
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-emerald-600/90 backdrop-blur-sm text-white font-bold text-xs rounded-full flex items-center gap-1.5 shadow-md">
                        <Globe className="w-3 h-3" />
                        Pública
                      </span>
                    )}

                    {tribe.canManageRequests && (tribe.pendingRequestsCount || 0) > 0 && (
                      <span className="px-2.5 py-1 bg-red-600 text-white font-bold text-xs rounded-full shadow-md animate-pulse">
                        {tribe.pendingRequestsCount} solicitud(es)
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="px-3 py-1 bg-black/65 backdrop-blur-md border border-white/15 text-white font-semibold text-xs rounded-full">
                      {CATEGORY_TRANSLATIONS[tribe.category] || tribe.category}
                    </span>
                  </div>

                  {/* Avatar */}
                  <div className="absolute -bottom-7 left-5">
                    <div className="w-16 h-16 bg-card rounded-2xl border-4 border-card flex items-center justify-center text-primary font-extrabold text-xl shadow-lg overflow-hidden">
                      {tribe.avatar ? (
                        <img
                          src={tribe.avatar}
                          alt={tribe.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      ) : (
                        tribe.name?.[0]?.toUpperCase() || 'T'
                      )}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 pt-10 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Link
                        href={`/tribes/${tribe._id}`}
                        className="font-bold text-foreground text-xl hover:text-primary transition-colors line-clamp-1"
                      >
                        {tribe.name}
                      </Link>
                      {tribe.isAdmin && (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 text-xs font-bold">
                          <Crown className="w-3 h-3" /> Admin
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {tribe.description}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-muted/40 border border-border/60 rounded-2xl text-center">
                      <div>
                        <div className="text-base font-extrabold text-primary">
                          {formatMemberCount(tribe.memberCount || 0)}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                          Miembros
                        </div>
                      </div>
                      <div className="border-x border-border/60">
                        <div className="text-base font-extrabold text-foreground">
                          {tribe.stats?.eventCount || 0}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                          Eventos
                        </div>
                      </div>
                      <div>
                        <div className="text-base font-extrabold text-emerald-500">
                          {tribe.stats?.activityLevel === 'high'
                            ? 'Alta'
                            : tribe.stats?.activityLevel === 'medium'
                              ? 'Media'
                              : 'Activa'}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                          Actividad
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {tribe.tags && tribe.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {(tribe.tags || []).slice(0, 3).map((tag, idx) => (
                          <span
                            key={`${tribe._id}-tag-${idx}`}
                            className="px-2.5 py-0.5 bg-muted text-muted-foreground rounded-lg text-xs font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    {/* Creator & Location */}
                    <div className="flex items-center justify-between gap-2 mb-4 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 truncate">
                        <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">
                          {tribe.createdBy?.firstName || tribe.createdBy?.username || 'Comunidad'}{' '}
                          {tribe.createdBy?.lastName || ''}
                        </span>
                      </div>

                      {tribe.location && (tribe.location.address || tribe.location.isVirtual) && (
                        <div className="flex items-center gap-1 shrink-0 max-w-[150px] truncate">
                          {tribe.location.isVirtual ? (
                            <>
                              <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>Virtual</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="truncate">{tribe.location.address}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {tribe.isMember || tribe.canManageRequests ? (
                        <>
                          <button
                            onClick={() =>
                              router.push(
                                tribe.canManageRequests && (tribe.pendingRequestsCount || 0) > 0
                                  ? `/tribes/${tribe._id}?tab=requests`
                                  : `/tribes/${tribe._id}`
                              )
                            }
                            className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
                          >
                            {tribe.canManageRequests && (tribe.pendingRequestsCount || 0) > 0
                              ? `Gestionar (${tribe.pendingRequestsCount})`
                              : 'Entrar a la Tribu'}
                          </button>
                          {!tribe.isAdmin && (
                            <button
                              onClick={() => { void accessActions.run({ tribeId: tribe._id, kind: 'leave' }) }}
                              disabled={Boolean(accessActions.pending)}
                              className="px-3.5 py-2.5 border border-red-500/30 text-red-500 rounded-xl font-semibold text-sm hover:bg-red-500/10 transition-colors disabled:opacity-50"
                            >
                              Salir
                            </button>
                          )}
                        </>
                      ) : <TribeAccessPanel key={`${tribe._id}-${currentUserId}`} compact access={tribe} name={tribe.name} tribeId={tribe._id}
                        authenticated={isAuthenticated} busy={Boolean(accessActions.pending)}
                        onJoin={message => handleJoinClick(tribe, message)} onCancel={() => { void accessActions.run({ tribeId: tribe._id, kind: 'cancel' }) }}
                        error={accessActions.failure?.action.tribeId === tribe._id && !joinRequestTarget ? accessActions.failure.message : undefined}
                        onRetry={() => { void accessActions.retry() }} />}
                      {!tribe.isMember && <Link href={`/tribes/${tribe._id}`} className="inline-flex min-h-11 items-center rounded-xl border border-border px-3 text-sm font-semibold hover:bg-muted">Ver</Link>}

                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {pagination && !isError && !isLoading && pagination.pages > 1 && <nav aria-label="Páginas de comunidades" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm tabular-nums text-muted-foreground">Página {pagination.page} de {pagination.pages} · {pagination.total} comunidades</p>
          <div className="flex gap-2"><button type="button" disabled={isFetching || page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40">Anterior</button>
            <button type="button" disabled={isFetching || page >= pagination.pages} onClick={() => setPage(value => value + 1)} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40">Siguiente</button></div>
        </nav>}

        {joinRequestTarget && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-4 pb-24 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-label={`Solicitar acceso a ${joinRequestTarget.name}`} onKeyDown={handleJoinDialogKeys} className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-card p-2 shadow-xl">
            <div className="flex justify-end px-3 pt-3"><button type="button" autoFocus disabled={Boolean(accessActions.pending)} aria-label="Cerrar solicitud" onClick={() => setJoinRequestTarget(null)} className="min-h-11 rounded-xl border border-border px-4 text-sm focus-visible:ring-2 focus-visible:ring-primary">Cerrar</button></div>
            <TribeAccessPanel key={`${joinRequestTarget._id}-${currentUserId}`} access={joinRequestTarget} name={joinRequestTarget.name} tribeId={joinRequestTarget._id}
              authenticated={isAuthenticated} busy={Boolean(accessActions.pending)} onJoin={message => handleJoinClick(joinRequestTarget, message)}
              onCancel={() => { void accessActions.run({ tribeId: joinRequestTarget._id, kind: 'cancel' }) }}
              error={accessActions.failure?.action.tribeId === joinRequestTarget._id ? accessActions.failure.message : undefined}
              onRetry={() => { void accessActions.retry().then(success => { if (success) setJoinRequestTarget(null) }) }} />
          </div>
        </div>}

        {/* Quick Create Tribe Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card border border-border rounded-3xl p-6 sm:p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-extrabold text-foreground">Crear Nueva Comunidad</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configura tu tribu pública o privada en segundos
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 rounded-full hover:bg-muted text-muted-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-1.5">
                      Nombre de la Comunidad *
                    </label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      placeholder="Ej. Runners Mirador Sur SDQ"
                      className="w-full p-3.5 border border-border bg-background rounded-2xl focus:ring-2 focus:ring-primary text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-foreground mb-1.5">
                      Descripción y Propósito *
                    </label>
                    <textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      placeholder="Describe qué actividades comparten, a quién va dirigida y qué planes organizan..."
                      className="w-full p-3.5 border border-border bg-background rounded-2xl focus:ring-2 focus:ring-primary resize-none text-foreground"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-1.5">
                        Categoría *
                      </label>
                      <select
                        value={createForm.category}
                        onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                        className="w-full p-3.5 border border-border bg-background rounded-2xl focus:ring-2 focus:ring-primary text-foreground"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {CATEGORY_TRANSLATIONS[cat] || cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-foreground mb-1.5">
                        Tipo de Acceso
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCreateForm({ ...createForm, isPublic: true, requiresApproval: false })}
                          className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                            createForm.isPublic
                              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
                              : 'border-border text-muted-foreground'
                          }`}
                        >
                          <Globe className="w-4 h-4" />
                          Pública
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreateForm({ ...createForm, isPublic: false, requiresApproval: true })}
                          className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                            !createForm.isPublic
                              ? 'border-amber-500 bg-amber-500/15 text-amber-500'
                              : 'border-border text-muted-foreground'
                          }`}
                        >
                          <Lock className="w-4 h-4" />
                          Privada
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Live Location Auto-Fill */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-bold text-foreground">
                        Ubicación Base
                      </label>
                      <button
                        type="button"
                        onClick={handleUseMyLiveLocation}
                        className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        Usar mi ubicación GPS actual
                      </button>
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <input
                        type="text"
                        value={createForm.location.address}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            location: { ...createForm.location, address: e.target.value }
                          })
                        }
                        placeholder="Ciudad o punto de encuentro..."
                        className="w-full pl-10 pr-4 py-3 border border-border bg-background rounded-2xl text-sm text-foreground"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {presets.slice(0, 4).map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() =>
                            setCreateForm({
                              ...createForm,
                              location: {
                                address: `${preset.venue}, ${preset.city}`,
                                coordinates: [preset.lng, preset.lat],
                                isVirtual: false
                              }
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/15 hover:text-primary text-xs font-medium transition-colors"
                        >
                          📍 {preset.city}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rules */}
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-1.5">
                      Reglas de Convivencia
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newRule}
                        onChange={(e) => setNewRule(e.target.value)}
                        placeholder="Agregar una regla..."
                        className="flex-1 p-2.5 border border-border bg-background rounded-xl text-sm text-foreground"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRule())}
                      />
                      <button
                        type="button"
                        onClick={handleAddRule}
                        className="px-3.5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {createForm.rules.map((rule, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs bg-muted/60 px-3 py-1.5 rounded-lg"
                        >
                          <span>
                            {idx + 1}. {rule}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCreateForm({
                                ...createForm,
                                rules: createForm.rules.filter((_, i) => i !== idx)
                              })
                            }
                            className="text-muted-foreground hover:text-red-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-1.5">
                      Etiquetas
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Ej. running, networking, musica..."
                        className="flex-1 p-2.5 border border-border bg-background rounded-xl text-sm text-foreground"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-3.5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {createForm.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/15 text-primary rounded-lg text-xs font-semibold"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() =>
                              setCreateForm({
                                ...createForm,
                                tags: createForm.tags.filter((_, i) => i !== index)
                              })
                            }
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3.5 border border-border rounded-2xl font-bold text-sm hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateTribe}
                    disabled={createTribeMutation.isPending}
                    className="flex-1 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm rounded-2xl shadow-lg disabled:opacity-50"
                  >
                    {createTribeMutation.isPending ? 'Creando...' : 'Crear Comunidad'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
