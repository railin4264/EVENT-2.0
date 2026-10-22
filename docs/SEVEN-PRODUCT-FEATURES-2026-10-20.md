# Siete funciones de producto — 20 de octubre de 2026

Implementadas sobre los módulos existentes de EventNow. Sin pasarela nueva, cobros ni inscripciones automáticas.

| Función | Web | Móvil | Comportamiento |
| --- | --- | --- | --- |
| Resolvamos el coro | `/plans`, `/plans/:token` | `/group-plans` | Dos o tres opciones en nuevos formularios, resultados reales, cierre explícito, WhatsApp y retorno al evento para confirmar asistencia. API compatible con votaciones anteriores de hasta cinco opciones. |
| Yo voy si… | `/ideas` | `/ideas-market` | Presupuesto, moneda, día y zona propios. Respuesta retirable. Resumen de grupos con al menos cinco coincidencias, sin respuestas individuales ajenas. |
| Propuestas de organizadores | `/ideas` | `/ideas-market` | El organizador ofrece su evento propio publicado; autor de la idea o administrador acepta. Se vuelve a comprobar disponibilidad y sólo una conversión gana. |
| Tu primera vez | Detalle y `/events/:id/planning` | Detalle y `/event-planning/:id` | Llegada, equipamiento, accesibilidad, estacionamiento y recepción. Editor del anfitrión/administrador, con pendientes explícitos. |
| Plan B | Detalle | Información práctica | Tras cancelación o cambio de fecha registrado: opciones públicas de igual ciudad/país, fechas próximas y mínimos conocidos comparables en igual moneda. No traslada entradas ni pagos. |
| Reputación por cumplimiento | Detalle | Detalle | Historial público de 365 días, cancelaciones con denominador, estado completado separado de evidencia en puerta, opiniones sólo de asistentes con check-in persistido. |
| Presupuesto completo | Información práctica/editor | Información práctica/editor | Entrada, gastos obligatorios y opcionales por persona. Centavos, moneda coherente y pendientes explícitos. Completo es declaración del organizador, no auditoría financiera. |

## Integraciones

- Routers `/api/event-planning` y `/api/organizer-reputation`, también bajo `/api/v1`.
- Condiciones y propuestas amplían `/api/ideas`; votaciones reutilizan `/api/plans`.
- Home web y móvil enlazan las funciones. Abrir una invitación no ejecuta votos ni inscripciones.
- Web admite invitados con cookie firmada: votos por navegador, no identidad verificada; borrar cookies puede permitir otro voto. En móvil la invitación es pública, se inicia sesión para votar y se conserva el retorno permitido al grupo.
- Fecha anterior y momento de reprogramación escritos por el servidor después de validar la edición; el cliente no puede falsificarlos. No se inventó historial anterior.
- El esquema conserva ahora `checkedInAt`/`checkedInBy`, que el servicio de admisión ya escribía. Probado pase RSVP firmado → validación en puerta → persistencia → opinión habilitada.
- Instrucciones de llegada/estacionamiento/recepción de ubicaciones secretas ocultas también en el lector antiguo de eventos.

## Validación

API: 87 casos aprobados en siete suites. Web: 53 casos distintos en votación, detalle, Home, información práctica, reputación y propuestas. Móvil: 26 casos en seis suites. Total: 166 casos distintos, incluidas regresiones existentes.

TypeScript completo de web y móvil aprobado; ESLint focalizado sin errores. El repositorio conserva advertencias anteriores. La comprobación móvil desactiva sólo dos nombres de reglas ausentes en la versión instalada, como en revisiones previas.

Registros: `E:/CodexBuilds/product-20261020/`. Los casos finales verifican presupuesto de alternativas y opiniones sin puntuación preseleccionada, con edición que conserva sus valores. Los lectores de datos personales nuevos responden `private, no-store` para evitar reutilización por cachés.

## Antes de producción

- Crear índices únicos `EventReview {event:1,user:1}` e `IdeaCondition {idea:1,user:1}`. Declarados en modelos y `backend-api/scripts/mongodb-indexes.js`; no se ejecutó sobre una base real.
- Configurar opcionalmente `EXPO_PUBLIC_WEB_URL` con dominio real para compartir invitaciones web desde móvil. Sin él se genera el enlace real de la app mediante Expo Linking; depende de la instalación/configuración del dispositivo.
- Completar revisión visual y pruebas en teléfono físico. No se afirma instalación nueva en Samsung ni publicación de producción.
- Aceptar propuestas conserva dos escrituras compensadas, no una transacción. Una caída entre documentos requiere reconciliación. Avisos de mejor esfuerzo con máximo 500 destinatarios, sin cola durable nueva.
- Alternativas y condiciones tienen límites de consulta explícitos. No equivalen a pruebas de carga para una audiencia masiva.
- La revisión automática anterior rechazó iniciar el API principal con «blocked by policy», sin motivo adicional. No se repitió por otro comando; se verificó código con pruebas aisladas, no el entorno principal en ejecución. Observar la pestaña de pruebas también fue bloqueado por la política de URL del navegador en la revisión anterior.

Contrato detallado: `docs/IDEAS-MARKETPLACE-2026-10-20.md`.
