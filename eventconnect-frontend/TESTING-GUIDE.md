# 🧪 Guía Completa de Testing - Event Connect 2.0

## 🚀 Inicio Rápido

### Servidor Corriendo en:
- **URL Principal**: http://localhost:3005
- **Aplicación Rediseñada**: http://localhost:3005/redesign

---

## 📱 Testing Versión MÓVIL

### Paso 1: Acceder a la Aplicación
1. Abrir http://localhost:3005/redesign en el navegador
2. Verás la pantalla de autenticación (Auth)

### Paso 2: Login
- **Email**: Cualquier email (ej: test@example.com)
- **Password**: Cualquier password
- Click en "Iniciar Sesión" o "Registrarse"

### Paso 3: Activar Vista Móvil
1. Una vez autenticado, busca el botón en la esquina superior izquierda
2. Dice "🖥️ Desktop" - haz click
3. Se cambiará a "📱 Mobile"
4. La interfaz completa cambiará a versión móvil

### Paso 4: Probar Componentes Móviles

#### ✅ Navegación Inferior (Tab Bar)
- **Home** (🏠) - Hero Section móvil con eventos destacados
- **Eventos** (📅) - Dashboard de eventos en formato móvil
- **Mapa** (🗺️) - Mapa interactivo móvil
- **Chat** (💬) - Sistema de mensajería móvil
- **Perfil** (👤) - Perfil de usuario móvil

#### ✅ Funcionalidades Móviles:
- **Swipe**: Desliza entre vistas con animaciones
- **Header Dinámico**: Muestra hora actual y batería
- **Notificaciones**: Bell icon arriba a la derecha
- **Búsqueda**: Lupa en el header
- **Menú Hamburguesa**: Acceso a más opciones

#### ✅ Componentes a Probar:
1. **MobileHeroSection** - Carrusel de eventos destacados
2. **MobileDashboard** - Lista de eventos con filtros
3. **MobileEventDetail** - Detalle completo del evento
4. **MobileMapView** - Mapa con pins de eventos
5. **MobileChat** - Chat con conversaciones
6. **MobileGamification** - Logros y recompensas
7. **MobileProfile** - Perfil con stats y logros
8. **MobileTribes** - Comunidades y grupos

---

## 💻 Testing Versión WEB (Desktop)

### Paso 1: Volver a Desktop
1. Estando en vista móvil, click en "📱 Mobile"
2. Se cambiará a "🖥️ Desktop"
3. La interfaz volverá a versión desktop

### Paso 2: Navegación Desktop

#### ✅ Menú Lateral Izquierdo:
- **Inicio** (🏠) - Hero section
- **Eventos** (📅) - Dashboard principal
- **Mapa** (🗺️) - Vista de mapa
- **Tribes** (👥) - Comunidades
- **Chat** (💬) - Mensajería
- **Logros** (🏆) - Gamificación
- **Estadísticas** (📊) - Stats de organizador
- **Perfil** (👤) - Perfil de usuario

#### ✅ Componentes Desktop a Probar:
1. **Navigation** - Menú lateral con animaciones
2. **Dashboard** - Grid de eventos con filtros
3. **EventDetail** - Modal/página de detalle
4. **MapView** - Mapa interactivo full screen
5. **Tribes** - Sistema de comunidades
6. **Chat** - Chat desktop con sidebar
7. **Gamification** - Panel de logros
8. **OrganizerStats** - Estadísticas y analytics
9. **Profile** - Perfil completo
10. **Settings** - Configuración de usuario

#### ✅ Elementos UI Desktop:
- **Panel de Notificaciones**: Click en Bell (🔔) arriba
- **FAB Button**: Botón flotante en eventos (🎵)
- **Hover Effects**: Efectos de elevación al pasar mouse
- **Glassmorphism**: Efectos de blur en cards
- **Neon Glows**: Brillos en botones y elementos

---

## 🎨 Testing Efectos Visuales

### Efectos a Verificar:

#### 1. **Glassmorphism** (.glass-card)
- Cards con efecto blur
- Transparencia con backdrop-filter
- Bordes sutiles blancos

#### 2. **Neon Glows**
- `.neon-glow-violet` - Brillo violeta
- `.neon-glow-blue` - Brillo azul
- `.neon-glow-pink` - Brillo rosa
- Visibles en botones principales

#### 3. **Gradientes Animados** (.animated-bg)
- Fondo con gradiente que se mueve
- Animación suave de 8 segundos
- Colores: violeta, cyan, magenta

#### 4. **Partículas de Fondo** (.particle-bg)
- Partículas flotantes animadas
- Movimiento sutil arriba/abajo
- Colores degradados

#### 5. **Hover Effects** (.hover-lift)
- Elevación al pasar mouse
- Sombra incrementada
- Transición suave

---

## 🔐 Testing Autenticación

### Flujo Completo:

1. **Login**
   - Email: test@example.com
   - Password: 123456
   - Verificar que se guarda sesión

2. **Registro**
   - Click en "Registrarse"
   - Llenar formulario
   - Marcar como nuevo usuario
   - Debe mostrar Onboarding

3. **Onboarding** (Nuevos Usuarios)
   - Paso 1: Intereses (seleccionar al menos 3)
   - Paso 2: Ubicación y preferencias
   - Paso 3: Notificaciones
   - Al completar → Dashboard

4. **Logout**
   - Click en Settings
   - Cerrar sesión
   - Debe volver a Auth

---

## 🗺️ Testing Funcionalidades Específicas

### Dashboard
- [ ] Ver lista de eventos
- [ ] Filtrar por categoría
- [ ] Buscar eventos
- [ ] Click en evento → Ver detalle
- [ ] Like/Unlike eventos
- [ ] Share evento

### Mapa
- [ ] Ver pins de eventos
- [ ] Click en pin → Info popup
- [ ] Zoom in/out
- [ ] Pan/arrastrar mapa
- [ ] Filtrar eventos en mapa
- [ ] Ver eventos cercanos

### Chat
- [ ] Ver lista de conversaciones
- [ ] Abrir conversación
- [ ] Enviar mensaje
- [ ] Ver mensajes en tiempo real
- [ ] Buscar conversaciones
- [ ] Ver perfiles de contactos

### Gamificación
- [ ] Ver logros desbloqueados
- [ ] Ver progreso de logros
- [ ] Ver nivel actual y XP
- [ ] Ver tabla de líderes
- [ ] Reclamar recompensas
- [ ] Ver insignias

### Tribes (Comunidades)
- [ ] Ver lista de tribes
- [ ] Unirse a tribe
- [ ] Crear nuevo tribe
- [ ] Ver miembros
- [ ] Ver eventos de tribe
- [ ] Chat de tribe

### Perfil
- [ ] Ver información personal
- [ ] Editar perfil
- [ ] Cambiar avatar
- [ ] Ver estadísticas
- [ ] Ver eventos asistidos
- [ ] Ver logros

### Notificaciones
- [ ] Ver lista de notificaciones
- [ ] Marcar como leída
- [ ] Marcar todas como leídas
- [ ] Filtrar por tipo
- [ ] Eliminar notificación
- [ ] Acciones directas (aceptar invitación)

---

## 🎯 Checklist de Verificación

### Funcionalidad General
- [x] Servidor corriendo sin errores
- [x] Página principal carga (/)
- [x] Página redesign carga (/redesign)
- [x] Autenticación funciona
- [x] Toggle Desktop/Mobile funciona
- [x] Navegación entre vistas funciona
- [x] Notificaciones se muestran
- [x] UserContext mantiene estado

### Componentes Web (Desktop)
- [x] Navigation - Menú lateral
- [x] Dashboard - Grid de eventos
- [x] EventDetail - Vista detallada
- [x] MapView - Mapa interactivo
- [x] Tribes - Sistema de comunidades
- [x] Chat - Mensajería
- [x] Gamification - Logros
- [x] OrganizerStats - Estadísticas
- [x] Profile - Perfil
- [x] Settings - Configuración
- [x] Auth - Login/Register
- [x] Onboarding - Bienvenida
- [x] Notifications - Panel notificaciones

### Componentes Móviles
- [x] MobileApp - App container
- [x] MobileHeroSection - Hero móvil
- [x] MobileDashboard - Dashboard móvil
- [x] MobileEventDetail - Detalle móvil
- [x] MobileMapView - Mapa móvil
- [x] MobileChat - Chat móvil
- [x] MobileGamification - Logros móvil
- [x] MobileProfile - Perfil móvil
- [x] MobileTribes - Tribes móvil

### UI Components (47 Shadcn)
- [x] Todos los componentes UI instalados
- [x] Imports corregidos (sin versiones)
- [x] Estilos aplicados correctamente

### Efectos Visuales
- [x] Glassmorphism activo
- [x] Neon glows funcionan
- [x] Gradientes animados
- [x] Partículas de fondo
- [x] Hover effects
- [x] Transiciones suaves

---

## 🐛 Troubleshooting

### Si la página no carga:
```bash
# Verificar servidor
curl -I http://localhost:3005

# Si no responde, reiniciar
cd "eventconnect-frontend"
npm run dev
```

### Si hay errores de módulos:
```bash
# Reinstalar dependencias
npm install

# Limpiar caché
rm -rf .next
npm run dev
```

### Si el toggle móvil no funciona:
1. Verificar que estás autenticado
2. Refrescar la página (F5)
3. Verificar consola del navegador

### Si los estilos no se aplican:
1. Verificar que globals.css está importado
2. Limpiar caché del navegador
3. Verificar que Tailwind está compilando

---

## 📊 Datos de Prueba

### Usuarios de Ejemplo:
- Email: test@example.com
- Password: cualquier cosa

### Eventos Precargados:
- Festival Cosmic - Música
- Digital Art Workshop - Arte
- Tech Meetup - Tecnología
- Food Festival - Gastronomía

### Notificaciones Ejemplo:
- 8 notificaciones de diferentes tipos
- Invitaciones a eventos
- Nuevos seguidores
- Logros desbloqueados

### Logros Disponibles:
- Social Butterfly - 5 eventos asistidos
- Early Bird - 10 eventos early access
- Event Master - Crear 5 eventos
- Community Leader - 100 seguidores

---

## ✅ Criterios de Éxito

### La aplicación funciona correctamente si:
1. ✅ Ambas rutas (/ y /redesign) cargan sin errores
2. ✅ El toggle Desktop/Mobile cambia la interfaz completamente
3. ✅ Todos los componentes móviles (8) se renderizan
4. ✅ Todos los componentes desktop (13) se renderizan
5. ✅ La navegación entre vistas funciona
6. ✅ Los efectos visuales se aplican correctamente
7. ✅ No hay errores en consola del navegador
8. ✅ La autenticación mantiene el estado
9. ✅ Las notificaciones se muestran
10. ✅ El diseño es responsive

---

## 🎉 Testing Exitoso!

Si todos los checkpoints están marcados ✅, la migración está **100% completa y funcional**.

### URLs Finales:
- **Web Desktop**: http://localhost:3005/redesign (luego login, usar Desktop)
- **Mobile**: http://localhost:3005/redesign (luego login, cambiar a Mobile)
- **Hero Principal**: http://localhost:3005

---

**¡Disfruta probando la nueva aplicación Event Connect 2.0!** 🎊
