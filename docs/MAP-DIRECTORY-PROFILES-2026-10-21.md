# Mapa, suplidores, perfiles y feed · 21 de octubre de 2026

## Problemas corregidos

| Área | Causa observada | Resultado |
| --- | --- | --- |
| Suplidores | La API entrega city, whatsapp, rating numérico y services; la pantalla esperaba location.city, contact.whatsapp, rating.average y tags. | Normalización compatible con ambos contratos, campos opcionales seguros y estados de carga, error, vacío y recuperación. |
| Cotización | Se anteponía siempre un 1 al número de WhatsApp; existía además un contacto de inscripción de ejemplo. | Se respeta el prefijo internacional y se normalizan números dominicanos locales. Sin contacto no se muestra un botón inactivo. La invitación final conduce a herramientas de colaboradores. No se enviaron mensajes. |
| Perfiles | La vista social consultaba GET /users/:id, reservado para consultar la propia cuenta o administración. | Consulta GET /users/profile/:id, que devuelve campos permitidos por privacidad. La ruta restringida mantiene su protección. Se agregaron estados de sesión, perfil no disponible y reintento por fallo transitorio. |
| Asistencia compartida | El endpoint de eventos asistidos no aplicaba las preferencias del perfil y devolvía la lista de asistentes. | Respeta perfiles ocultos, asistencia privada y seguimiento aceptado. Para otras personas excluye eventos privados/secretos y omite las listas de invitados. |
| Mapa | Al seleccionar un punto se abrían un popup y un panel a la vez; texto pequeño, pesado y recortado; Leaflet podía colorear de azul la acción. | En Discovery se muestra una sola ficha. Título de 22 px con peso 600, cuerpo de 14 px, fecha y lugar sin truncar y hero más compacto. Los popups conservados fuera de Discovery tienen estilos delimitados y acción blanca legible. |
| Feed | Una segunda barra repetía marca y enlaces de la navegación general. | Cabecera de comunidad y filtros con iconos y aria-pressed. Se mantiene la navegación global. |
| GPS | Distintos componentes iniciaban seguimiento y peticiones inmediatas aunque el permiso estuviera pendiente o bloqueado. | El seguimiento automático solo usa permisos concedidos, tiene un único watcher y se detiene al revocarse. Un permiso nuevo se solicita mediante una acción explícita. Si está bloqueado se explica cómo elegir destino o modificar permisos del sitio. |
| Notificaciones | La inicialización de fondo podía pedir permisos y reiniciarse por cada cambio de ubicación. | No abre solicitudes de permisos en segundo plano. Requiere preferencia push explícita y permisos ya concedidos; la sincronización de ubicación se separa de ese ciclo. |
| Service worker | Algunos fallos de red se convertían artificialmente en respuestas 408. | Versión v6: solo almacena el shell offline explícito. Rutas y prefetch/RSC pasan directamente a red; no fabrica 408. La navegación offline conserva su aviso propio. |

La sincronización de ubicación también usa ahora el token de sesión actual y no envía el destino predeterminado como si fuera una posición GPS real.

## Validación realizada

- 34 pruebas únicas de interfaz y lógica web: contratos de suplidores, recuperación ante caída, perfiles, paneles del mapa, permisos de GPS/notificaciones y privacidad del service worker.
- 12 pruebas de API, con MongoDB temporal: acceso a perfiles, privacidad de asistencia y preferencias existentes. No se modificó la base real mediante estas pruebas.
- Compilación de producción web con comprobación de tipos.
- 10 comprobaciones de navegador con fixtures: apertura/búsqueda/filtros de suplidores, perfil de otra persona con sesión de usuario normal, feed sin navegación interna duplicada, cero solicitudes automáticas de permisos bloqueados, selección única del mapa, contraste de la acción, cierre por Escape/botón y ancho de 390 px. Sin errores de ejecución ni respuestas 408.
- Comprobación adicional sin fixtures: el directorio muestra los seis registros existentes de la API local; el service worker v6 controla la página y el perfil de invitado ofrece iniciar sesión. Sin errores de ejecución.
- Salud de API, /suppliers, /feed, /discovery y /sw.js responden 200 en los servicios locales actualizados.

Registros y capturas: E:/CodexBuilds/audit-20261020/map-directory-*, directory-live-desktop.png, directory-desktop.png, directory-mobile.png, profile-mobile.png, feed-mobile.png, map-detail-desktop.png y map-detail-mobile.png.

El lint de la ruta de usuarios no presenta errores y conserva tres advertencias anteriores de console. No se hizo una certificación completa de la aplicación ni una revisión visual del cliente nativo en este bloque.

## Uso

Recargar la web en localhost:3001 para recibir los cambios. Si Chrome ya bloqueó Ubicación, la aplicación no puede concederse ese permiso: el usuario puede elegir un destino en el mapa o habilitar Ubicación desde los permisos del sitio.

El directorio conserva los registros y marcas de verificación de la API existente; esta entrega no comprueba la identidad, disponibilidad ni tarifas de esos negocios. No se crearon suplidores ni se enviaron cotizaciones.
