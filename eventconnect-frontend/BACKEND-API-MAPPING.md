# 🔗 Backend API - Mapeo Completo

## 📍 Base URL
```
http://localhost:5000/api
```

## 🔐 AUTENTICACIÓN

### Auth Endpoints (`/auth`)
```typescript
POST   /api/auth/register        // Registrar usuario
POST   /api/auth/login           // Login
POST   /api/auth/logout          // Logout
GET    /api/auth/me              // Obtener usuario actual (protected)
POST   /api/auth/refresh-token   // Refrescar token
POST   /api/auth/forgot-password // Recuperar contraseña
PUT    /api/auth/reset-password  // Resetear contraseña
```

**Register Request:**
```typescript
{
  username: string
  email: string
  password: string (min 8 chars, uppercase, lowercase, number, special char)
  firstName: string
  lastName: string
  acceptTerms: boolean
  interests?: string[]
  bio?: string
  location?: string
}
```

**Login Request:**
```typescript
{
  email: string
  password: string
}
```

**Auth Response:**
```typescript
{
  success: boolean
  token: string
  user: {
    _id: string
    username: string
    email: string
    firstName: string
    lastName: string
    avatar?: string
    level: number
    xp: number
    interests: string[]
  }
}
```

---

## 🎉 EVENTOS

### Events Endpoints (`/events`)
```typescript
GET    /api/events                    // Listar eventos (con filtros)
GET    /api/events/search             // Buscar eventos
GET    /api/events/nearby             // Eventos cercanos (geo)
GET    /api/events/favorites          // Eventos favoritos (protected)
POST   /api/events                    // Crear evento (protected)
GET    /api/events/:id                // Obtener evento por ID
POST   /api/events/:id/attend         // Asistir a evento (protected)
POST   /api/events/:id/join           // Unirse a evento (protected)
POST   /api/events/:id/leave          // Salir de evento (protected)
POST   /api/events/:id/favorite       // Marcar favorito (protected)
GET    /api/events/:id/attendees      // Obtener asistentes
GET    /api/events/:id/comments       // Obtener comentarios
POST   /api/events/:id/comments       // Crear comentario (protected)
DELETE /api/events/:id/comments/:commentId  // Eliminar comentario
POST   /api/events/:id/view           // Registrar vista
POST   /api/events/:id/share          // Registrar compartido
```

**Event Model:**
```typescript
interface Event {
  _id: string
  title: string
  description: string
  category: 'music' | 'sports' | 'technology' | 'food' | 'art' | 'business' | 'education' | 'other'
  date: Date
  endDate?: Date
  location: {
    type: 'Point'
    coordinates: [number, number] // [lng, lat]
    address: string
    venue?: string
  }
  images: Array<{
    url: string
    publicId: string
  }>
  maxAttendees?: number
  attendees: Array<{
    user: string // User ID
    status: 'attending' | 'maybe' | 'not-attending' | 'confirmed' | 'pending'
    joinedAt: Date
  }>
  createdBy: string // User ID
  status: 'draft' | 'published' | 'cancelled' | 'completed'
  isPrivate: boolean
  tags: string[]
  price: {
    amount: number
    currency: string
  }
  attendeesCount: number // virtual
  createdAt: Date
  updatedAt: Date
}
```

---

## 👥 USUARIOS

### Users Endpoints (`/users`)
```typescript
GET    /api/users/profile           // Obtener perfil propio (protected)
PUT    /api/users/profile           // Actualizar perfil (protected)
GET    /api/users/:id               // Obtener usuario por ID
GET    /api/users/:id/events        // Eventos de usuario
POST   /api/users/avatar            // Subir avatar (protected)
```

**User Model:**
```typescript
interface User {
  _id: string
  username: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  bio?: string
  location?: string
  interests: string[]
  level: number
  xp: number
  followers: number
  following: number
  eventsAttended: number
  eventsCreated: number
  createdAt: Date
  updatedAt: Date
}
```

---

## 🔔 NOTIFICACIONES

### Notifications Endpoints (`/notifications`)
```typescript
GET    /api/notifications            // Listar notificaciones (protected)
GET    /api/notifications/unread     // Contar no leídas (protected)
PUT    /api/notifications/:id/read   // Marcar como leída (protected)
PUT    /api/notifications/read-all   // Marcar todas como leídas (protected)
DELETE /api/notifications/:id        // Eliminar notificación (protected)
```

**Notification Model:**
```typescript
interface Notification {
  _id: string
  recipient: string // User ID
  sender?: string // User ID
  type: 'event_invite' | 'new_follower' | 'event_reminder' | 'achievement' |
        'tribe_invite' | 'event_update' | 'like' | 'comment'
  title: string
  message: string
  read: boolean
  data?: any
  createdAt: Date
}
```

---

## 💬 CHAT

### Chat Endpoints (`/chat`)
```typescript
GET    /api/chat/conversations       // Listar conversaciones (protected)
GET    /api/chat/conversations/:id   // Obtener conversación (protected)
POST   /api/chat/conversations       // Crear conversación (protected)
GET    /api/chat/messages/:conversationId  // Mensajes de conversación (protected)
POST   /api/chat/messages            // Enviar mensaje (protected)
DELETE /api/chat/messages/:id        // Eliminar mensaje (protected)
```

**Message Model:**
```typescript
interface Message {
  _id: string
  conversation: string // Conversation ID
  sender: string // User ID
  content: string
  type: 'text' | 'image' | 'file'
  read: boolean
  createdAt: Date
}
```

---

## 🏆 GAMIFICACIÓN

### Gamification Endpoints (`/gamification`)
```typescript
GET    /api/gamification/achievements         // Listar logros disponibles
GET    /api/gamification/user-achievements    // Logros de usuario (protected)
GET    /api/gamification/leaderboard          // Tabla de líderes
POST   /api/gamification/claim/:achievementId // Reclamar logro (protected)
GET    /api/gamification/challenges           // Listar desafíos
POST   /api/gamification/challenges/:id/join  // Unirse a desafío (protected)
```

**Achievement Model:**
```typescript
interface Achievement {
  _id: string
  name: string
  description: string
  icon: string
  xpReward: number
  requirement: {
    type: string
    value: number
  }
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}
```

---

## 👪 TRIBES (Comunidades)

### Tribes Endpoints (`/tribes`)
```typescript
GET    /api/tribes                // Listar tribes
GET    /api/tribes/:id            // Obtener tribe por ID
POST   /api/tribes                // Crear tribe (protected)
PUT    /api/tribes/:id            // Actualizar tribe (protected)
DELETE /api/tribes/:id            // Eliminar tribe (protected)
POST   /api/tribes/:id/join       // Unirse a tribe (protected)
POST   /api/tribes/:id/leave      // Salir de tribe (protected)
GET    /api/tribes/:id/members    // Obtener miembros
GET    /api/tribes/:id/events     // Eventos de tribe
```

**Tribe Model:**
```typescript
interface Tribe {
  _id: string
  name: string
  description: string
  image?: string
  category: string
  members: Array<{
    user: string // User ID
    role: 'admin' | 'moderator' | 'member'
    joinedAt: Date
  }>
  createdBy: string // User ID
  isPrivate: boolean
  createdAt: Date
  updatedAt: Date
}
```

---

## 📊 DASHBOARD & ANALYTICS

### Dashboard Endpoints (`/dashboard`)
```typescript
GET    /api/dashboard/stats       // Estadísticas generales (protected)
GET    /api/dashboard/recent      // Actividad reciente (protected)
GET    /api/dashboard/recommended // Eventos recomendados (protected)
```

### Analytics Endpoints (`/analytics`)
```typescript
GET    /api/analytics/events/:id  // Analytics de evento (protected, owner only)
GET    /api/analytics/overview    // Overview de analytics (protected)
```

---

## 🗺️ MAPAS

### Maps Endpoints (`/maps`)
```typescript
POST   /api/maps/geocode          // Convertir dirección a coordenadas
POST   /api/maps/reverse-geocode  // Convertir coordenadas a dirección
```

---

## 🔍 BÚSQUEDA

### Search Endpoints (`/search`)
```typescript
GET    /api/search/global         // Búsqueda global (eventos, users, tribes)
GET    /api/search/suggestions    // Sugerencias de búsqueda
```

---

## 📱 FEED

### Feed Endpoints (`/feed`)
```typescript
GET    /api/feed                  // Feed personalizado (protected)
GET    /api/feed/trending         // Contenido trending
POST   /api/feed/posts            // Crear post (protected)
```

---

## 👥 FOLLOWS

### Follows Endpoints (`/follows`)
```typescript
POST   /api/follows/:userId       // Seguir usuario (protected)
DELETE /api/follows/:userId       // Dejar de seguir (protected)
GET    /api/follows/followers     // Obtener seguidores (protected)
GET    /api/follows/following     // Obtener seguidos (protected)
```

---

## 📸 UPLOAD

### Upload Endpoints (`/upload`)
```typescript
POST   /api/upload/image          // Subir imagen (protected)
POST   /api/upload/file           // Subir archivo (protected)
DELETE /api/upload/:publicId      // Eliminar archivo (protected)
```

---

## 🎫 TICKETS & PAYMENTS

### Tickets Endpoints (`/tickets`)
```typescript
GET    /api/tickets               // Obtener tickets propios (protected)
POST   /api/tickets/purchase      // Comprar ticket (protected)
GET    /api/tickets/:id           // Obtener ticket por ID (protected)
POST   /api/tickets/:id/validate  // Validar ticket (protected)
```

### Payments Endpoints (`/payments`)
```typescript
POST   /api/payments/create-intent     // Crear intención de pago (protected)
POST   /api/payments/confirm           // Confirmar pago (protected)
GET    /api/payments/history           // Historial de pagos (protected)
```

---

## ⚙️ CONFIGURACIÓN

**Headers requeridos:**
```typescript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {token}', // Para rutas protected
  'X-Client-Version': '1.0.0',
  'X-Client-Platform': 'web'
}
```

**Autenticación:**
- Token JWT en header: `Authorization: Bearer {token}`
- Token se guarda en localStorage: `auth-token`
- Refresh token: `refresh-token`

**Paginación:**
```typescript
?page=1&limit=20
```

**Filtros comunes:**
```typescript
?category=music
?date_from=2024-01-01
?date_to=2024-12-31
?status=published
?search=query
```

**Ordenamiento:**
```typescript
?sort=date
?sort=-createdAt  // descendente
```

---

## 🔄 WebSocket (Real-time)

**URL:** `ws://localhost:5000`

**Eventos:**
- `notification` - Nueva notificación
- `message` - Nuevo mensaje
- `event-update` - Actualización de evento
- `user-online` - Usuario en línea
- `user-offline` - Usuario fuera de línea

---

## 📝 Notas Importantes

1. Todas las rutas `protected` requieren token JWT
2. El backend usa MongoDB
3. Imágenes se suben a Cloudinary
4. Geolocalización usa índices 2dsphere de MongoDB
5. Cache implementado en rutas GET principales
6. Rate limiting activo en auth (50 req/15min)
7. CORS habilitado para desarrollo

---

## 🎯 Prioridad de Conexión

### FASE 1 (Crítico):
1. ✅ Auth (login/register)
2. ✅ Events (listar, crear, obtener por ID)
3. ✅ Users (perfil)

### FASE 2 (Importante):
4. Notifications
5. Dashboard/Analytics
6. Event interactions (attend, favorite)

### FASE 3 (Nice to have):
7. Chat
8. Gamification
9. Tribes
10. Search avanzado
