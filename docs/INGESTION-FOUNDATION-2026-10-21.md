# Primera etapa de la red de fuentes · 21 octubre 2026

> Actualización posterior: el formulario administrativo, el modal de agendas y la extracción de borradores se completaron en [SOURCES-WORKFLOW-2026-10-21.md](SOURCES-WORKFLOW-2026-10-21.md). Los pendientes equivalentes de este informe describen el estado anterior.


## Alcance

Se revisó el informe aportado por el usuario contra el código actual. Ya existían Source, un registro inicial, una pantalla administrativa y varios extractores. Esta etapa reutiliza esos módulos y corrige su gobierno y la entrada de datos; no implementa ni certifica todas las fuentes enumeradas en el informe.

## Fallos reproducidos

- Dos pruebas de política fallaban: se había reintroducido una dirección ficticia en Santo Domingo para registros incompletos y una zona horaria dominicana implícita en ICS sin zona.
- El ciclo llamado global no utilizaba el registro; consultaba directamente una zona de Resident Advisor, un portal cívico y canales de Telegram predeterminados.
- El registro inicial marcaba fuentes activas sin verificar acceso; repetir el seeder sobrescribía estados manuales.
- Varias rutas de administración y conexión eran anónimas en desarrollo.
- El conector de agendas inventaba coordenadas, horarios y precios. ICS intentaba leer dtstart/dtend aunque el parser entrega start/end.
- Una vista previa contaba candidatos como registros guardados.
- El normalizador eliminaba caracteres CJK y sustituía monedas distintas a cinco códigos por USD.

## Aplicado

- Registro inicial idempotente con setOnInsert: agrega candidatos en evaluación, no reactiva suspensiones ni sobrescribe revisiones existentes. No se ejecutó contra la base del usuario.
- Permisos comerciales y de exhibición pendientes por defecto, con revisión administrativa fechada, responsable y enlace a términos. La existencia de un permiso registrado es una declaración del administrador, no una comprobación jurídica automática.
- Activar/aprobar requiere permisos revisados, responsable, endpoint válido y adaptador preparado. Los prospectos y adaptadores todavía no implementados se mantienen bloqueados.
- GET /api/sources, registro, seeder, revisión y activación requieren administración. Conectar una agenda exige autenticación y que pertenezca al organizador responsable o lo haga un administrador.
- Lectura HTTPS con resolución DNS pública validada y fijada a la conexión, sin proxies ni redirecciones, 12 s y 2 MiB de límite. No se publican URLs privadas de acceso a calendarios en pipelineMeta del evento.
- Adaptadores de esta fase: ICS con GEO y horas explícitas, JSON de contrato simple y WordPress The Events Calendar con horarios UTC. OpenAgenda y proveedores comerciales requieren su integración específica; no se presentan como operativos.
- No se adivinan precio, moneda, ubicación o fecha en estos adaptadores. Si un feed no contiene precios, el administrador puede declarar explícitamente que su entrada es gratuita y especificar moneda. Sin datos críticos, el registro se omite; no se inventa para cumplir una cuota.
- Se preservan títulos japoneses/chinos. Monedas admitidas se conservan, incluida ampliación a CNY/HKD/TWD/SGD/NZD; una moneda no soportada se rechaza en lugar de cambiar su etiqueta a USD.
- Nuevas fichas pendientes de revisión, nunca oficiales por defecto. Las actualizaciones respetan organizador, archivo y moderación. IDs de fuente estables evitan nuevas fichas al cambiar una fecha.
- Contadores separados: detectados, vista previa, creados, actualizados, sin cambios, omitidos y fallos de escritura. Un documento inválido no cancela los posteriores.
- Límite de 200 registros por fuente y 50 fuentes por ciclo; se informa incomplete. Todavía no hay cursores persistentes ni paginación exhaustiva.
- El cron existente, el CLI y las rutas de ejecución utilizan ahora el registro aprobado. El cron sigue arrancando automáticamente solo en producción y respeta EVENT_INGESTION_ENABLED=false. Cadencia actual: cada seis horas; nextSyncDue limita cuándo corresponde volver a una fuente.
- Los planes de grupo quedan privados; planes públicos enviados por usuarios requieren revisión. Publicar exige coordenadas y fecha confirmadas, no las sugerencias heurísticas del borrador.
- Los caminos de búsqueda pública obsoletos/no acreditados de Eventbrite, Bandsintown y Meetup ya no hacen peticiones. Sus integraciones autorizadas siguen pendientes.

## Uso del API administrativo

1. POST /api/sources con sourceId, name, endpointUrl HTTPS, adapterType (ics_feed, json_feed o wp_events_calendar) y classification. Crea un candidato en evaluación.
2. PATCH /api/sources/:id/review con commercialAllowed, displayAllowed, termsUrl y responsibleOrganizer. Opcionales: freeAdmissionConfirmed y currency. Se guarda quién revisó; no activa la fuente automáticamente.
3. PATCH /api/sources/:id/status con status=approved o active, si no hay bloqueos.
4. POST /api/events/pipeline/harvest con dryRun=true para previsualizar sin guardar contenido ni métricas.
5. POST con dryRun=false para importar al circuito de moderación. GET /api/sources expone readiness y bloqueos a administradores.

Cada petición necesita el token de sesión habitual en Authorization. No pegar claves o tokens en chats ni URLs públicas. La pantalla administrativa existente no incluye todavía el formulario completo de esta revisión; en esta etapa el flujo está disponible por API.

## Validación

50 pruebas: source-registry-integrity, ingestion-policy y global-ingestion-pipeline. MongoDB temporal y HTTP/DNS simulados; no hubo importaciones externas ni inserciones en la base local del usuario. Lint de los servicios/rutas de esta fase: cero errores, dos advertencias anteriores en el extractor de borradores. Registros en E:/CodexBuilds/audit-20261020/source-registry-*.

## Siguiente etapa necesaria

- Elegir fuentes reales, verificar derechos y completar accesos/credenciales antes de activarlas.
- Interfaz de revisión, cola de importados incompletos, historial persistente de ejecuciones y observaciones por fuente.
- Adaptadores documentados de proveedores globales y agendas institucionales; muestras reales por ciudad e idioma.
- Colas durables, paginación y checkpoints, cuotas por proveedor, reintentos y cancelaciones/deltas.
- Resolución reversible de duplicados entre proveedores. Los algoritmos existentes de similitud/H3 se conservan para evaluación, pero esta fase no fusiona automáticamente registros de fuentes distintas ni afirma usar un modelo probabilístico entrenado.
- Series, sesiones, eventos de día completo y actividades sin coordenadas deben tener un modelo propio antes de entrar al mapa. En esta fase no se expande RRULE.
- Hosting continuo. En desarrollo las tareas no se ejecutan solas. No hay todavía mediciones que prueben 100–300 eventos nuevos diarios ni cobertura mundial.

## Comprobación local al activar

API reiniciada: /health y el catálogo público responden 200. Sin sesión, registro de fuentes, seeder, conexión de agendas y ejecución global responden 401. No se ejecutó una cosecha real ni se activaron candidatos. La web permanece en su compilación anterior; esta fase cambia el backend y no certifica una interfaz nueva.
