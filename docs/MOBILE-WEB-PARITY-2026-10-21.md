# EventNow: paridad móvil/web y preparación para desplegar

Fecha: 21 de octubre de 2026. El usuario confirmó que todavía no tiene hosting ni dominio. No se ha desplegado ni enviado la app a tiendas.

## Correcciones de esta intervención

- La pestaña Social abre un centro de funciones agrupado por descubrimiento, comunidad, planificación, anfitriones y cuenta. Servicios conserva su propia ruta.
- Feed, creación de publicaciones e historias tienen rutas Expo Router accesibles. Los botones «Crear publicación» del feed abren el editor de publicaciones.
- El catálogo y la búsqueda móvil normalizan la colección `events` que devuelve la API. Antes los consumidores nativos esperaban `data`; una respuesta válida podía dejar las listas sin datos. Se conserva compatibilidad con respuestas anteriores y paginación.
- El mapa es público y accesible desde Explorar, Inicio y el centro de funciones. Permite buscar en la zona visible y solicitar ubicación explícitamente. No etiqueta la consulta general como «cerca de ti», ni pide GPS al abrirse. Descarta ubicaciones secretas, eventos privados y coordenadas inválidas.
- El servicio antiguo de ubicación ya no escribe Santo Domingo como ubicación real del perfil cuando el GPS falla o se deniega.
- Recuperar contraseña dejó de simular el envío. Usa AuthService, confirma sólo respuestas exitosas y no revela si una cuenta existe. Se añadió restablecimiento móvil con token, confirmación de contraseña y validación acorde al backend.
- Los destinos privados del menú y del panel Crear se conservan al pasar por el inicio de sesión. El proveedor del panel se encuentra dentro del contexto de autenticación.
- Gestión web tiene un acceso identificado desde el móvil. Organizadores y dashboard abren el origen HTTPS configurado; Administración aparece para un usuario con rol admin. El acceso requiere nuevamente la sesión web y sus permisos. No se envían tokens en enlaces. Sin dominio configurado los accesos están desactivados y explican el motivo.

## Distribución y estado real

«Conectado» significa que existen ruta e implementación; no certifica integración con servicios externos ni pruebas físicas.

| Función web | Distribución móvil | Estado / límite |
| --- | --- | --- |
| Inicio y catálogo | Inicio / Explorar | Conectados; contrato de catálogo corregido y probado |
| Búsqueda global | `/search` en web y móvil | Eventos, tribus, personas y anfitriones; ver [implementación y pruebas](SEARCH-GLOBAL-2026-10-21.md) |
| Mapa y zonas | `/map` | Conectado; búsqueda manual y GPS probado con mocks; SDK real pendiente |
| Registro, acceso y 2FA | Grupo `(auth)` | Implementados; consentimiento social nativo no está certificado |
| Recuperar/restablecer contraseña | `(auth)/forgot-password`, `(auth)/reset-password` | Conectados a API; correo real y apertura desde email pendientes |
| Perfil y configuración | Perfil, Settings, herramientas de cuenta | Implementaciones existentes; recorrido real completo pendiente |
| Publicaciones | `/feed`, `/create-post`, `/post/[id]` | Rutas conectadas; carga/publicación real pendiente |
| Historias | `/create-story`, `/stories/[id]` | Editor y visor conectados; cámara, subida y caducidad reales pendientes |
| Tribus | `/tribes/discover`, `/tribe/[id]`, `/create-tribe` | Implementaciones existentes; solicitudes y roles requieren integración real |
| Mensajes | `/messages`, `/chat/[id]` | Accesibles; reconexión y cambios de sesión reales pendientes |
| Ideas, invitaciones y votaciones | Ideas, planes con amigos y comunidad | Implementaciones existentes; enlaces HTTPS asociados a la app pendientes |
| Planificación y horarios | `/planning-tools`, `/event-planning/[id]` | Conectados; no equivalen a una certificación de todos los husos/dispositivos |
| Entradas y QR | `/tickets`, `/ticket/[id]`, `/qr-scanner` | Implementaciones existentes; cámara y recorrido de entrada real pendientes |
| Pasaporte y retos | `/passport`, `/challenges` | Implementaciones existentes; no se fabrican métricas de negocio |
| Patrocinadores y espacios | `/partners` | Implementación existente; recorrido comercial y autorizaciones reales pendientes |
| Proveedores | `/services` | Se conserva; requiere datos y servicio reales. El antiguo enlace a un chat IA ficticio se sustituyó por las herramientas de planificación existentes |
| Organizadores, métricas y edición avanzada | Gestión → paneles web | Distribución web deliberada; requiere dominio. No se afirma que exista un editor nativo equivalente |
| Administración | Gestión → Administración web, para admin | Requiere dominio y autorización web; no se ha construido ni certificado una administración nativa |
| Notificaciones | `/notifications` y ajustes | Componentes/contratos existentes; recepción push física pendiente |
| Transferencias y aportes de grupo | Componentes de evento y planes existentes | Sin pasarela habilitada; no se certifican cobros automáticos ni liquidaciones |

## Configuración para compilar y publicar

`npm run release:check` comprueba explícitamente URLs HTTPS públicas de API y web, conexión segura del socket, proyecto EAS, clave Android Maps e identificadores nativos. No imprime valores de claves. Su resultado actual es **no preparado**, con cinco pendientes de configuración. Las dos pruebas del verificador confirman que rechaza configuración ausente y direcciones privadas, incluso con HTTPS.

`app.config.js` incorpora `EXPO_PUBLIC_EAS_PROJECT_ID`, `ANDROID_GOOGLE_MAPS_API_KEY` y el esquema `eventnow`. El proyecto Android guardado también recibe la clave mediante un placeholder de Gradle y conserva el esquema anterior. Esto evita que configurar sólo Expo deje intacta la clave de ejemplo del manifiesto.

Se corrigió el valor inválido de `buildType` del perfil development a `apk`, y production declara `app-bundle`. Estos son los valores admitidos en la [configuración oficial de EAS](https://docs.expo.dev/eas/json/). No se ejecutó una compilación EAS ni se generó un APK/AAB. El perfil development todavía requiere instalar/configurar `expo-dev-client` antes de utilizarlo, según la misma documentación.

El árbol Android conserva una configuración de firma debug en release que debe resolverse con las credenciales reales o comprobarse en el flujo EAS elegido. No se generaron ni reemplazaron keystores. Los cambios de manifiesto se validaron como XML; Gradle no se compiló en esta intervención.

## Qué falta para autorizar un despliegue

1. Elegir hosting y dominio, configurar API/web/socket HTTPS y asociar los enlaces a la app. No se utilizaron dominios inventados como destino de publicación.
2. Configurar proyecto EAS, Maps, correo, proveedores OAuth, credenciales push y firma. Comprobar los valores mediante el verificador y el proveedor correspondiente.
3. Recorrer en el Samsung acceso/registro/recuperación, mapa y permiso denegado, publicaciones/historias, tribus, asistencia, entrada y QR. Probar teclado, texto ampliado y navegación del sistema.
4. Comprobar con cuentas de usuario, anfitrión y administrador la API y la web reales; verificar permisos, cambios de cuenta, errores de red y notificaciones.
5. Cerrar los gates de CI/cobertura, dependencias y recuperación operativa de la auditoría general. Esta intervención móvil no cierra los pendientes anteriores de API/web ni modifica sus umbrales.

La paridad no se declara al 100 % por contar rutas. Quedan pendientes operativos, integración con servicios externos, accesos sociales nativos, asociaciones de enlaces y revisión física. La división entre herramientas móviles y paneles web queda explícita para continuar sin duplicar funciones innecesariamente.

## Evidencia

Directorio local: `E:/CodexBuilds/audit-20261020/`.

- Suite móvil final: `mobile-parity-full-final.log` — 51 suites, 241 pruebas aprobadas.
- Tipos: `mobile-parity-types-final.log`.
- Lint: `mobile-parity-lint-final.json`.
- Exportación Android: `mobile-parity-export-final.log`, `mobile-parity-android/metadata.json`. Es JavaScript/Hermes y recursos, no un instalador.
- Verificador: `mobile-release-check.log` y `mobile-release-check-tests.log` — dos pruebas Node aprobadas, independientes de las 241 pruebas Jest.

La revisión física continúa pendiente por indisponibilidad del servicio de control del Samsung documentada en el [informe de rediseño móvil](MOBILE-REDESIGN-2026-10-20.md). La evidencia anterior no se presenta como renovada ni como una certificación de publicación.
