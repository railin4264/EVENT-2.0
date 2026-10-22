# Veinte mejoras para preparar EventNow para más ciudades y países

Alcance: herramientas de planificación, organización y colaboración en web y móvil. Este bloque mejora el uso internacional; no equivale a traducir toda la aplicación ni a certificar un lanzamiento mundial.

## Planificación y horarios

Acceso: `/planning-tools` en web y móvil, desde inicio y herramientas de organizadores.

| # | Mejora | Qué permite |
| --- | --- | --- |
| 1 | Fechas y horas comprensibles | Elegir disponibilidad sin escribir una cadena ISO; el envío convierte a un instante explícito y comprueba cambios de horario. |
| 2 | Ventanas rápidas | Empezar con dos horas, cuatro horas o una sugerencia de fin de semana y ajustar el intervalo. Viernes a domingo es una sugerencia editable, no una regla para todos los países. |
| 3 | Comparación entre zonas | Consultar el mismo evento en la zona del dispositivo y en la zona declarada del evento o una zona elegida explícitamente. No se deduce la zona a partir de una ciudad. |
| 4 | Calendario portable | Exportar un archivo ICS con inicio y fin reales. No confirma asistencia ni genera una entrada. |
| 5 | Búsqueda dentro de resultados | Encontrar un título entre los eventos cargados, con coincidencia sin distinción de acentos o mayúsculas. |
| 6 | Orden por horario o duración | Comparar las opciones cargadas según cuándo empiezan o cuánto duran. |
| 7 | Resumen de opciones elegidas | Seleccionar resultados y preparar un resumen imprimible en web o compartible desde móvil. No calcula rutas ni garantiza que los planes no se solapen. |

Los resultados siguen limitados a eventos públicos y visibles, con fin conocido, que caben en la ventana incluyendo el traslado manual indicado. La API devuelve la zona horaria declarada cuando existe.

## Marcas, espacios y patrocinadores

Acceso: `/partners` en web y móvil. Los filtros se aplican sólo al conjunto de fichas cargadas; no representan una búsqueda exhaustiva del inventario mundial.

| # | Mejora | Qué permite |
| --- | --- | --- |
| 8 | Búsqueda de convocatorias | Buscar por título, descripción y actividad asociada. |
| 9 | Filtro de colaboración | Separar espacio, productos o servicios y difusión. |
| 10 | Filtro por ciudad | Elegir entre las ciudades presentes en las convocatorias cargadas. |
| 11 | Capacidad del espacio | Buscar espacios con la capacidad mínima indicada. No certifica el aforo legal del lugar. |
| 12 | País del espacio | Filtrar el directorio por los países declarados en sus fichas. |
| 13 | Brief de patrocinio | Redactar objetivo, entregables y fechas, y cómo se recogería evidencia manualmente. Exportación JSON, impresión o compartir, según plataforma. |
| 14 | Seguimiento personal | Revisar preparación, condiciones y referencias de entrega sin alterar las confirmaciones reales del servidor. |

El brief y su checklist son un borrador en memoria. La pantalla indica que se borran al salir, recargar o cambiar de cuenta y ofrece exportación. No son un contrato ni métricas verificadas, y no estiman ventas ni retorno publicitario.

## Preparación de anfitriones

Acceso: sección comunitaria del evento o idea, `/community/events/:id` y `/community/ideas/:id` en web; `/community-event/:id` en móvil, con `?scope=ideas` para ideas. Las herramientas privadas sólo se muestran al gestor de esa actividad.

| # | Mejora | Qué permite |
| --- | --- | --- |
| 15 | Revisión de accesibilidad | Registrar sí, no o desconocido para accesos, baños, descanso, ruido e información. No acredita una certificación. |
| 16 | Bienvenida internacional | Preparar señalización, idiomas del equipo y recepción de visitantes; la referencia local opcional requiere declaración voluntaria. |
| 17 | Agenda operativa | Preparar tareas con hora y rol responsable. No asigna tareas a cuentas ni envía notificaciones. |
| 18 | Calculadora de insumos | Calcular unidades para una cantidad manual de personas, consumo por persona y porcentaje de reserva. No usa supuesta presencia en vivo. |
| 19 | Informe de preparación | Exportar el borrador y sus respuestas declaradas. El informe distingue preparación personal de evidencia verificada. |
| 20 | Convocatoria de ayuda lista para revisar | Generar texto a partir de roles abiertos y plazas restantes reales; compartir requiere una acción explícita y disponibilidad pública autorizada por la API. |

La preparación permanece en memoria y se separa por cuenta y actividad. No se publican automáticamente sus respuestas. Las convocatorias de ayuda no incluyen nombres de colaboradores ni listas de asistentes y están deshabilitadas para eventos privados o secretos.

## Correcciones de integración

- Inicio ofrece accesos a itinerarios y colaboraciones; organizadores explica horarios, calendario y borradores.
- La cabecera de permisos permite cámara del mismo origen para el escáner QR. El navegador sigue solicitando permiso cuando se pulsa la acción; el micrófono permanece deshabilitado.
- La sección comunitaria rechaza la lectura por personas ajenas de actividades con ubicación secreta o visibilidad privada heredada.
- Las exportaciones imprimibles insertan texto sin interpretarlo como HTML. Los calendarios escapan contenido y usan instantes con zona explícita.

## Verificación y límites

Las veinte mejoras están implementadas. La validación focalizada terminó con **180 pruebas aprobadas: 80 web, 63 móvil y 37 API**, sin pruebas omitidas en estos conjuntos. Incluye regresiones existentes y casos nuevos; no significa que se haya probado toda la aplicación.

TypeScript completo aprobado en web y móvil. Lint focalizado sin errores ni advertencias en los archivos revisados. Se corrigieron además resultados obsoletos al cambiar ciudad o traslado y se bloquearon los campos durante una búsqueda pendiente. La limpieza del borrador móvil se comprueba también al perder el foco, aunque Expo conserve la ruta montada.

La evidencia está en `E:/CodexBuilds/creators-20261020/global-web-partners-entry-final.log`, `global-web-planning-community-final.log`, `global-mobile-final.log` y `global-api-final.log`. Los tests usan componentes aislados y una base de datos efímera; no modifican eventos de producción.

Quedan fuera de esta entrega la traducción completa de todas las pantallas, el lanzamiento por tiendas, la validación física en dispositivos y las pruebas de capacidad a escala mundial. Los nuevos borradores no tienen sincronización entre dispositivos. Las herramientas no dependen de una pasarela de pago.

Una revisión automática anterior rechazó iniciar el API principal con «blocked by policy». No se eludió ese bloqueo; el recorrido visual con los servicios principales sigue pendiente.
