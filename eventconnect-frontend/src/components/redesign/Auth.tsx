import { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, User, Calendar, MapPin, Star, ArrowRight, Loader2 , Sparkles} from 'lucide-react'

// Alias for Sparkles (not available in lucide-react 0.408.0)
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Checkbox } from './ui/checkbox'
import { Badge } from './ui/badge'
import { authService } from '@/lib/api/services'
import type { User as UserType } from '@/types/models'
import toast from 'react-hot-toast'

interface AuthProps {
  onLogin: (userData: UserType) => void
}

export function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    username: '',
    location: '',
    interests: [] as string[],
    agreeTerms: false
  })

  const interests = [
    'Música', 'Tecnología', 'Arte', 'Gaming', 'Gastronomía', 
    'Fitness', 'Fotografía', 'Cine', 'Literatura', 'Viajes',
    'Startup', 'Design', 'Crypto', 'Fashion', 'Sostenibilidad'
  ]

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isLogin) {
        // Login con backend real
        const response = await authService.login({
          email: formData.email,
          password: formData.password,
        })

        if (response.success && response.user) {
          toast.success('¡Bienvenido de vuelta!')
          onLogin(response.user)
        }
      } else {
        // Registro con backend real
        const [firstName, ...lastNameParts] = formData.firstName.split(' ')
        const lastName = lastNameParts.join(' ') || formData.lastName

        const response = await authService.register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          firstName: firstName || formData.firstName,
          lastName: lastName || 'User',
          acceptTerms: formData.agreeTerms,
          interests: formData.interests,
          location: formData.location,
        })

        if (response.success && response.user) {
          toast.success('¡Cuenta creada exitosamente!')
          onLogin(response.user)
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Error de autenticación'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const demoLogin = async () => {
    setIsLoading(true)

    try {
      // Intentar login demo con backend real
      const response = await authService.login({
        email: 'demo@eventconnect.com',
        password: 'Demo1234!',
      })

      if (response.success && response.user) {
        toast.success('¡Bienvenido, usuario demo!')
        onLogin(response.user)
      }
    } catch (error) {
      console.error('Demo login failed:', error)
      toast.error('Error al iniciar sesión. Verifica la conexión con el backend.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0C0B10] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 particle-bg">
        <div className="absolute inset-0 animated-bg opacity-20"></div>
      </div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 rounded-full bg-gradient-to-r from-violet-500/30 to-blue-500/30 blur-xl"></div>
      <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full bg-gradient-to-r from-pink-500/30 to-violet-500/30 blur-xl"></div>
      <div className="absolute top-1/2 left-1/4 w-16 h-16 rounded-full bg-gradient-to-r from-blue-500/30 to-pink-500/30 blur-xl"></div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-block p-4 rounded-full glass-card mb-4">
              <Sparkles className="w-8 h-8 text-violet-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Event Connect 2.0</h1>
            <p className="text-white/70">
              {isLogin ? 'Bienvenido de vuelta' : 'Únete a la revolución social'}
            </p>
          </div>

          {/* Auth Form */}
          <Card className="glass-card p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Toggle */}
              <div className="flex space-x-1 p-1 rounded-lg bg-white/5">
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                    isLogin 
                      ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white' 
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                    !isLogin 
                      ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white' 
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Registrarse
                </button>
              </div>

              {/* Form Fields */}
              {!isLogin && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-white/80">Nombre</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
                        <Input
                          id="firstName"
                          placeholder="Tu nombre"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/60"
                          required={!isLogin}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-white/80">Apellido</Label>
                      <Input
                        id="lastName"
                        placeholder="Tu apellido"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/60"
                        required={!isLogin}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-white/80">Usuario</Label>
                    <Input
                      id="username"
                      placeholder="@usuario"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/60"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/60"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/80">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pl-10 pr-10 bg-white/5 border-white/20 text-white placeholder:text-white/60"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-white/80">Ubicación</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
                      <Input
                        id="location"
                        placeholder="Tu ciudad"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/60"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-white/80">Intereses (selecciona al menos 3)</Label>
                    <div className="flex flex-wrap gap-2">
                      {interests.map((interest) => (
                        <Badge
                          key={interest}
                          variant={formData.interests.includes(interest) ? "default" : "outline"}
                          className={`cursor-pointer transition-colors ${
                            formData.interests.includes(interest)
                              ? 'bg-violet-500/20 text-violet-300 border-violet-500/50'
                              : 'border-white/20 text-white/70 hover:bg-white/10'
                          }`}
                          onClick={() => toggleInterest(interest)}
                        >
                          {interest}
                        </Badge>
                      ))}
                    </div>
                    {formData.interests.length > 0 && (
                      <p className="text-xs text-white/60">
                        {formData.interests.length} intereses seleccionados
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={formData.agreeTerms}
                      onCheckedChange={(checked) => handleInputChange('agreeTerms', checked)}
                      className="border-white/20"
                    />
                    <Label htmlFor="terms" className="text-white/70 text-sm">
                      Acepto los términos y condiciones
                    </Label>
                  </div>
                </>
              )}

              {isLogin && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" className="border-white/20" />
                    <Label htmlFor="remember" className="text-white/70 text-sm">
                      Recordarme
                    </Label>
                  </div>
                  <button
                    type="button"
                    className="text-violet-400 hover:text-violet-300 text-sm"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 h-12"
                disabled={isLoading || (!isLogin && (!formData.agreeTerms || formData.interests.length < 3))}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isLogin ? 'Iniciando sesión...' : 'Creando cuenta...'}
                  </>
                ) : (
                  <>
                    {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Demo Login */}
            <div className="mt-6 pt-6 border-white/10">
              <Button
                onClick={demoLogin}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  'Probar con cuenta demo'
                )}
              </Button>
            </div>

            {/* Social Login */}
            <div className="mt-6 space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#0C0B10] px-2 text-white/60">O continúa con</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </Button>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                  Twitter
                </Button>
              </div>
            </div>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 text-white/60 text-sm">
            <p>© 2024 Event Connect 2.0. Conectando el futuro de los eventos.</p>
          </div>
        </div>
      </div>
    </div>
  )
}