# Apertura de eventos desde el mapa · 21 octubre 2026

## Hallazgos reproducidos

- La navegación inicial mapa → panel → detalle abrió el evento seleccionado correctamente.
- Una revisión seguida del catálogo agotó el límite global local (200 consultas / 15 minutos). Se comprobó respuesta HTTP 429 con Retry-After. Una visita al detalle también consulta varios módulos secundarios; el fallo podía parecer propio del evento.
- El panel asumía que attendees era un array cuando faltaba attendeesCount. Un registro antiguo con attendees como objeto provocaba un error al seleccionar el evento.

- La prueba de retorno a 390 px detectó que una portada con altura fija y un título largo dejaba Volver debajo de la cabecera móvil. Se cambió a altura mínima con contenido en el flujo y tipografía adaptable.

## Cambios

- El límite global por identidad/IP usa por defecto 1500 consultas / 15 minutos también en desarrollo. Se conserva API_RATE_LIMIT_MAX, el límite de autenticación separado y el almacén compartido existente; no se desactiva protección.
- Música y compañía se carga al expandir su sección, en lugar de consultar canciones y coro en cada apertura.
- El panel comprueba Array.isArray para asistentes antiguos y no ofrece confirmar asistencia a eventos pendientes de aprobación.
- El cierre del panel tiene un área de interacción mínima de 44 px.
- El detalle distingue 403, 404/410 y 429, conserva reintento para fallos recuperables y ofrece Volver al mapa.
- El límite de errores de render muestra una salida al mapa y reintento sin exponer el mensaje técnico al público.

## Validación

- 50 pruebas en DiscoveryPanels, event-detail-flow y event-detail-utils.
- TypeScript sin errores y comprobación de sintaxis del servidor.
- Tras reiniciar la API, 26 de 26 detalles del catálogo local abrieron su título esperado sin pageerror en Chrome. Esto valida lectura pública del catálogo actual, no operaciones privadas ni datos reales de proveedores.
- No se cambió ni eliminó contenido de la base de datos. La causa exacta del clic original no puede atribuirse sin su evento o mensaje; se corrigieron los fallos reproducidos durante esta revisión.

- Build de producción final correcto; versión activa en localhost:3001.
- Chrome 1440 y 390 px: seleccionar evento → detalle → expandir/cerrar música → Volver al mapa, sin errores ni desbordamiento horizontal.
- Evento inexistente: mensaje específico y enlace de vuelta al mapa, comprobados en navegador.
