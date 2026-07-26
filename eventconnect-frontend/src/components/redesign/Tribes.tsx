import { useState, useEffect } from 'react'
import { Search, Plus, Users, MessageCircle, Crown, Star, TrendingUp, Filter, Loader2 } from 'lucide-react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { CldImage } from 'next-cloudinary'
import { tribesService } from '@/lib/api/services/tribes.service'
import { useAuth } from '@/lib/providers/AuthProvider'
import toast from 'react-hot-toast'

interface Tribe {
  _id: string
  name: string
  description: string
  image?: string
  category: string
  members: string[]
  membersCount: number
  createdBy: string
  isPrivate: boolean
  createdAt: Date
  updatedAt: Date
}

export function Tribes() {
  const { user } = useAuth()
  const [myTribes, setMyTribes] = useState<Tribe[]>([])
  const [allTribes, setAllTribes] = useState<Tribe[]>([])
  const [isLoadingMyTribes, setIsLoadingMyTribes] = useState(true)
  const [isLoadingAllTribes, setIsLoadingAllTribes] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todas')

  const categories = ["Todas", "Tecnología", "Música", "Arte", "Gastronomía", "Gaming", "Bienestar", "Lifestyle"]

  useEffect(() => {
    loadMyTribes()
    loadAllTribes()
  }, [])

  useEffect(() => {
    if (selectedCategory !== 'Todas') {
      loadAllTribes(selectedCategory)
    } else {
      loadAllTribes()
    }
  }, [selectedCategory])

  const loadMyTribes = async () => {
    if (!user) {
      setMyTribes([])
      setIsLoadingMyTribes(false)
      return
    }

    setIsLoadingMyTribes(true)
    try {
      const response = await tribesService.getTribes()
      if (response.success && response.data) {
        // Filter tribes where user is a member
        const userTribes = response.data.filter(tribe =>
          tribe.members.includes(user._id)
        )
        setMyTribes(userTribes)
      }
    } catch (error) {
      console.error('Error loading my tribes:', error)
      toast.error('Error al cargar tus tribes. Verifica la conexión con el backend.')
      setMyTribes([])
    } finally {
      setIsLoadingMyTribes(false)
    }
  }

  const loadAllTribes = async (category?: string) => {
    setIsLoadingAllTribes(true)
    try {
      const params: { category?: string; search?: string } = {}
      if (category) params.category = category
      if (searchQuery) params.search = searchQuery

      const response = await tribesService.getTribes(params)
      if (response.success && response.data) {
        setAllTribes(response.data)
      }
    } catch (error) {
      console.error('Error loading tribes:', error)
      toast.error('Error al cargar tribes')
      setAllTribes([])
    } finally {
      setIsLoadingAllTribes(false)
    }
  }

  const handleJoinTribe = async (tribeId: string) => {
    try {
      await tribesService.joinTribe(tribeId)
      toast.success('Te has unido a la tribe')
      loadMyTribes()
      loadAllTribes()
    } catch (error) {
      console.error('Error joining tribe:', error)
      toast.error('Error al unirse a la tribe')
    }
  }

  const handleLeaveTribe = async (tribeId: string) => {
    try {
      await tribesService.leaveTribe(tribeId)
      toast.success('Has salido de la tribe')
      loadMyTribes()
      loadAllTribes()
    } catch (error) {
      console.error('Error leaving tribe:', error)
      toast.error('Error al salir de la tribe')
    }
  }

  const handleSearch = () => {
    loadAllTribes(selectedCategory !== 'Todas' ? selectedCategory : undefined)
  }

  const isUserMember = (tribe: Tribe) => {
    if (!user) return false
    return tribe.members.includes(user._id)
  }

  const isUserOwner = (tribe: Tribe) => {
    if (!user) return false
    return tribe.createdBy === user._id
  }

  const filteredDiscoverTribes = allTribes.filter(tribe => !isUserMember(tribe))
  const trendingTribes = allTribes.slice(0, 10).sort((a, b) => b.membersCount - a.membersCount)

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-white/70">Inicia sesión para ver tribes</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Tribes</h1>
          <p className="text-white/70">Conecta con comunidades que comparten tus pasiones</p>
        </div>
        <Button className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Crear Tribe
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="glass-card p-6">
        <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
            <Input
              placeholder="Buscar tribes por nombre o intereses..."
              className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/60"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
            />
          </div>
          <div className="flex space-x-2 overflow-x-auto">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={category === selectedCategory ? "default" : "outline"}
                className={`cursor-pointer whitespace-nowrap ${category === selectedCategory
                    ? "bg-violet-500/20 text-violet-300 border-violet-500/50"
                    : "border-white/20 text-white/70 hover:bg-white/10"
                  }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            onClick={handleSearch}
          >
            <Filter className="w-4 h-4 mr-2" />
            Buscar
          </Button>
        </div>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="my-tribes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 glass-card">
          <TabsTrigger value="my-tribes">Mis Tribes</TabsTrigger>
          <TabsTrigger value="discover">Descubrir</TabsTrigger>
          <TabsTrigger value="trending">Tendencias</TabsTrigger>
        </TabsList>

        <TabsContent value="my-tribes">
          {isLoadingMyTribes ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-12 h-12 animate-spin text-violet-500" />
            </div>
          ) : myTribes.length === 0 ? (
            <Card className="glass-card p-12 text-center">
              <p className="text-white/60 mb-4">No estás en ninguna tribe aún</p>
              <Button
                className="bg-gradient-to-r from-violet-600 to-blue-600"
                onClick={() => document.querySelector<HTMLButtonElement>('[value="discover"]')?.click()}
              >
                Descubrir Tribes
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Tus comunidades ({myTribes.length})</h3>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {myTribes.map((tribe) => (
                  <Card key={tribe._id} className="glass-card overflow-hidden hover-lift">
                    <div className="relative">
                      {tribe.image && tribe.image.includes('res.cloudinary.com') ? (
                        <CldImage
                          src={tribe.image}
                          alt={tribe.name}
                          width={400}
                          height={200}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <ImageWithFallback
                          src={tribe.image || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1080'}
                          alt={tribe.name}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                      {/* Tribe Info Overlay */}
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className="bg-violet-500/20 text-violet-300">{tribe.category}</Badge>
                          {isUserOwner(tribe) && (
                            <Badge className="bg-yellow-500/20 text-yellow-400">
                              <Crown className="w-3 h-3 mr-1" />
                              Fundador
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-white font-bold text-lg mb-1">{tribe.name}</h3>
                        <p className="text-white/80 text-sm">{tribe.description}</p>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-white/70">
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>{tribe.membersCount.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          {!isUserOwner(tribe) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                              onClick={() => handleLeaveTribe(tribe._id)}
                            >
                              Salir
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="discover">
          {isLoadingAllTribes ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-12 h-12 animate-spin text-violet-500" />
            </div>
          ) : filteredDiscoverTribes.length === 0 ? (
            <Card className="glass-card p-12 text-center">
              <p className="text-white/60">No hay tribes disponibles</p>
            </Card>
          ) : (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white">Tribes recomendadas para ti</h3>

              <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredDiscoverTribes.map((tribe) => (
                  <Card key={tribe._id} className="glass-card overflow-hidden hover-lift">
                    {tribe.image && tribe.image.includes('res.cloudinary.com') ? (
                      <CldImage
                        src={tribe.image}
                        alt={tribe.name}
                        width={400}
                        height={160}
                        className="w-full h-40 object-cover"
                      />
                    ) : (
                      <ImageWithFallback
                        src={tribe.image || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1080'}
                        alt={tribe.name}
                        className="w-full h-40 object-cover"
                      />
                    )}

                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-white font-bold mb-1">{tribe.name}</h4>
                          <Badge className="bg-violet-500/20 text-violet-300 text-xs">{tribe.category}</Badge>
                        </div>
                      </div>

                      <p className="text-white/70 text-sm mb-4">{tribe.description}</p>

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4 text-white/60 text-sm">
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>{tribe.membersCount.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
                        onClick={() => handleJoinTribe(tribe._id)}
                      >
                        Unirse
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trending">
          {isLoadingAllTribes ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-12 h-12 animate-spin text-violet-500" />
            </div>
          ) : trendingTribes.length === 0 ? (
            <Card className="glass-card p-12 text-center">
              <p className="text-white/60">No hay tribes en tendencia</p>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-orange-400" />
                <h3 className="text-xl font-bold text-white">Tribes en tendencia</h3>
              </div>

              <div className="grid gap-4">
                {trendingTribes.map((tribe, index) => {
                  const isMember = isUserMember(tribe)

                  return (
                    <Card key={tribe._id} className="glass-card p-6 hover-lift">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold">
                          {index + 1}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-white font-bold">{tribe.name}</h4>
                            <Badge className="bg-violet-500/20 text-violet-300">{tribe.category}</Badge>
                          </div>
                          <p className="text-white/70 text-sm">{tribe.description}</p>
                        </div>

                        <div className="text-right">
                          <div className="text-white font-medium">{tribe.membersCount.toLocaleString()}</div>
                          <div className="text-white/60 text-sm">miembros</div>
                        </div>

                        {isMember ? (
                          <Badge className="bg-green-500/20 text-green-400">Miembro</Badge>
                        ) : (
                          <Button
                            className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
                            onClick={() => handleJoinTribe(tribe._id)}
                          >
                            Unirse
                          </Button>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
