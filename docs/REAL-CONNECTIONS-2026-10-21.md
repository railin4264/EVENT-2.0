# EventNow: conexiones reales y retirada de datos de ejemplo

Fecha: 21 de octubre de 2026. Entorno local; no es una certificación de producción ni una auditoría exhaustiva de todos los módulos.

## Correcciones activadas

- La búsqueda global, anfitriones y sugerencias excluyen perfiles ocultos.
- Los perfiles comunitarios usan `/users/profile/:id`. El endpoint privado conserva su control de acceso. Las reglas de privacidad no se relajaron para ocultar un 403.
- La ubicación automática sólo usa un permiso ya concedido. Un permiso denegado conserva el destino manual; no se intenta solicitar repetidamente al navegar.
- El service worker v6 no intercepta respuestas API/RSC ni fabrica errores HTTP 408. El aviso de nueva compilación compara el identificador del cliente con `/api/app-version` y pide actualizar sin borrar formularios automáticamente.
- Socket.IO reutiliza la conexión mientras se establece, cambia de conexión al cambiar la credencial y dispone de polling con actualización a WebSocket. Los mensajes de éxito/error de conexión duplicados se eliminaron.
- El chat carga conversaciones e historial desde MongoDB mediante API, utiliza el identificador canónico de la sala y combina la respuesta persistida con los mensajes recibidos sin duplicarlos por identificador. Un envío no confirmado conserva el texto. Se puede cargar historial y conversaciones adicionales.
- Los mensajes generan notificaciones persistidas con enlace a la conversación. Los eventos `newNotification` y `unreadCountUpdate` se conectaron al cliente web. La entrega push depende de dispositivos, permisos y proveedor; guardar una notificación no certifica una entrega push.
- Salas, lectura y señales de escritura comprueban acceso. Las señales no exponen datos completos de la cuenta.
- Las analíticas separan el catálogo real y las interacciones observadas. Se eliminan porcentajes fijos, nombres inventados y valoraciones aleatorias. Datos no medidos se devuelven como `null`. El organizador sólo accede a sus eventos.
- Las recargas/transferencias de la cartera no fabrican saldos ni operaciones. Se ha fijado `PAYMENTS_ENABLED=false` en el entorno local, conforme a la ausencia de pasarela del negocio. El pago directo al organizador/enlace externo es independiente.
- Telegram sin configurar no anuncia entregas exitosas ni un bot inventado. Su webhook requiere secreto. La mejora de texto con IA devuelve indisponibilidad cuando no existe proveedor operativo, conservando el texto original.
- La cápsula de radio usa exclusivamente eventos publicados, públicos y futuros del destino seleccionado. Se oculta sin agenda y no anuncia una duración ni una reproducción inventadas.
- Llamadas, videollamadas, adjuntos y operaciones de chat sin flujo completo se identifican como no disponibles; no se presentan como acciones exitosas.

## Limpieza recuperable del catálogo local

Se compararon título, descripción y coordenadas exactas con las plantillas de los sembradores; los suplidores se compararon por nombre y contacto exactos. No se borraron documentos.

| Datos de ejemplo identificados | Acción |
|---|---|
| 49 eventos | Archivados como borradores; retiradas insignias de oficial/destacado. |
| 6 suplidores | Archivados; retiradas reseñas y verificación inventadas. |
| 6 perfiles de organizadores | Desactivados; retirada la verificación ficticia, perfil oculto y marcado DEMO. No se modificaron credenciales. |
| 5 comunidades de plantilla | Desactivadas conservando sus datos. |

Tras la limpieza quedaron **0 eventos publicados** en esta base local. No se sustituyeron por nuevos eventos inventados. Permanecen los registros históricos/borradores que no se identificaron con certeza; no se afirma haber verificado cada documento existente.

Respaldos EJSON en `E:/CodexBuilds/audit-20261020/legacy-demo-backup-20261021.ejson` y `legacy-demo-social-backup-20261021.ejson`. Las restauraciones deben aplicar los campos de cada documento por `_id`; los respaldos de perfiles omiten credenciales y no deben usarse para reemplazar cuentas completas.

Los scripts `archive-legacy-demo.js` y `archive-legacy-demo-social.js` son de inspección por defecto. `--apply` exige una ruta de respaldo nueva y absoluta. Los sembradores de ejemplo quedan desactivados por defecto; los eventos de laboratorio se crean como borrador DEMO y no verifican organizadores.

## Pendientes que requieren datos o servicios reales

El registro contiene 8 fuentes propuestas y **0 fuentes elegibles** según sus permisos, adaptador, responsable y credenciales. El estado textual “active” de algunas entradas antiguas no prueba que importen. El diagnóstico queda en `live-source-readiness.json`; no se activaron fuentes ni se contrataron servicios.

Para poblar el catálogo hay que completar una fuente autorizada, importar una muestra, revisar fechas/ubicación/atribución y aprobar su publicación. No se alcanzan 100–300 eventos reales diarios con las plantillas retiradas.

No se certificaron aquí OAuth real de Google, pagos, entregas push en Samsung, notificaciones de sistema operativo, carga masiva ni todos los recorridos de todas las pantallas. El chat se probó con usuarios aislados de prueba, sin enviar mensajes a personas reales. Permanecen fuera del flujo operativo componentes antiguos de demostración; su existencia en el repositorio no implica que estén conectados ni listos.

## Validación

- 28 pruebas web: chat, conexión, actualizaciones, ubicación, caché, directorio y radio.
- 45 pruebas API: persistencia/entrega Socket.IO real en puerto temporal, notificaciones, accesos, perfiles, búsqueda y privacidad, analíticas y funciones sin proveedor.
- 7 pruebas adicionales de política de importación y conservación de base local.
- Compilación Next de producción, sin ignorar errores TypeScript o ESLint.
- Comprobación HTTP de disponibilidad MongoDB/Redis, handshake Engine.IO, configuración de pagos, versión servida y estados vacíos.
- Validación en el navegador de la portada, directorio, mapa y perfil invitado. No se otorgaron permisos GPS ni se usaron respuestas interceptadas para estas comprobaciones.

Evidencias: `E:/CodexBuilds/audit-20261020/live-*`. Las capturas y la comprobación HTTP final se guardan junto a los registros de compilación y pruebas.

## Cierre verificado

80 pruebas únicas aprobadas en los módulos revisados (28 web + 45 API + 7 políticas de importación/base local). La compilación final está servida en el puerto 3001 y su identificador coincide con `/api/app-version`: `_ZIEM8vnXHoQ6poRXSiWH`. La API del puerto 5000 devuelve disponibilidad de base/Redis y handshake Engine.IO; pagos internos desactivados.

En navegador se observó el aviso real de nueva versión, se pulsó Actualizar ahora, se conservó el término de búsqueda y desaparecieron los perfiles ocultos. La portada muestra una invitación a crear/proponer cuando no hay eventos y no anuncia actividades de radio ficticias. Las pantallas revisadas terminaron sin errores o advertencias de consola. Captura: `E:/CodexBuilds/audit-20261020/live-release-home.png`.

Registro final de compilación: `live-connections-release-build-fixed.log`; pruebas: `live-release-web-tests.log`, `live-final-api-tests.log`, `live-search-privacy-tests.log`, `live-realtime-release-tests.log`, `live-demo-policy-tests.log`. Los ensayos anteriores fallidos quedan conservados como historial; las cifras anteriores corresponden a las versiones reparadas.
