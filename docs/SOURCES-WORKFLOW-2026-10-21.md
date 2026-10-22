# Fuentes, agendas y borradores: correcciones del 21 de octubre de 2026

## Resultado

Se completó el flujo administrativo de fuentes y se corrigieron los dos caminos de importación de la interfaz. Esta entrega continúa `INGESTION-FOUNDATION-2026-10-21.md`; sus pendientes relativos al formulario administrativo y al extractor de textos quedan sustituidos por este documento.

### Borradores desde texto

- El extractor recupera fechas y horas explícitas; no supone que el evento sucede mañana, en República Dominicana o que es gratuito.
- Conserva la fecha y hora locales escritas. Sin zona horaria confirmada no convierte una hora local a UTC.
- Lugar, zona horaria y precio requieren indicación explícita. Las fechas relativas, incompletas o ambiguas quedan por confirmar.
- No se anuncia OCR: una solicitud que solo contiene un flyer se rechaza con 400. El texto admite hasta 10.000 caracteres.
- La tarjeta muestra campos desconocidos, pide revisión antes de aplicar y comienza en privado. Aplicar no publica.
- El formulario conserva fecha/hora locales, borra coordenadas anteriores cuando se introduce otro lugar y exige una confirmación final de fecha, zona, ubicación y precio.
- Se asociaron etiquetas a los campos principales y se amplió el espacio inferior del formulario para facilitar el acceso al final desde pantalla estrecha.

### Administración de fuentes

Ruta: `/admin/sources`.

1. Registrar la dirección HTTPS y el formato. La fuente queda en evaluación.
2. Revisar condiciones, licencia, permiso comercial, exhibición y atribución. La revisión registra responsable y fecha.
3. Habilitar explícitamente cuando no existen bloqueos. Guardar configuración o permisos no inicia una importación.
4. Consultar una vista previa sin guardar eventos ni métricas.
5. Importar un lote; las fichas nuevas quedan pendientes de moderación.

También hay edición, suspensión, búsqueda, filtro por estado y resultados con lecturas parciales y contadores separados. Cambiar la configuración invalida la revisión anterior. El registro muestra como máximo 100 fuentes por carga; no implementa todavía paginación administrativa completa.

La consulta manual admite fuentes aprobadas/activas. El planificador considera únicamente fuentes **activas**, respeta su próxima fecha de ejecución y sigue comprobando cada seis horas en producción. Requiere servidor continuo y configuración habilitada.

### Ventana de agendas

- Lista solo fuentes elegibles de la cuenta; administración puede consultar las elegibles del registro.
- Exige previsualizar antes de importar y permite distinguir eventos nuevos, actualizaciones, registros omitidos y fallos.
- iCalendar, JSON de contrato simple y WordPress The Events Calendar son los formatos implementados. OpenAgenda y otros proveedores figuran pendientes.
- Se eliminó la promesa de sincronización en vivo o periódica automática al conectar una agenda manualmente.
- Maneja carga, error y ausencia de fuentes. Incluye foco contenido, cierre con Escape y controles adaptables a pantalla estrecha.

### Consumidor móvil

La pantalla Expo enviaba `rawText` y esperaba las propiedades antiguas del extractor. Ahora envía `text`, muestra una confirmación nativa antes de aplicar, conserva `localDate`/`localTime` y deja por confirmar lugar, zona y precio desconocidos. Aplicar limpia coordenadas, moneda y precio anteriores, y comienza como plan privado con un control visible para cambiar su audiencia. La publicación del plan importado exige escribir el precio, incluido cero cuando sea gratuito. Las monedas admitidas por el constructor móvil se alinearon con el backend, incluido JPY; no hay conversión de divisas. Las respuestas tardías se descartan al editar el anuncio o cambiar de cuenta.

El endpoint alternativo de publicación de planes también exige precio y moneda explícitos; conserva monedas extranjeras y la zona horaria proporcionada.

El antiguo botón de población de RD se etiqueta como datos de ejemplo para desarrollo. Si el seeder está deshabilitado, la API responde 409; no anuncia una importación real exitosa.

## Validación

- 68 pruebas de API en cuatro suites: extracción explícita, integridad de fuentes, política e ingesta global. MongoDB temporal y HTTP/DNS simulados; ejecución focalizada sin cobertura global.
- 14 pruebas de interfaz: tarjeta de borrador, modal de agendas, administración e importación de planes.
- Compilación de producción web y comprobación de tipos de web y móvil.
- 24 pruebas móviles focalizadas: importación revisada, respuestas tardías, precio explícito, privacidad, coordenadas, monedas y conversión de hora local. Sin conexión al teléfono ni publicación de eventos reales.
- Pruebas de navegador con Chrome: revisión y habilitación separadas, registro, vista previa, importación simulada, foco y Escape, estados vacíos y ancho de 390 px. Datos administrativos y operaciones de importación interceptados como fixtures; no se activaron fuentes reales.
- API local: salud y catálogo público 200; registro sin sesión 401. El anuncio de lectura en Tokio devuelve fecha/hora locales y zona, lugar y precio desconocidos. Esta petición no guarda un evento.

Evidencia y capturas: `E:/CodexBuilds/audit-20261020/sources-workflow-*`, `sources-admin-desktop.png`, `sources-register-mobile.png`, `sources-agenda-desktop.png`, `sources-agenda-empty-mobile.png`, `sources-draft-mobile.png`.

La revisión de lint focalizada no detectó errores; la ruta de eventos conserva seis advertencias anteriores de variables sin uso. La ejecución focalizada no certifica cobertura ni validación integral de toda la app.

## Pendientes reales para población mundial

- Elegir agendas reales, verificar sus permisos y conectar accesos autorizados. No se contrató ni activó ningún proveedor en esta entrega.
- Probar muestras reales por ciudad, idioma, cancelaciones y categorías. No existe aún evidencia de 100–300 eventos nuevos válidos diarios.
- Adaptadores específicos para proveedores globales, paginación persistente, checkpoints, cuotas, reintentos, historial de ejecuciones y cancelaciones/deltas.
- Duplicados entre proveedores, series/sesiones y recurrencia necesitan su siguiente etapa de implementación.
- Hosting continuo y medición operativa. Las tareas programadas no se ejecutan solas en el entorno actual de desarrollo.
- Se comprobó visualmente la **web adaptable** y se ejecutaron pruebas de código móvil. No se verificó esta entrega en Expo Go ni en el teléfono Samsung.
