# Revisión de coordinación y prioridades — 18 de octubre de 2026

## Alcance y coordinación

Se inspeccionó el estado actual del checkout después de los cambios de Antigravity. Su aplicación está abierta; esto no demuestra que esté editando. Se solicitó al usuario el módulo activo. No se reiniciaron servicios ni se modificaron implementaciones compartidas durante esta revisión. Solo se actualizó el mock del test previo del home para reconocer el nuevo bloque `FeaturedTribesRow`; se conservaron sus verificaciones de navegación pública, filtros y recuperación de búsquedas vacías.

Hay cambios recientes en administración, tribus, ubicación, feed/historias y móvil. Git conserva una gran cantidad de cambios sin commit de trabajos anteriores: no es posible atribuir cada línea a un autor usando solamente `git diff`. Las marcas de modificación son señales de actividad, no un mecanismo de exclusión mutua.

Para la siguiente implementación: acordar módulos por agente, leer de nuevo cada archivo antes de modificarlo y comparar su contenido con la versión auditada. Si cambia durante la tarea, revisar el nuevo cambio antes de aplicar el parche. No realizar restauraciones masivas ni compilar sobre el mismo directorio usado por un servidor de desarrollo activo.

### Reparto confirmado por el usuario

Antigravity continúa con administración, rutas/zonas/ubicación real y creación/aprobación de eventos. Codex reserva el flujo de TRIBUS: permisos y solicitudes del servidor, integración web y móvil, y pruebas aisladas. Las verificaciones de esta iteración no reinician los servicios compartidos ni cambian los datos de la app principal.

## Cambios que ya existen y no deben duplicarse

- Portada administrativa con resumen de tareas y nueva presentación de analíticas.
- Compatibilidad de estados de reportes y envío de `actionTaken`.
- Solicitudes de ingreso a tribus, cancelación, aprobación y rechazo, con integración web/móvil.
- Seguimiento de ubicación web, preselecciones de recintos y servicio móvil de ubicación.
- Cambios recientes en mapas móviles, publicaciones e historias.

Estos elementos existen en código; su presencia no certifica su validación integral.

## Prioridades técnicas detectadas

1. **Privacidad de tribus:** revisar el detalle de API y la serialización de miembros/publicaciones para que la privacidad se aplique en servidor, también para invitados y solicitudes pendientes. El ocultamiento visual del muro no sustituye esta autorización.
2. **Solicitudes y roles:** `join` no aplica todos los modos `invite_only/secret`; listar, aprobar y rechazar solicitudes comprueba roles sin exigir estado activo. Añadir regresiones para invitados, solicitudes pendientes y moderadores bloqueados. Revisar además que una expulsión no se eluda saliendo y volviendo a ingresar.
3. **Administración confiable:** diferenciar error, datos parciales y cero real. Los pendientes no deben contarse solamente sobre una página de reportes. Un servicio que responde no prueba que todo el sistema esté operativo.
4. **Ubicación internacional:** `resolveLocationMetadata` en `useLiveLocation.ts` devuelve `countryCode: 'DO'` para coordenadas fuera de RD; debe resolverse la ubicación real o mantenerse sin confirmar. Un punto cercano a un recinto tampoco confirma que ese sea el lugar del evento.
5. **Ubicación controlable:** revisar inicio automático, revocación, limpieza al cerrar sesión, sincronización con API y persistencia de coordenadas. Mantener siempre la elección manual de ciudad y lugar.
6. **Analíticas administrativas:** no contar la primera página de cien eventos como catálogo completo; `includePast=true` no corresponde al filtro consumido por GET `/events`. Clasificar en curso mediante inicio y fin, no simplemente por compartir la fecha de hoy.

Los detalles adicionales de permisos y contratos se revisan en auditorías de lectura separadas. No se ejecutaron acciones administrativas ni se consultó contenido privado real para probar estos casos.

## Prioridad de producto propuesta

- Completar el recorrido **descubrir → solicitar/unirse → aprobación → aviso → asistir** en web y móvil.
- Orientar el home a planes próximos y relevantes para la zona elegida, con filtros claros de fecha, precio y accesibilidad; distinguir eventos reales de datos DEMO.
- Dar al organizador una bandeja de pendientes clara y eventos repetibles para mantener actividad local constante.
- Pilotar con una comunidad y zona delimitadas antes de ampliar el catálogo. Evaluar descubrimiento, asistencia y repetición con datos observados; no prometer éxito de mercado por añadir funciones.

Como referencia de recorridos ya existentes, Meetup documenta avisos específicos para solicitudes y aprobaciones de grupo: https://help.meetup.com/hc/en-us/articles/40708711818637-What-notifications-Meetup-can-send . Esto respalda el patrón funcional; no demuestra que vaya a producir un resultado comercial determinado en EventNow.

## Validación

TypeScript global sin emisión de archivos aprobó (`--noEmit --incremental false`). La primera ejecución completa de Vitest terminó con 226 aprobadas, cinco fallidas y una omitida: tres fallos del mock desactualizado del home y dos por tiempo de espera. Tras actualizar solo ese mock, sus tres pruebas pasaron. Las dos suites afectadas por espera se repitieron sin aumentar límites: sus 23 pruebas pasaron, incluidos filtros de Sorpréndeme y detalle público de eventos. No se presenta esto como una nueva ejecución completa en verde ni como validación integral del administrador.

Registros: `E:/CodexBuilds/coordination-20261018/`, archivos `web-types.log`, `web-tests.log`, `home-tests.log` y `recheck-critical.log`. La auditoría de permisos de tribus y contratos administrativos fue de lectura; los casos descritos requieren todavía su corrección y regresiones de backend aisladas.
