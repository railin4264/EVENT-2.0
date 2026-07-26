# 🧹 PLAN DE LIMPIEZA - Diseño Único y Funcional

## ✅ COMPLETADO

1. ✅ Eliminada carpeta `/mobile` con 8 componentes móviles
2. ✅ Eliminado componente `MobileApp.tsx`
3. ✅ Removido toggle Desktop/Mobile de `/redesign/page.tsx`
4. ✅ Removida toda lógica móvil (isMobileView, etc.)
5. ✅ Servidor limpio corriendo en http://localhost:3006

## 🎯 SIGUIENTE: Remover Mock Data y Preparar para Backend

### Componentes a Limpiar (en orden):

#### 1. Dashboard.tsx
- [ ] Remover array de eventos mock
- [ ] Crear interfaz para datos del backend
- [ ] Agregar hooks para fetch de API
- [ ] Agregar estados de loading/error

#### 2. EventDetail.tsx
- [ ] Remover datos mock del evento
- [ ] Recibir evento desde props o API
- [ ] Agregar loading state

#### 3. Notifications.tsx
- [ ] Remover array de notificaciones mock
- [ ] Conectar a API de notificaciones
- [ ] Real-time con WebSocket/SSE

#### 4. Chat.tsx
- [ ] Remover conversaciones mock
- [ ] Conectar a API de mensajes
- [ ] WebSocket para tiempo real

#### 5. Tribes.tsx
- [ ] Remover tribes mock
- [ ] API para listar/crear tribes

#### 6. Profile.tsx
- [ ] Remover datos de usuario mock
- [ ] Usar UserContext con datos reales
- [ ] API para actualizar perfil

#### 7. Gamification.tsx
- [ ] Remover logros mock
- [ ] API para sistema de logros

#### 8. OrganizerStats.tsx
- [ ] Remover estadísticas mock
- [ ] API para analytics

#### 9. MapView.tsx
- [ ] Usar eventos reales del backend
- [ ] Geolocalización real

#### 10. Settings.tsx
- [ ] Conectar a API de usuario
- [ ] Guardar preferencias en DB

#### 11. Auth.tsx
- [ ] Conectar a API de autenticación
- [ ] JWT tokens
- [ ] Refresh tokens

#### 12. Onboarding.tsx
- [ ] Guardar preferencias en backend
- [ ] Update user profile

## 📁 Estructura de API a Crear

```
src/
├── lib/
│   ├── api/
│   │   ├── client.ts          # Axios/Fetch configurado
│   │   ├── auth.ts             # Login, Register, Logout
│   │   ├── events.ts           # CRUD eventos
│   │   ├── users.ts            # Perfil, update
│   │   ├── tribes.ts           # Comunidades
│   │   ├── chat.ts             # Mensajes
│   │   ├── notifications.ts    # Notificaciones
│   │   └── gamification.ts     # Logros, XP
│   │
│   └── hooks/
│       ├── useAuth.ts
│       ├── useEvents.ts
│       ├── useNotifications.ts
│       ├── useChat.ts
│       └── ...
```

## 🔧 Variables de Entorno

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_GOOGLE_MAPS_KEY=...
```

## 🎨 Mantener Diseño, Mejorar Funcionalidad

- ✅ Hero Section - PERFECTO, no tocar
- ✅ Efectos visuales - Mantener
- ✅ UI Components - Mantener
- ✅ Navegación - Mantener diseño
- 🔄 Datos - Reemplazar mock por API
- 🔄 Estados - Agregar loading/error
- 🔄 Validaciones - Formularios reales
- 🔄 Responsive - Mejorar mobile-first

## 📝 Orden de Implementación

### FASE 1: API Layer (30 min)
1. Crear estructura de carpetas
2. Configurar axios/fetch client
3. Crear hooks básicos

### FASE 2: Auth Real (20 min)
1. Conectar Auth.tsx a backend
2. Implementar JWT storage
3. Actualizar UserContext

### FASE 3: Eventos (30 min)
1. Dashboard con datos reales
2. EventDetail desde API
3. CRUD completo

### FASE 4: Features (40 min)
1. Notificaciones reales
2. Chat básico
3. Tribes desde DB
4. Profile editable

### FASE 5: Polish (20 min)
1. Loading states
2. Error handling
3. Validaciones
4. Responsive final

## ✨ Resultado Final

- Un solo diseño limpio (Desktop responsive)
- Sin datos mock
- Conectado a backend real
- Estados de carga profesionales
- Manejo de errores robusto
- Listo para producción

---

**INICIO:** Ahora
**OBJETIVO:** Aplicación profesional lista para backend real
