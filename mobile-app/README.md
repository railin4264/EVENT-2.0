# EventConnect Mobile App

Una aplicación móvil moderna para descubrir y conectarse con eventos y comunidades locales.

## 🚀 Características

- **Autenticación completa** con JWT y refresh tokens
- **Navegación moderna** con React Navigation 6
- **Tema dinámico** con soporte para modo claro/oscuro
- **Notificaciones push** con Expo Notifications
- **Gestión de estado** con Zustand y React Query
- **TypeScript** para mayor seguridad de tipos
- **Testing** con Jest y React Native Testing Library
- **Linting y formateo** con ESLint y Prettier

## 🛠️ Tecnologías

- **React Native** 0.74.5
- **Expo SDK** 51
- **TypeScript** 5.3.3
- **React Navigation** 6
- **React Query** (TanStack Query) 5
- **Zustand** para gestión de estado
- **React Hook Form** con validación Zod
- **Expo Notifications** para push notifications
- **React Native Maps** para geolocalización
- **Expo Camera** para captura de fotos

## 📱 Instalación

### Prerrequisitos

- Node.js 18+
- npm o yarn
- Expo CLI
- Android Studio (para Android)
- Xcode (para iOS)

### Pasos

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd mobile-app
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env.local
   # Las variables ya están configuradas para desarrollo local
   ```

4. **Asegurate que el backend esté corriendo**
   ```bash
   # En el directorio raíz del proyecto
   cd ../backend-api && npm run dev
   ```

5. **Iniciar el servidor de desarrollo móvil**
   ```bash
   # Volver al directorio mobile-app
   cd ../mobile-app
   npm start
   ```

6. **Opciones de desarrollo**
   - Presiona `i` para iOS Simulator
   - Presiona `a` para Android Emulator
   - Presiona `w` para Web
   - Escanea el código QR con Expo Go para dispositivo físico

## 🏗️ Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
├── contexts/           # Contextos de React
├── hooks/              # Hooks personalizados
├── navigation/         # Configuración de navegación
├── screens/            # Pantallas de la aplicación
├── services/           # Servicios de API
├── store/              # Estado global (Zustand)
├── types/              # Definiciones de TypeScript
├── utils/              # Utilidades
└── constants/          # Constantes de la aplicación
```

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests en modo watch
npm run test:watch

# Coverage
npm run test:coverage
```

## 📝 Linting y Formateo

```bash
# Linting
npm run lint

# Linting con fix automático
npm run lint:fix

# Formateo
npm run format

# Verificar formateo
npm run format:check
```

## 🚀 Build y Deploy

### Desarrollo

```bash
# Iniciar en Android
npm run android

# Iniciar en iOS
npm run ios

# Iniciar en web
npm run web
```

### Producción

```bash
# Build para Android
npm run build:android

# Build para iOS
npm run build:ios

# Submit a stores
npm run submit:android
npm run submit:ios
```

## 🔧 Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
API_BASE_URL=http://localhost:5000/api
SOCKET_URL=http://localhost:5000
```

### Configuración de Notificaciones

Para configurar notificaciones push, necesitarás:

1. Configurar Expo Push Notifications
2. Obtener un token de Expo
3. Configurar el backend para enviar notificaciones

## 📱 Características de la App

### Autenticación
- Login/Registro con validación
- JWT tokens con refresh automático
- Logout seguro
- Recuperación de contraseña

### Eventos
- Lista de eventos con filtros
- Detalle de eventos
- Crear/editar eventos
- Unirse/salir de eventos
- Búsqueda avanzada

### Tribus
- Lista de tribus
- Detalle de tribus
- Crear/editar tribus
- Unirse/salir de tribus
- Chat de tribus

### Perfil
- Perfil de usuario
- Editar perfil
- Configuraciones
- Notificaciones

### Mapa
- Eventos cercanos
- Geolocalización
- Filtros por distancia

## 🎨 Temas

La aplicación soporta temas claro y oscuro con cambio automático basado en las preferencias del sistema.

## 🔔 Notificaciones

- Notificaciones push
- Notificaciones in-app
- Configuración de preferencias
- Historial de notificaciones

## 📊 Performance

- Lazy loading de componentes
- Optimización de imágenes
- Caché inteligente
- Bundle splitting

## 🧪 Testing

- Unit tests con Jest
- Integration tests
- E2E tests con Detox
- Coverage reports

## 📈 Analytics

- Event tracking
- User behavior
- Performance metrics
- Error tracking

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Si tienes problemas o preguntas:

1. Revisa la documentación
2. Busca en los issues existentes
3. Crea un nuevo issue
4. Contacta al equipo de desarrollo

## 🗺️ Roadmap

- [ ] Modo offline
- [ ] Sincronización en tiempo real
- [ ] Integración con calendarios
- [ ] Chat de voz
- [ ] Streaming de eventos
- [ ] Integración con redes sociales
- [ ] Sistema de recomendaciones con IA
- [ ] Gamificación avanzada


























