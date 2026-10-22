# Continuación de la auditoría · 20 octubre 2026

Se conservan las funciones existentes. Esta intervención completa y protege el retorno del acceso social, actualiza su dependencia y corrige el generador de datos de demostración. No certifica lanzamiento.

## Cambios aplicados

- Google utiliza `google-auth-library` 11.3.1, compatible con el Node 22 exigido por el proyecto. `npm audit --omit=dev` de la API informa **0 vulnerabilidades**. Esto no incluye dependencias de desarrollo ni equivale a una auditoría de toda la aplicación.
- Los intercambios y renovaciones de Google usan clientes separados por solicitud. Las pruebas comprueban firmas RSA reales, emisor, audiencia, caducidad y correo verificado con certificados locales.
- Estados OAuth almacenados como resúmenes en Mongo, con diez minutos de validez y consumo atómico: no dependen de Redis opcional y dos peticiones no pueden reutilizarlos.
- Callback web `/oauth/[provider]/callback`, ligado a la pestaña de origen. Conserva el evento de retorno, limpia el código de la URL, maneja cancelaciones, expiración, errores y autenticación de dos factores. StrictMode no intercambia el código dos veces.
- Inicio social que respeta cuentas inactivas y segundo factor, sin exponer tokens de Google/Facebook en respuestas. Contraseñas internas aleatorias y conservación de credenciales de renovación cuando el proveedor las omite en un acceso posterior.
- Facebook aparece sólo si la API lo declara disponible. Los ejemplos de entorno y Compose pasan los nombres de variables que realmente utiliza el servicio. [Configuración y límites del acceso social](OAUTH-RELEASE-2026-10-20.md).
- El generador DEMO consulta los identificadores existentes en un lote, conserva ediciones e inspecciona todas las colisiones antes de insertar eventos. Su prueba de 120 documentos tiene un plazo específico y mantiene los hooks y validaciones normales del modelo. Se probó en Mongo efímero; no se ejecutó contra la base de la aplicación.

## Cobertura: bloqueo real de publicación

La primera ejecución completa con cobertura en esta continuación registró:

| Métrica de API | Resultado | Umbral existente |
| --- | --- | --- |
| Líneas | 41,76 % | 70 % |
| Sentencias | 42,84 % | 70 % |
| Funciones | 41,50 % | 70 % |
| Ramas | 41,11 % | 70 % |

Los umbrales siguen intactos. Esta ejecución devolvió error por cobertura y por dos pruebas encadenadas del generador DEMO: la importación superó 30 segundos, continuó mientras se limpiaban los datos y contaminó la siguiente prueba. Tras optimizar la consulta y separar el plazo de esta importación masiva del de un endpoint, la suite DEMO pasó sus ocho pruebas. La medición porcentual anterior corresponde al código anterior a esa optimización final; no es una medición nueva después de ella.

La repetición funcional utiliza `--coverage=false` para distinguir regresiones de la cobertura. Aunque termine verde, **no sustituye ni aprueba el gate de cobertura**. No se suman las repeticiones como pruebas distintas.

## Prioridades comprobadas por la cobertura

| Área | Líneas cubiertas en la medición | Trabajo necesario |
| --- | --- | --- |
| Recomendaciones | 21,51 % | Recorridos reales de personalización, fallback y preferencias, además de los contratos de privacidad ya probados |
| Chat | 10,00 % | Permisos, historial, desconexión y cambios de cuenta |
| Historias | 9,73 % | Publicación, visibilidad, caducidad y errores de carga |
| Usuarios | 36,59 % | Más recorridos de perfil, ajustes, privacidad y ciclo de cuenta |
| Socket.IO | 0,00 % | Integración real de conexiones, reconexión y múltiples instancias; los mocks actuales no lo prueban |

Estos porcentajes identifican huecos de pruebas, no demuestran que las funciones fallen o funcionen. No se cerraron los pendientes de carga, dispositivos, recepción push, revisión visual ni recuperación operativa.

## Evidencia y límites

Los logs están en `E:/CodexBuilds/audit-20261020/continuation-*`. La evidencia de esta continuación registra resultados y hashes sin incorporar secretos ni datos de la base real. La [auditoría aplicada anteriormente](AUDIT-IMPLEMENTATION-2026-10-20.html) conserva su seguimiento de 28 hallazgos; las mejoras de esta continuación no convierten automáticamente un pendiente operativo en cerrado.

La verificación de OAuth requiere aún consola del proveedor, cliente configurado, origen HTTPS objetivo y un recorrido de consentimiento real. No se añadieron cobros ni se necesita pasarela para este cambio. Las alertas web y móvil previas siguen abiertas hasta una nueva migración y validación. No se publicaron servicios, no se arrancó la API principal y no se migraron bases ni volúmenes.

El arranque de la API principal había sido rechazado por revisión automática con «blocked by policy». No se intentó otra vía para evadirlo; las pruebas usan bases temporales y límites HTTP sustituidos cuando corresponde.

## Resultados de comprobación confirmados

| Comprobación | Resultado |
| --- | --- |
| Web completa | 82 archivos; 482 pruebas aprobadas y 1 omitida |
| Build web | Aprobado; incluye lint, tipos y la nueva ruta de callback |
| Acceso web y retorno | 23 pruebas aprobadas; incluidas en la batería completa, no adicionales |
| Catálogo DEMO | 8 pruebas aprobadas contra Mongo temporal |
| Memoria API, comprobación específica | Aprobada: se conserva el límite de 50 MB tras 110 solicitudes y dos ciclos de GC |
| Lint de los archivos API de esta intervención | 0 errores y 14 avisos |
| Compose local y producción | Sintaxis aprobada con --no-interpolate; sin arrancar servicios |

La repetición completa de API encontró un timeout de 30 segundos en la prueba de memoria bajo carga de compilación y otras pruebas. Esa prueba agrupa 110 solicitudes seriales y dos ciclos de GC; ahora dispone de 120 segundos sin cambiar el límite de retención de 50 MB ni los presupuestos individuales de latencia de los endpoints. La comprobación específica pasó después. Esto no es una certificación de rendimiento en producción.

Resultado de la repetición completa de API: **43 suites aprobadas y una fallida; 515 pruebas aprobadas, una omitida y una fallida por timeout del lote de memoria**. La comprobación de memoria pasó después con el mismo límite de 50 MB y un plazo específico de 120 segundos. No se repitieron las 44 suites tras ese último ajuste; el comando completo anterior no se presenta como aprobado. El acceso social pasó sus 17 pruebas después de incorporar también las cabeceras no-store.
