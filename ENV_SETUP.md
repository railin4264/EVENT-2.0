# Configuración de Entorno (Environment Vatiables) - EVENT NOW 2.0

Para desplegar la aplicación en un entorno de producción o local, necesitas configurar correctamente las variables de entorno en los 3 componentes del sistema: **Backend**, **Frontend**, y **Mobile App**.

A continuación se detallan las variables requeridas y recomendadas para lograr un setup de producción "ready to go".

---

## 1. Backend API (`backend-api/.env`)
Crea un archivo `.env` o `.env.production` en la carpeta `backend-api`.

```env
# Servidor
PORT=5000
NODE_ENV=production

# Base de Datos
MOUSE_URI=mongodb+srv://<usuario>:<password>@cluster.mongodb.net/eventconnect?retryWrites=true&w=majority
REDIS_URL=redis://localhost:6379

# Seguridad & JWT
JWT_SECRET=tu_jwt_secret_largo_y_seguro_min_64_chars # Generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=tu_refresh_secret_largo
JWT_REFRESH_EXPIRES_IN=30d

# CORS (Frontend URLs autorizadas)
CORS_ORIGIN=https://tu-dominio-frontend.com,https://www.tu-dominio-frontend.com

# Integraciones de Terceros (Requeridos para Full-Feature)
SENTRY_DSN=tu_url_de_sentry_para_monitoreo_errores
STRIPE_SECRET_KEY=sk_test_..._o_live_...

# Almacenamiento (Cloudinary o AWS S3)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Notificaciones (Firebase Admin)
FIREBASE_PROJECT_ID=tu_project_id
FIREBASE_CLIENT_EMAIL=tu_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Email (SMTP o SendGrid)
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=tu_api_key_sendgrid
EMAIL_FROM=noreply@tu-dominio.com
```

---

## 2. Frontend Web (`eventconnect-frontend/.env.production`)
Crea un archivo `.env.production` en la carpeta `eventconnect-frontend`. Este archivo es compilado por Next.js al hacer el build.

```env
# URL de la API (DEBE ser la URL de producción del backend)
NEXT_PUBLIC_API_URL=https://api.tu-dominio.com/api
NEXT_PUBLIC_SOCKET_URL=https://api.tu-dominio.com

# Analytics & Monitoreo
NEXT_PUBLIC_SENTRY_DSN=tu_url_de_sentry_frontend
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX

# Pagos (Si vas a integrar validación frontend)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_..._o_live_...

# Mapas (Para visualización de eventos)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key_de_google_maps
```

---

## 3. Mobile App (`mobile-app/.env`)
Crea un archivo `.env` o `.env.production` en la carpeta `mobile-app`. Usamos Expo configurado para inyectar estos entornos.

```env
# URLs
EXPO_PUBLIC_API_URL=https://api.tu-dominio.com/api
EXPO_PUBLIC_SOCKET_URL=https://api.tu-dominio.com

# Mapas
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key_de_google_maps_android_ios

# Integraciones Móviles
EXPO_PUBLIC_SENTRY_DSN=tu_sentry_dsn_mobile
EXPO_PUBLIC_AMPLITUDE_API_KEY=tu_amplitude_analytics_key
```

---

## 📝 Notas Finales de Seguridad MVP
1. **Nunca** subas archivos `.env` a repositorios públicos o privados.
2. Los middlewares de seguridad (**Helmet**, **CORS**, **Rate Limiting**) del backend ya están configurados para usar estas variables si se ejecutan en entorno `production`.
3. Todo el Backend, Web, y Mobile están diseñados para tolerar si falta una Service API Key (ej. Sentry, Firebase), logueando un "Disabled" warning, permitiéndote seguir probando el MVP base.
