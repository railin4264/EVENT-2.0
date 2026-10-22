# EventNow: primera corrección de la experiencia móvil

Fecha de trabajo: 20 de octubre de 2026.

## Cambios aplicados

- Bienvenida: área segura de Android, contenido desplazable, dimensiones reactivas y adaptación al tamaño de texto. Se eliminaron las cifras y avatares de muestra; las herramientas de comunidad siguen disponibles.
- Explorar eventos abre el catálogo público. Crear eventos y descubrir tribus conservan su destino al pasar por el inicio de sesión.
- Términos y privacidad tienen lectores públicos dentro de la app, con el texto existente del sitio incluido en el paquete. Esto no constituye una revisión legal del contenido.
- Inicio: herramientas de planificación agrupadas en una fila; tarjetas adaptables al ancho y al tamaño de fuente; indicador de notificaciones basado en el número real de mensajes sin leer.
- Mapa del inicio: se retiraron los eventos ficticios. La ubicación se solicita al pulsar el botón, con consulta de eventos reales a 50 km, estados de permiso denegado, error y resultado vacío. Las ubicaciones secretas no se muestran. Las respuestas de una sesión anterior se descartan.
- Acceso y registro: contraste de textos de ayuda mejorado, campos y botones con altura mínima en lugar de altura fija, enlaces legales funcionales y limpieza de animaciones al salir.
- La barra del sistema en la raíz usa el tema elegido en la app.

## Verificación ejecutada

| Comprobación | Resultado |
| --- | --- |
| `npm run type-check` | Aprobada, código de salida 0 |
| `npm test -- --runInBand` | 40 suites, 207 pruebas aprobadas |
| ESLint de 11 archivos afectados | 0 errores; 14 advertencias pendientes |
| `git diff --check` de los archivos editados existentes | Aprobada |
| Exportación Expo para Android | Aprobada; bundle Hermes de 8,46 MB |

Las nuevas pruebas cubren exploración pública, acceso con retorno al destino, enlaces legales, renderizado del inicio, errores del catálogo, permiso de ubicación, coordenadas reales, exclusión de ubicaciones privadas, respuestas atrasadas entre sesiones y recuperación de un GPS que no responde.

Las advertencias de ESLint incluyen dependencias de efectos y otras convenciones del código; no se presenta este resultado como una revisión sin advertencias. La suite también emite una advertencia de claves de React en el componente Workspace del módulo de patrocinadores, fuera de esta corrección.

## Samsung: comprobación pendiente

El Samsung SM-A166M, serie R5CY31Q8JLH, volvió a aparecer conectado tras la reconexión del usuario. Expo Go estaba instalado; no se detectó un paquete independiente de EventNow.

La herramienta de control no permitió continuar: `orca emulator ax` / `attach` devolvieron `runtime_unavailable` por ausencia de los metadatos del servicio. El intento documentado de iniciarlo, `orca open --json`, terminó con `runtime_open_timeout`. Por ello no hay una captura nueva ni una validación visual de estas pantallas en el teléfono. No se atribuye el fallo a la conexión USB del usuario.

La exportación genera JavaScript/Hermes y recursos: no instala un APK ni confirma que la versión esté abierta en el Samsung.

## Antes de considerar terminada la revisión móvil

- Comprobar la bienvenida y sus enlaces en el Samsung, con teclado abierto y texto ampliado.
- Recorrer registro, recuperación de acceso, catálogo, detalle, RSVP, creación, tribus, pases y cámara con el servidor disponible.
- Validar ubicación concedida/denegada y catálogo vacío con datos reales.
- Completar la consistencia de tema claro/oscuro en las pantallas restantes. Inicio, navegación, acceso, registro, Explorar y menú de creación ya se adaptaron en las correcciones descritas abajo.
- Validar notificaciones push reales y compilación instalable por separado. Las pruebas de componentes no certifican esos servicios.

## Evidencia local

Directorio: `E:/CodexBuilds/audit-20261020/`.

- `mobile-redesign-types-final.log`
- `mobile-redesign-full.log`
- `mobile-redesign-lint.json`
- `mobile-redesign-export-final.log`
- `mobile-redesign-android/metadata.json`

Esta nota registra únicamente esta corrección móvil. No cambia los estados pendientes del informe general ni renueva los hashes de evidencias anteriores.

## Segunda corrección de diseño: inicio y navegación (21 de octubre)

El inicio y la barra inferior comparten ahora una paleta neutra con acento rosa, coherente con la bienvenida. El encabezado tiene su propio espacio y deja de superponerse a la fotografía. El filtro de las próximas 12 horas y las categorías aparecen antes del evento destacado; los accesos de planificación permanecen disponibles más abajo. Los filtros comunican su selección a lectores de pantalla.

La barra inferior conserva las cinco entradas y el menú de creación. Su altura incorpora el margen inferior real del dispositivo y el tamaño de texto, con etiquetas y colores legibles en tema claro y oscuro. La barra deja de superponerse al contenido. Las tarjetas fotográficas mantienen texto blanco sobre un degradado oscuro; las demás superficies se adaptan al tema elegido.

Validación de esta segunda corrección: TypeScript aprobado, 13 pruebas relevantes aprobadas y exportación Android completada. No se repitió la suite completa de 207 pruebas de la primera corrección. La revisión visual en el Samsung continúa pendiente; `orca status --json` indica que su servicio no está ejecutándose.

Evidencia adicional en el mismo directorio local: `mobile-design-home-types.log`, `mobile-design-home-tests.log`, `mobile-design-home-lint.json`, `mobile-design-home-export.log` y `mobile-design-home-android/metadata.json`.

## Tercera corrección: navegación Android, Explorar y formularios (21 de octubre)

La barra inferior tiene ahora un contenedor SafeAreaView que reserva el margen inferior y los laterales del sistema. La barra interna recibe márgenes cero para evitar duplicarlos. Se inicializa SafeAreaProvider con las métricas nativas de la ventana. La corrección utiliza el margen real, sin suponer que todos los Samsung tienen botones de la misma altura.

El panel de creación reserva su margen inferior con bottomInset, permite desplazar su contenido y adapta colores y textos al tema elegido. El botón físico Atrás cierra el panel abierto y libera el listener al cerrarse.

Explorar conserva búsqueda, categorías, vista de tarjetas/lista y actualización por arrastre. Las tarjetas separan imagen y metadatos, ajustan columnas al ancho y al tamaño de fuente, muestran la moneda y el importe reales y reservan las direcciones secretas. Las categorías utilizan los valores tipados de la app. Se añadieron error con reintento y descarte de respuestas de categorías anteriores.

Acceso y registro usan la misma apariencia clara/oscura que la bienvenida. Se retiraron los orbes decorativos y se simplificaron los fondos, manteniendo animaciones de formulario, autenticación de dos factores, retorno al destino e intereses opcionales. Los campos de nombre pasan a una columna en pantallas pequeñas o con texto ampliado. Los controles para mostrar la contraseña tienen un área táctil mayor y etiquetas accesibles.

Validación: suite completa de 43 archivos y 217 pruebas aprobada; después, una prueba adicional del botón físico Atrás también aprobada. ESLint de 10 archivos: cero errores y advertencias. Exportación Android completada. Estas comprobaciones no certifican la separación física de botones en el Samsung: la revisión en el dispositivo continúa pendiente.

Evidencias: `mobile-safe-menu-full.log`, `mobile-safe-menu-back.log`, `mobile-safe-menu-types-final.log`, `mobile-safe-menu-lint-final.json`, `mobile-safe-menu-export.log` y `mobile-safe-menu-android/metadata.json` en el directorio local de evidencias anterior. El nuevo test del panel se ejecutó por separado y no está incluido en el total de 217 de la suite completa.

El rediseño móvil completo no se declara terminado: falta la revisión física y la revisión visual de las pantallas restantes, incluyendo detalle del evento, Social y perfil. No se ha instalado un APK con estos cambios.
