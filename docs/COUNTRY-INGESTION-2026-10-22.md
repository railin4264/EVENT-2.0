# Primera población real por país

22 de octubre de 2026. Entorno local, con fuentes abiertas revisadas. Cobertura piloto de ciudades concretas; no es un catálogo completo de cada país.

| País | Fuente y cobertura inicial | Importados | Publicados | Pendientes de moderación |
| --- | --- | ---: | ---: | ---: |
| España | Agenda municipal de Madrid | 192 | 100 | 92 |
| Finlandia | City of Helsinki, Linked Events | 198 | 100 | 98 |
| Total inicial | Dos fuentes operativas | 390 | 200 | 190 |

La revisión estructural previa a esta primera publicación comprobó fecha futura, hora declarada, coordenadas válidas, entrada explícitamente gratuita, moneda EUR y enlace original. No certifica disponibilidad de plazas, identidad del organizador ni participación del proveedor en EventNow. Las fichas se publicaron sin insignias de oficial/verificado o destacado.

## Fuentes y reutilización

- España: [actividades municipales en los próximos 100 días](https://datos.madrid.es/dataset/206974-0-agenda-eventos-culturales-100). Su página indica CC BY 4.0 y actualización diaria. [Condiciones generales](https://datos.madrid.es/pages/condiciones-generales-ayuntamiento-de-madrid): atribución, conservación de metadatos y ausencia de insinuación de patrocinio. El feed JSON completo se descarga con un límite explícito de 8 MiB.
- Finlandia: [registro oficial del dataset Linked Events](https://avoindata.suomi.fi/data/en_GB/dataset/linked-events-tapahtumarajapinta). Indica CC BY 4.0 y condiciones particulares para algunas imágenes. Este piloto no copia imágenes. La API se consulta por ventanas de fechas y páginas limitadas, incluyendo el lugar publicado.

Las fichas guardan procedencia, licencia, enlace de origen, última consulta y fecha de actualización del registro cuando está disponible. La descripción conserva atribución y señala adaptación de formato sin afiliación. El panel de procedencia web y móvil distingue la agenda del administrador que custodia los datos.

## Reglas del piloto

- Madrid: se omiten series recurrentes sin expansión de sesiones, fechas sin hora y precios no confirmados. No se toma el cierre de catálogo a las 23:59 como hora real de finalización.
- Helsinki: sólo admisión explícitamente gratuita; se excluyen registros eliminados y agrupadores de sesiones. Se importan sesiones físicas de duración acotada con lugar real. Se conserva el idioma disponible, sin inventar traducciones.
- La zona horaria es Europe/Madrid o Europe/Helsinki según el adaptador revisado. La conversión rechaza horas inexistentes o ambiguas. El código ISO del país permite descubrir Madrid/ES y Helsinki/FI desde los filtros de destino.
- Identidad estable por fuente e identificador externo: un cambio de horario actualiza la ficha en lugar de duplicarla. Una cancelación explícita observada se aplica; la ausencia de una ficha en una respuesta parcial no se interpreta como cancelación.
- La descarga mantiene comprobación HTTPS y protección contra direcciones internas. Se añaden las autoridades de confianza del sistema operativo a las de Node cuando el runtime lo admite; no se deshabilita la validación de certificados.

## Límites y actualización automática

El presupuesto inicial es de 200 filas por sincronización y hasta tres páginas de 100 registros en Helsinki. Las ejecuciones se marcan como incompletas cuando exceden el presupuesto. No se afirma haber descargado todo ni alcanzar 100–300 eventos nuevos diarios.

El trabajo de ingesta revisa fuentes vencidas cada seis horas; estas dos agendas tienen frecuencia configurada de doce horas. `EVENT_INGESTION_ENABLED=true` permite ejecutar sólo ese trabajo también en desarrollo. La API y esta PC deben seguir encendidas; no se ha contratado ni desplegado hosting. Los demás trabajos de desarrollo siguen detenidos.

**Las nuevas fichas posteriores quedan pendientes de revisión.** La publicación de los primeros cien eventos por fuente fue una acción inicial explícita, no una regla de publicación automática para cualquier usuario o proveedor. Los eventos ya publicados conservan la moderación y su identidad al actualizarse.

Una segunda sincronización real creó **0 duplicados**: actualizó los 390 registros para completar la atribución institucional, con cero fallos de escritura. Las otras fuentes sin completar permanecieron bloqueadas.

La siguiente resincronización ajustó las categorías a los filtros visibles (arte, educación, música, deportes y otros) y detectó dos IDs nuevos de Helsinki al avanzar la ventana horaria: quedaron pendientes. El estado posterior es **392 importados, 200 publicados y 192 pendientes**, sin fallos de escritura. El primer cuadro conserva las cifras del lote inicial.

## Ajustes necesarios para uso internacional

- La ficha de un evento fuera de DO no muestra teléfonos ni transporte dominicanos.
- El clima se presenta como condiciones actuales de la zona, no como pronóstico de la fecha futura. No se consulta Santo Domingo cuando faltan coordenadas.
- El calendario no inventa una duración de tres horas: iCalendar puede exportar sólo el inicio; Google Calendar se ofrece con un final conocido. Los recordatorios se configuran al guardar, no se anuncian alarmas inexistentes.
- Los eventos sin interacciones pueden aparecer como «Próximamente», sin etiquetarse como tendencias. El custodio de una importación no recibe crédito de organizador por esos registros en el directorio.

## Operación y evidencias

- `npm run ingest:status`: diagnóstico sin escrituras ni consultas a proveedores.
- `node scripts/import-public-country-pilot.js`: vista previa sin cambios. `--country ES` o `--country FI` limita el país.
- `--apply --backup <ruta absoluta nueva>` registra las fuentes revisadas, importa y publica hasta cien fichas pendientes por fuente. **Repetir apply puede publicar otro lote pendiente**; no forma parte del trabajo automático. Guarda un respaldo previo y un manifiesto con los identificadores publicados.

Respaldo inicial y manifiestos en `E:/CodexBuilds/country-ingestion-20261022/pilot-before-apply.json*`. El respaldo contiene las fuentes y eventos previos; las nuevas fichas pueden volver a moderación usando los IDs exactos de cada manifiesto. No se borraron ni reactivaron eventos de demostración.

Evidencias en `E:/CodexBuilds/country-ingestion-20261022/`: `pilot-preview.json.log`, `pilot-applied.json.log`, `live-second-sync.json`, registros de pruebas, compilación y capturas del navegador.

Compilación final servida: `Om7LJ9IdKMoHghV6Zxv_P`, directorio `.next-country-final-20261022`. Pasaron las pruebas de adaptadores y política/registro de fuentes, descubrimiento, perfiles, mapa, detalle de eventos, procedencia y adaptación internacional. TypeScript móvil y compilación web de producción aprobados. En navegador se comprobaron el catálogo mundial, la búsqueda de Madrid con cien resultados y una ficha con hora local, enlace original y ausencia de servicios dominicanos. No se certificaron dispositivo Samsung ni cobertura exhaustiva de país.

## Ampliación por países

España y Finlandia tienen pilotos operativos en las ciudades indicadas. República Dominicana continúa priorizada, pero sus candidatos actuales necesitan autorización o una agenda abierta confirmada. Francia, Estados Unidos, Reino Unido, Japón y los demás mercados requieren comprobar fuente, acceso, adaptador y licencia antes de habilitarlos. No se generan eventos ni ubicaciones de relleno para simular cobertura.
