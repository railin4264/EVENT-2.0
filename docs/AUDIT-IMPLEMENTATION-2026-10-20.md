# Aplicación de la auditoría · 20 octubre 2026

[Continuación de esta auditoría](AUDIT-CONTINUATION-2026-10-20.md): retorno OAuth, dependencias y cobertura medida.

Se conservan las funciones y se reorganizan los accesos. Este documento distingue correcciones verificadas, código que necesita validación operativa y trabajo que requiere datos o infraestructura. No certifica lanzamiento, capacidad masiva ni ausencia total de fallos.

La auditoría original y sus 28 hallazgos se conservan como línea base. Estado de esta intervención: **14 corregidos y probados, 9 implementados con validación operativa pendiente, 3 parciales y 2 pendientes de datos o entorno**.

## Cambios visibles y funcionales

- Home con accesos agrupados para descubrir, decidir con amigos y crear/colaborar. Las herramientas siguen disponibles.
- Entrada móvil pública para explorar antes de registrarse; cuenta necesaria para acciones privadas.
- Guardado opcional de brief y preparación del anfitrión, entre web y móvil. Carga explícita, límite atómico de 20 espacios, versiones contra conflictos y limpieza al cerrar la cuenta.
- Horario del evento en su propia zona IANA, incluyendo borradores creados desde otra zona. Comprobación de cambios de horario.
- Notificaciones con contratos compatibles, preferencias persistidas y aplicadas, destino interno real al pulsar Ver y protección al cambiar de cuenta.
- Herramientas móviles que utilizan los colores del tema. Inter y Outfit locales conservan la tipografía sin depender de Google durante el build; licencias incluidas en public/fonts.

## Datos, seguridad y operación

Recomendaciones públicas con edad/preferencias, tarjetas sin datos privados y radio estricto. Analytics usa identidad del servidor, acota lotes y propiedades y sanea antes de guardar o enviar desde los clientes. No considera una señal cliente una venta, asistencia o hecho verificado.

Los eventos antiguos se archivan. No se introduce borrado automático de analytics sin acordar la retención y preservar agregados históricos. Los índices de producción no se crean automáticamente al conectar: deben revisarse antes de publicar. El preflight de índices es sólo de lectura y bloquea un release que carezca de índices únicos exigidos.

Scheduler con coordinación compartida y deduplicación del intervalo completado; difusión con adaptador Redis, varias conexiones por usuario y rate limiting compartido. Todo ello necesita pruebas de fallo y carga con varias instancias. No equivale a capacidad comercial demostrada.

## Verificación y límites de la evidencia

Se ejecutaron las baterías completas y, tras corregir fallos, se repitieron los archivos afectados. No se suman repeticiones como pruebas distintas. Los logs están en E:/CodexBuilds/audit-20261020. El manifiesto AUDIT-IMPLEMENTATION-EVIDENCE-2026-10-20.json registra resultados y hashes actuales.

- Build de producción web aprobado, incluyendo tipos y lint; salida standalone presente. No se arrancó esa salida.
- Compose local y producción validan sintaxis con --no-interpolate; workflows validan YAML. No se construyeron/ejecutaron imágenes ni se desplegó.
- Mongo temporal para las pruebas. Pruebas de concurrencia, versiones, privacidad, archivado y criptografía TOTP/QR reales añadidas.
- Cobertura API de líneas medida en la continuación: 41,76 %, inferior al 70 % exigido; no se rebajó el umbral. Ejecución de CI no certificada. Validación Expo con datos locales del SDK: sin discrepancias detectadas; la comprobación online falló al consultar el servicio y no sustituye un build físico.
- Las comprobaciones funcionales no demuestran LCP/INP/CLS, tiempos de puerta QR o recepción push en un teléfono.

La revisión automática había rechazado arrancar la API principal con el motivo «blocked by policy». No se intentó evadir ese bloqueo. La revisión visual y los recorridos en vivo quedan pendientes, aunque el build y las pruebas aisladas sí se ejecutaron.

### Resultados finales registrados

| Comprobación | Resultado |
| --- | --- |
| Web completa | 82 archivos; 482 pruebas aprobadas y 1 omitida |
| Móvil completo | 37 suites; 193 pruebas aprobadas |
| API: seguridad y contratos | 4 suites; 47 pruebas aprobadas |
| API: espacios privados y regresiones relacionadas | 5 suites; 22 pruebas aprobadas |
| API: privacidad de ubicación y Discovery, comprobación final | 2 suites; 21 pruebas aprobadas |
| Web: build de producción | Aprobado con tipos y lint; salida standalone |
| Lint de archivos modificados | API: 0 errores, 36 avisos; móvil: 0 errores, 15 avisos |

Las comprobaciones API se solapan: no deben sumarse. Histórico previo a esta continuación: la batería API registró 486 aprobadas, 2 fallidas y 1 omitida, con fixtures de espacios privados corregidos después. En la continuación se ejecutó la batería completa con cobertura, que no aprobó el umbral del 70 %, y se corrigieron límites de tiempo de importación y memoria mediante comprobaciones específicas. Ver los resultados y límites de la continuación; no se certifica CI.

## Dependencias de producción

Comparación de npm audit --omit=dev. Son paquetes señalados, no un conteo de explotaciones ni vulnerabilidades únicas.

| Proyecto | Antes: críticas / altas / moderadas / bajas | Ahora: críticas / altas / moderadas / bajas |
| --- | --- | --- |
| Web | 1 / 18 / 3 / 0 | 0 / 7 / 3 / 0 |
| API | 4 / 21 / 15 / 1 | 0 / 0 / 0 / 0 |
| Móvil | 0 / 57 / 18 / 2 | 0 / 45 / 18 / 0 |

SEC-01 permanece abierto parcialmente. Hay alertas de frameworks y cadenas de herramientas; no se usó audit fix --force para saltar de versión mayor sin adaptar y verificar la app.

## Preparación de lanzamiento

1. Configurar entorno protegido de GitHub y host de staging; secretos mediante el gestor del entorno, nunca por chat. Definir NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_API_URL y NEXT_PUBLIC_SOCKET_URL al construir la web.
2. Revisar índices y duplicados antes de aplicarlos. Verificación de sólo lectura: npm run db:verify-release, dentro de backend-api y contra la base deseada.
3. Inspeccionar tamaños y explain: npm run db:inspect-scale. El informe sólo contiene métricas numéricas; sus umbrales son avisos de revisión, no límites impuestos a eventos ni prueba de capacidad.
4. No reutilizar un volumen Mongo 6 como Mongo 7 sin revisar su plan de actualización y respaldo. No se migraron, reiniciaron ni borraron volúmenes en este trabajo.
5. Probar HTTPS, GPS/cámara, visita sin cuenta, registro/retorno, creación/moderación, RSVP, entrada QR, revocación de sesión y avisos en Android/iOS reales.
6. Ensayar varias instancias, caída de Redis/worker, deduplicación, carga representativa, restauración y rollback. Definir después la capacidad soportada.
7. Resolver las dependencias pendientes y comprobar cobertura, formato y CI antes del release. La automatización de release falla si faltan requisitos y no sustituye esa revisión.

El piloto propuesto conserva RD en español y DOP; las zonas y destinos existentes siguen disponibles. Idiomas completos, nuevos mercados, calidad de recomendación y conversión necesitan validación propia. No se añadieron cobros ni se simularon pagos.

Los tokens Expo requieren transporte y recibos propios; una aceptación no demuestra recepción ni lectura. Referencias de implementación: [Expo Push](https://docs.expo.dev/push-notifications/sending-notifications/) y [Firebase Admin](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk).

## Seguimiento de los 28 hallazgos

### REC-01 · P1 · Corregido y probado

**Hallazgo original:** La ruta pública de recomendaciones devuelve 500.

**Aplicado:** Ruta compatible con el servicio exportado, límites y coordenadas estrictos. Regresión HTTP aprobada.

**Pendiente:** Validar nuevamente al integrar y antes de publicar.

Archivo: [backend-api/tests/launch-contracts.test.js](../backend-api/tests/launch-contracts.test.js).

### REC-02 · P0 · Corregido y probado

**Hallazgo original:** El motor antiguo no aplica edad ni protege ubicaciones secretas.

**Aplicado:** Reglas y recomendaciones colaborativas usan filtros públicos de edad y preferencias. Tarjetas sin asistentes ni dirección secreta; radio sin expansión silenciosa.

**Pendiente:** Validar nuevamente al integrar y antes de publicar.

Archivo: [backend-api/src/utils/publicEventCard.js](../backend-api/src/utils/publicEventCard.js).

### SEC-01 · P0 · Parcial

**Hallazgo original:** Hay dependencias con avisos críticos.

**Aplicado:** Actualizaciones compatibles y migraciones concretas de Cloudinary/Firebase/Nodemailer/Sharp; Next 15.5.28 y eslint-config-next alineados.

**Pendiente:** La auditoría de producción ya no tiene críticos, pero conserva alertas: API 0 alertas de producción, web 7 altas/3 moderadas y móvil 45 altas/18 moderadas. Migraciones de framework y herramientas requieren validación dedicada.

Archivo: [eventconnect-frontend/package-lock.json](../eventconnect-frontend/package-lock.json).

### DEP-01 · P0 · Implementado; validar operación

**Hallazgo original:** Los Dockerfile esperan artefactos que Next no genera con la configuración actual.

**Aplicado:** Next produce standalone y compiló correctamente. Imágenes web y API separadas, npm ci, Node 22 en Docker/CI, fuentes locales y URLs públicas durante build. Despliegue manual por imágenes inmutables y comprobaciones reales.

**Pendiente:** Falta construir y ejecutar las imágenes en el entorno elegido, configurar host/secretos/URLs y verificar rollback.

Archivo: [eventconnect-frontend/Dockerfile](../eventconnect-frontend/Dockerfile).

### SEC-02 · P0 · Corregido y probado

**Hallazgo original:** Compose contiene valores compartidos de credenciales y publica las bases.

**Aplicado:** Credenciales fuera de Compose, bases sin puertos públicos en producción y puertos locales ligados a loopback. No se cambiaron credenciales ni volúmenes existentes.

**Pendiente:** Validar nuevamente al integrar y antes de publicar.

Archivo: [docker-compose.production.yml](../docker-compose.production.yml).

### NOT-01 · P1 · Corregido y probado

**Hallazgo original:** El adaptador móvil no coincide con el listado y contador del API.

**Aplicado:** Adaptador móvil normaliza listado y contador, usa unreadOnly y los métodos POST del API. Plataforma de registro correcta.

**Pendiente:** Validar nuevamente al integrar y antes de publicar.

Archivo: [mobile-app/src/services/notificationsService.ts](../mobile-app/src/services/notificationsService.ts).

### NOT-02 · P1 · Corregido y probado

**Hallazgo original:** El evento Socket.IO entrega una envoltura distinta a la esperada por móvil.

**Aplicado:** Emisión compatible con consumidores existentes y normalización de la envoltura móvil. Respuestas de otra cuenta se descartan.

**Pendiente:** Validar nuevamente al integrar y antes de publicar.

Archivo: [mobile-app/src/contexts/NotificationsContext.tsx](../mobile-app/src/contexts/NotificationsContext.tsx).

### NOT-03 · P1 · Corregido y probado

**Hallazgo original:** Un endpoint informa que guardó preferencias sin persistirlas.

**Aplicado:** Preferencias parciales se guardan; desactivar avisos in-app afecta listado, contador y emisión. Se respetan recordatorios y mensajes canónicos, además del interruptor push.

**Pendiente:** Validar nuevamente al integrar y antes de publicar.

Archivo: [backend-api/src/utils/notificationPreferences.js](../backend-api/src/utils/notificationPreferences.js).

### NOT-04 · P1 · Implementado; validar operación

**Hallazgo original:** El token Expo se registra en un recorrido de envío directo a FCM.

**Aplicado:** Tokens Expo se envían a Expo y tokens FCM a Firebase; datos FCM convertidos a cadenas, IDs de ObjectId conservados, tickets y consultas de recibos, retirada de dispositivos inválidos.

**Pendiente:** Faltan credenciales habilitadas y ensayo de recepción en Android/iOS. Aceptación por proveedor no demuestra lectura ni recepción en pantalla.

Archivo: [backend-api/src/services/pushTransport.js](../backend-api/src/services/pushTransport.js).

### NOT-05 · P2 · Corregido y probado

**Hallazgo original:** La acción Ver del aviso emergente no navega.

**Aplicado:** Ver abre rutas internas validadas de evento, tribu, chat, publicación o perfil; enlaces externos y rutas manipuladas se rechazan.

**Pendiente:** Validar nuevamente al integrar y antes de publicar.

Archivo: [mobile-app/src/utils/notificationDestination.ts](../mobile-app/src/utils/notificationDestination.ts).

### SEC-03 · P1 · Corregido y probado

**Hallazgo original:** Los errores de conexión pueden registrar la URI completa de Mongo.

**Aplicado:** Conexión explícita sin fallback en producción, pool y espera acotados, errores sin URI ni credenciales y creación automática de índices desactivada en despliegues.

**Pendiente:** Validar nuevamente al integrar y antes de publicar.

Archivo: [backend-api/tests/database-release.test.js](../backend-api/tests/database-release.test.js).

### SCA-01 · P1 · Implementado; validar operación

**Hallazgo original:** Cada réplica inicia el scheduler.

**Aplicado:** Jobs sin autoarranque al registrarlos, lease compartido en Mongo, renovación y deduplicación de cada intervalo completado. Pruebas de concurrencia y ejecución secuencial duplicada.

**Pendiente:** Ensayar caída de trabajador y pérdida de conectividad. El procesamiento requiere tareas idempotentes y no promete exactamente una ejecución.

Archivo: [backend-api/src/services/jobLease.js](../backend-api/src/services/jobLease.js).

### SCA-02 · P1 · Implementado; validar operación

**Hallazgo original:** Presencia y difusión entre réplicas no están resueltas.

**Aplicado:** Adaptador Redis conectado tras inicializar Redis, varias conexiones por usuario y revisión del resto de dispositivos antes de marcar desconexión.

**Pendiente:** Falta ensayo con varias instancias, reconexiones, caída de Redis y balanceador real.

Archivo: [backend-api/src/services/socketService.js](../backend-api/src/services/socketService.js).

### SCA-03 · P1 · Implementado; validar operación

**Hallazgo original:** Los límites dependen del proceso y requieren validar la topología del proxy.

**Aplicado:** Contadores Redis atómicos para presupuestos compartidos, identidades firmadas separadas de IP y proxy configurado explícitamente. Topología y límites son configurables.

**Pendiente:** Validar subredes de proxy, comportamiento IPv6, fallos de Redis y presupuestos con tráfico representativo.

Archivo: [backend-api/src/services/sharedRateLimitStore.js](../backend-api/src/services/sharedRateLimitStore.js).

### SCA-04 · P1 · Pendiente de datos o entorno

**Hallazgo original:** Un documento de evento admite aforo de un millón y contiene arrays de asistentes y vistas.

**Aplicado:** Diagnóstico sólo de lectura de BSON, arrays, DEMO y explain con prueba en Mongo temporal. No elimina ni limita las funciones existentes.

**Pendiente:** Medir datos y concurrencia representativos antes de declarar capacidad. Separar participaciones/vistas y usar contadores/paginación cuando los volúmenes lo requieran. Umbrales del diagnóstico son de revisión, no capacidad certificada.

Archivo: [backend-api/scripts/inspect-event-scale.js](../backend-api/scripts/inspect-event-scale.js).

### SCA-05 · P2 · Corregido y probado

**Hallazgo original:** La votación abierta consulta cada quince segundos.

**Aplicado:** Votación conserva actualización y refresco manual. Consulta periódica pasa de 15 a 30 y 60 segundos, sin consultas periódicas en segundo plano.

**Pendiente:** Validar nuevamente al integrar y antes de publicar.

Archivo: [eventconnect-frontend/src/app/plans/[token]/page.tsx](../eventconnect-frontend/src/app/plans/[token]/page.tsx).

### DAT-01 · P1 · Corregido y probado

**Hallazgo original:** La ingesta de analytics confía en identidad y propiedades del cliente.

**Aplicado:** Identidad autenticada, lotes de hasta 50, propiedades acotadas y saneadas antes de almacenamiento y transporte, IDs de evento y separación de datos cliente frente a hechos verificados. Analítica móvil usa el cliente HTTP compartido.

**Pendiente:** Validar nuevamente al integrar y antes de publicar.

Archivo: [backend-api/src/utils/analyticsInput.js](../backend-api/src/utils/analyticsInput.js).

### DAT-02 · P1 · Corregido y probado

**Hallazgo original:** El cron elimina eventos expirados antiguos sin una política visible de referencias.

**Aplicado:** La limpieza archiva los eventos antiguos y conserva su identidad. Prueba real del cron sobre Mongo temporal confirma que no desaparecen.

**Pendiente:** Validar nuevamente al integrar y antes de publicar.

Archivo: [backend-api/src/services/cronService.js](../backend-api/src/services/cronService.js).

### DAT-03 · P2 · Parcial

**Hallazgo original:** No hay evidencia de calidad de recomendaciones o conversión real.

**Aplicado:** Ranking con versión y confianza etiquetada como puntuación heurística; ingesta distingue señales cliente. Se preservan marcadores DEMO.

**Pendiente:** Falta medir embudo con datos reales, aislar cohortes DEMO en cada análisis y evaluar asistencia, diversidad y feedback. No hay conversión o retención demostradas.

Archivo: [backend-api/src/services/AIRecommendationService.js](../backend-api/src/services/AIRecommendationService.js).

### UX-01 · P1 · Corregido y probado

**Hallazgo original:** El visitante no puede recorrer las pestañas públicas como en web.

**Aplicado:** Inicio y exploración móviles públicos; perfil, mensajes y creación siguen protegidos. La entrada inicial deja de obligar a pasar por registro.

**Pendiente:** Validar nuevamente al integrar y antes de publicar.

Archivo: [mobile-app/app/index.tsx](../mobile-app/app/index.tsx).

### UX-02 · P2 · Corregido y probado

**Hallazgo original:** Varias páginas anidan un main dentro del main del layout.

**Aplicado:** Se conserva el único main del layout en organizadores, colaboradores y planificación.

**Pendiente:** Validar nuevamente al integrar y antes de publicar.

Archivo: [eventconnect-frontend/src/components/layout/ClientLayout.tsx](../eventconnect-frontend/src/components/layout/ClientLayout.tsx).

### UX-03 · P2 · Implementado; validar operación

**Hallazgo original:** Las herramientas móviles nuevas no comparten todos los tokens de tema.

**Aplicado:** Herramientas móviles de anfitrión, colaboración e itinerarios usan los tokens del tema y mantienen sus acciones.

**Pendiente:** Falta revisión visual física en claro/oscuro, contraste, tamaño de texto y teclado.

Archivo: [mobile-app/src/components/HostReadinessTools.tsx](../mobile-app/src/components/HostReadinessTools.tsx).

### UX-04 · P2 · Implementado; validar operación

**Hallazgo original:** La Home reúne demasiadas tareas de producto en el mismo recorrido.

**Aplicado:** Home reorganizada en descubrir, decidir con amigos y crear/colaborar. Se conservan mapas, ideas, comunidades, historias, pasaporte y herramientas. Enlaces públicos comprobados.

**Pendiente:** Validar composición en navegador/dispositivo y comprensión con usuarios; no se infiere éxito de usabilidad sólo por compilar.

Archivo: [eventconnect-frontend/src/components/discovery/HomeToolsHub.tsx](../eventconnect-frontend/src/components/discovery/HomeToolsHub.tsx).

### UX-05 · P2 · Corregido y probado

**Hallazgo original:** Brief y preparación operativa sólo viven en memoria.

**Aplicado:** Borradores privados en web y móvil, carga explícita, 20 espacios por cuenta y versiones opacas para evitar sobreescrituras incluso tras borrar y recrear. Aislamiento por cuenta y limpieza al eliminarla.

**Pendiente:** Validar nuevamente al integrar y antes de publicar.

Archivo: [backend-api/src/routes/workspaces.js](../backend-api/src/routes/workspaces.js).

### INT-01 · P1 · Parcial

**Hallazgo original:** La preparación internacional no es una localización completa.

**Aplicado:** Zona IANA del evento independiente del dispositivo, importación de borradores entre zonas y rechazo de horas ambiguas/inexistentes. Países y monedas actuales conservados.

**Pendiente:** Piloto propuesto: RD en español y DOP; viajes y eventos en otras zonas disponibles. No hay traducción integral ni soporte comercial mundial certificado.

Archivo: [eventconnect-frontend/src/app/events/create/create-event-form.ts](../eventconnect-frontend/src/app/events/create/create-event-form.ts).

### OPS-01 · P1 · Implementado; validar operación

**Hallazgo original:** Health comprueba proceso, no preparación del servicio.

**Aplicado:** Readiness separado de liveness, dependencia Redis configurable, preflight de índices sólo de lectura, release sin borrar volúmenes ni migrar automáticamente y respaldo opcional.

**Pendiente:** Faltan HTTPS objetivo, índices revisados, alertas, ensayo de restauración y rollback.

Archivo: [backend-api/scripts/verify-release-indexes.js](../backend-api/scripts/verify-release-indexes.js).

### QA-01 · P1 · Implementado; validar operación

**Hallazgo original:** La batería configurada no termina completamente verde y omite recorridos reales.

**Aplicado:** Corregidos contratos y fixtures de moderación sin abrir eventos pendientes. Nuevas pruebas de privacidad, versiones, concurrencia, avisos y criptografía real. Build web, tipos y controles específicos documentados.

**Pendiente:** Cobertura API de líneas: 41,76 %, inferior al 70 % requerido. Faltan ampliar pruebas, repetir medición final, ejecutar CI y validar dispositivos y recorridos en vivo.

Archivo: [backend-api/tests/two-factor-crypto.test.js](../backend-api/tests/two-factor-crypto.test.js).

### PER-01 · P1 · Pendiente de datos o entorno

**Hallazgo original:** No hay una medición actual de carga, interacción y estabilidad visual.

**Aplicado:** Build reproducible con fuentes locales, salida standalone y presupuesto de bundles visible en el log.

**Pendiente:** Faltan LCP/INP/CLS y latencias p50/p95/p99 en el entorno objetivo. No se generó un Lighthouse ni una cifra de usuarios soportados.

Archivo: [eventconnect-frontend/next.config.mjs](../eventconnect-frontend/next.config.mjs).

