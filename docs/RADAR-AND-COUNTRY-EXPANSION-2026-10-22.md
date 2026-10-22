# Radar real y ampliación del catálogo · 22 de octubre de 2026

## Incidencia y corrección

La captura del usuario mostraba eventos madrileños como si estuvieran en Santo Domingo, con porcentajes de ambiente 95/88/81 calculados por posición de tarjeta. Había dos errores independientes: la API incluía actividades futuras y la interfaz esperaba una estructura diferente, activando sus valores inventados.

- El radar utiliza ahora `location` y `vibeRadar` en un contrato común. No contiene porcentajes ni barras de popularidad.
- Sólo admite eventos publicados en curso, con inicio y cierre conocidos. Una recurrencia no demuestra que exista una sesión en ese instante.
- Respeta país, ciudad o radio elegidos. La consulta y su caché dependen también de la identidad del usuario.
- Excluye eventos privados, ubicaciones secretas y restricciones de edad no satisfechas.
- Muestra «Sin reportes recientes» cuando corresponde. Un error de conexión tiene un estado distinto de un catálogo vacío.
- Cada usuario mantiene un solo reporte, actualizado mediante una escritura atómica. Caduca a las dos horas; contadores históricos, duplicados y fechas futuras no establecen el ambiente.
- Para reportar se requiere asistencia confirmada o ser organizador, además de que el evento esté en curso. Esto acredita participación en EventNow, no presencia física comprobada ni aforo oficial.
- Las consultas públicas exponen sólo agregados, sin identidad/comentarios de los reportantes. Se retiró la difusión global de actividad que podía pertenecer a eventos privados.

## Estados reales por mercado

| Mercado | Resultado de esta ampliación | Pendiente |
|---|---|---|
| Estados Unidos · Nueva York | 156 actividades importadas de NYC Parks; 100 publicadas y 56 pendientes | Ampliar ciudades/categorías y revisar lotes posteriores |
| España · Madrid | Se conserva el piloto anterior de 100 publicadas | Resto del país y revisión de pendientes |
| Finlandia · Helsinki y municipios de su agenda | Se conservan 100 publicadas del piloto anterior | Ampliar ventana y categorías |
| República Dominicana | SIC del Ministerio registrado en evaluación | Los términos sólo autorizan al Ministerio a mostrar contenido aportado; falta resolver reutilización y feed |
| Colombia · Bogotá | Agenda futura Idartes localizada y registrada en evaluación | Reutilización, extracción y coordenadas por sede |
| Perú | BNP registrada como candidata histórica | El recurso examinado es de 2025; encontrar una agenda futura |
| Brasil · Ceará | API pública comprobada, con sesiones, precio y sedes | Reutilización y validación de sesiones; ejemplos con coordenadas 0,0 o dirección ausente se descartan |

Las cuatro candidatas **no están activadas ni aprobadas**. Su alta usa `$setOnInsert`: conserva cualquier registro existente. El panel muestra los bloqueos; no simula cobertura de esos países. La revisión posterior de los [términos oficiales de Idartes](https://www.idartes.gov.co/es/terminos-condiciones-web), sección 5, confirmó protección de sus contenidos salvo indicación contraria; no se activó extracción ni se copiaron textos o imágenes de esa agenda.

## Nueva York

Fuente: [NYC Parks Public Events – Upcoming 14 Days](https://data.cityofnewyork.us/d/w3wp-dpdi). La [FAQ oficial de Open Data](https://www.nyc.gov/opendata/get-started/FAQs) permite usar sus datos; se preservan los [términos propios de NYC](https://data.cityofnewyork.us/stories/s/Terms-of-Use/k9k7-3cje/), sin atribuirles CC BY 4.0.

El feed tiene 780 filas en la consulta observada; no todas resultan publicables. Se exige hora local inequívoca convertida con `America/New_York`, coordenadas reales, sesión futura y descripción que indique explícitamente programa, actividades o entrada gratuita. «Free parking» o «free Wi-Fi» no establecen gratuidad. Se excluyen convocatorias de artistas y registros incompletos. No se copian imágenes. No hay identificación de todas las cancelaciones en este feed: desaparecer del listado no se interpreta como cancelación.

El adaptador acota la lectura a 1.000 filas y marca ese límite como incompleto. El importador acota cada ciclo a 200; la publicación inicial a 100. Son límites operativos, no promesas de cobertura total ni de 100 eventos nuevos cada día.

Las agendas activas se consultan cada doce horas mediante el trabajo local de ingesta, que comprueba vencimientos cada seis horas. La PC y la API deben permanecer encendidas. Nuevos eventos de ciclos posteriores quedan pendientes de moderación.

## Operación y evidencia

- `node scripts/import-public-country-pilot.js --country US`: vista previa. Aplicar exige `--apply --country US --backup <ruta absoluta nueva>`; repetirlo puede publicar otro lote pendiente.
- `node scripts/register-country-candidates.js`: vista previa de la cola de investigación. Aplicar exige respaldo y nunca habilita importación.
- `npm run ingest:status`: diagnóstico de configuración; no consulta proveedores ni modifica datos.

Evidencias locales: `E:/CodexBuilds/country-ingestion-20261022/`. El respaldo `us-before-apply.json` y su manifiesto `.US.publication.json` permiten devolver las fichas exactas a moderación. `us-pilot-applied.log` registra 156 altas y 100 publicaciones sin errores. Las candidatas tienen respaldo separado `country-candidates-before.json`.

La segunda sincronización (`us-second-sync.json`) reconoció los 156 registros: cero altas, cero modificaciones, cero errores y cero duplicados. El catálogo importado suma 548 fichas: 300 publicadas y 248 pendientes de revisión. La muestra del radar usa hasta 30 reportes recientes por evento.

Pruebas específicas cubren privacidad, país/ciudad/radio, fechas, caducidad, sustitución concurrente de reportes, ausencia de datos inventados, estados de error y normalización de Nueva York. La comprobación HTTP real devolvió tres sesiones de Helsinki en curso sin reportes y cero en Madrid, sin porcentajes de ambiente. Las cifras cambian conforme avanza la hora.

No hay cobertura exhaustiva mundial, despliegue externo ni promesa de cadencia diaria de eventos nuevos. La ampliación real de RD, Colombia, Perú y Brasil sigue pendiente de las validaciones indicadas.
