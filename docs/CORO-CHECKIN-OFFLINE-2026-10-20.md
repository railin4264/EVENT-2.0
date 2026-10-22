# Revisión de asistentes, acceso e ideas — 20 de octubre de 2026

## Implementado

- Detalle web: sección «Quién va al coro», avatares superpuestos, perfiles públicos e iniciales alternativas. Utiliza `attendanceSummary` del servidor; no muestra identidades deducidas de la lista original.
- API: resumen de confirmaciones únicas (`attending`/`confirmed`), hasta 12 perfiles visibles y resto reservado. Excluye perfiles privados, inactivos o con asistencia/perfil ocultos. Detalle, lista principal, lista de asistentes y lista pública de personas que van solas respetan esta proyección. Pendientes no consumen el contador de confirmaciones del detalle. No equivale a presencia física.
- Detalle/lista principal no reutilizan respuestas de caché que podrían conservar permisos de privacidad anteriores. Los eventos pendientes de revisión no se entregan como detalle público. Lista de asistentes y de personas que van solas comprueban acceso privado y restricciones de edad.
- Invitación de WhatsApp: conserva el total confirmado del servidor aunque las identidades estén reservadas.
- Escáner web: permiso explícito después de comprobar organizador/administrador, lector jsQR, cierre de cámara al salir o pasar a segundo plano, bloqueo de solicitudes simultáneas, alternativa manual. Verde/sonido/vibración sólo después de `success: true` y `valid: true` del servidor.
- Móvil: pases mínimos con QR existente y formato firmado en SecureStore, separados por cuenta, vencimiento y máximo siete días de caché. Recuperación ante error de red, nunca como sustituto de una respuesta 401/403/404. Logout invalida la sesión y limpia las copias, incluidas escrituras pendientes. Eliminados los QR de demostración y el botón de transferencia sin implementación.
- Ideas: apoyo con control de versión, usuarios únicos, opción idempotente `supported`, bloqueo de ideas cerradas/vencidas/lanzadas. Conversión autorizada por autoría y propiedad del evento, sólo a un evento público, publicado y vigente; control de concurrencia y compensación si falla el vínculo. Cachés web y respuestas tardías separadas por cuenta.

## Validación

132 pruebas focalizadas distintas aprobadas: 39 API, 81 web y 12 móvil. El total incluye regresiones existentes y casos nuevos; no representa toda la suite del producto.

- API: `coro-api-final.log` (38 casos), seguido de `coro-attendance-final.log` (9 casos; añade un caso y repite ocho).
- Web: `coro-web-integration.log` (27), `coro-web-flows.log` (49), `coro-home-final.log` (5).
- Móvil: 9 casos nuevos de almacenamiento/red/cambio de cuenta y 3 regresiones de admisión.
- Registros de esta revisión: `E:/CodexBuilds/finish-20261019/`. TypeScript completo de web y móvil aprobado; ESLint focalizado sin errores, con advertencias existentes en archivos compartidos.

## Pendiente de validación y operación

- No se probó cámara ni sonido/háptica en un teléfono físico. No se midió latencia en puerta ni se hicieron pruebas de carga.
- La vista de un pase sin conexión no autoriza acceso: el escáner necesita servidor para registrar la entrada y evitar reutilización. Una revocación posterior al último guardado sólo se detecta al consultar al servidor.
- Apple Wallet y Google Wallet requieren integración real; no se añadieron botones simulados.
- El lanzamiento de Ideas vincula dos documentos con compensación, no una transacción distribuida. Falta reconciliación tras una caída abrupta entre escrituras y una cola durable para los avisos; actualmente el envío tiene tope de 500 destinatarios y es de mejor esfuerzo.
- La proyección de privacidad cubre las rutas indicadas. Otros recursos sociales y APIs antiguas requieren una auditoría específica antes de afirmar privacidad uniforme en toda la aplicación.
- La comprobación visual fue bloqueada al intentar abrir la pestaña de pruebas: el navegador rechazó observar su página interna de error por política de URL. No se intentó eludirla. Los procesos aislados creados para esa revisión se cerraron.
- El arranque del entorno principal continúa sin verificarse: una revisión automática anterior rechazó ejecutar el inicio del API local con «blocked by policy», sin detalle adicional. No se repitió mediante un comando alternativo.

No se configuró pasarela, cobro real, publicación de producción ni envío a usuarios reales.
