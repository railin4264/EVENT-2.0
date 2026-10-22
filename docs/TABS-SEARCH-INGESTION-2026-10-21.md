# Pestañas, búsqueda e importación de eventos

## Navegación y diseño

El servidor web anterior seguía entregando HTML con nombres de chunks de una compilación que había sido reemplazada. El navegador recibía 404 para JavaScript y CSS y lanzaba `ChunkLoadError`. Se reinició el servicio con la compilación nueva.

Se comprobaron en navegador `/`, `/events`, `/organizers`, `/discovery`, `/ideas`, `/plans`, `/planning-tools`, `/tribes`, `/passport` y `/search`: ninguna lanzó una excepción al cargar. Esto comprueba navegación e hidratación; no certifica cada operación privada de cada módulo.

El encabezado del inicio ahora agrupa las herramientas secundarias bajo «Más planes» y mantiene visibles eventos, mapa, comunidades y acceso al buscador global. En móvil se conserva la fila desplazable de accesos. «Tengo un rato libre» presenta atajos, formulario y ajustes de zona horaria en bloques legibles, conservando sus funciones y borradores.

Se comprobó el acceso desde el menú y el atajo «Tengo 2 horas». Se inspeccionó el diseño de planificación en escritorio y se comprobó que el formulario no desborda horizontalmente a 390 px. No es una comprobación en teléfono físico.

La compilación habitual se detuvo durante la limpieza de su salida anterior. La versión servida usa `NEXT_DIST_DIR=.next-tabs-20261021` tanto al compilar como al arrancar. Ese directorio se excluyó de Git. No se deben reemplazar los archivos de una compilación mientras el servidor que los utiliza sigue activo.

## Buscador

- Conserva eventos, tribus públicas, personas, creadores y anfitriones.
- Busca eventos también por ciudad, país, recinto y dirección pública.
- La pestaña «Ubicaciones» devuelve eventos publicados que coinciden con esos lugares; no constituye un catálogo de todas las ciudades o negocios del mundo.
- Las direcciones y recintos reservados no sirven para inferir eventos secretos.
- Web y móvil incluyen el nuevo filtro. El inicio ofrece acceso directo al buscador.
- Prueba con servicios locales: `Madrid` en «Ubicaciones» respondió correctamente con un evento. La búsqueda general también respondió HTTP 200.

## Población automática: hallazgos y cambios

Los catálogos de `rdEventSeeder` y `GlobalEventHarvester` contienen ejemplos con fechas calculadas. No demuestran una sincronización con agendas oficiales. Se desactivaron por defecto: requieren desarrollo y `ENABLE_DEMO_DATA=true`. El catálogo de ejemplo del harvester se guarda como borrador y no como evento oficial. Se retiró la creación/promoción automática de administradores de esos caminos y la creación de organizadores desde una consulta pública.

La ruta real de ingesta ya existente es `eventAggregator` / `feedImporter`, programada por el cron cuando hay fuentes configuradas. Se corrigió lo siguiente:

- Los nuevos importados quedan `pending_review`; sincronizar uno existente conserva su estado de moderación y su propietario.
- La sincronización valida documentos completos para comparar correctamente fecha inicial y final.
- Los identificadores JSON con ID de fuente no cambian por reprogramar la fecha.
- Se conserva ciudad, país y zona horaria declarados.
- Se rechazan identificadores ausentes y coordenadas imposibles; no se asigna Santo Domingo a eventos sin coordenadas.
- La geocodificación no añade República Dominicana a búsquedas internacionales.
- ICS respeta UTC o un TZID explícito. Rechaza fechas inexistentes, horarios ambiguos y horarios sin zona antes de inventar un instante. No expande recurrencias ni importa actividades de día completo como si tuvieran hora confirmada.

La inspección de configuración local encontró **ninguna fuente externa habilitada**: faltan feeds ICS/JSON o credenciales de proveedores. No se consultaron APIs externas ni se certificó su compatibilidad actual. Se necesitan fuentes autorizadas, comprobar sus campos y revisar una importación de muestra antes de publicar.

No se borraron ni reclasificaron eventos existentes, ni se ejecutaron los seeders o una importación contra la base local. Los ejemplos antiguos que ya estén publicados requieren una revisión separada de su procedencia. Los cambios no rotan credenciales de cuentas existentes.

## Validación y servicios

- 22 tests web distintos aprobados: inicio, planificación, búsqueda y contratos.
- 42 tests API distintos aprobados: búsqueda, planificación y política de ingesta. Se usó MongoDB temporal; no la base del usuario.
- 9 tests móvil aprobados: pantalla y contrato de búsqueda.
- TypeScript móvil y compilación de producción web completados.
- Lint API sin errores en la comprobación de archivos afectados, con advertencias existentes.
- API reiniciada con autorización explícita; web disponible en 3001 y API en 5000.

Registros de validación en `E:/CodexBuilds/audit-20261020/tabs-*`. Captura de revisión: `.playwright-mcp/planning-redesign-desktop.png`.
