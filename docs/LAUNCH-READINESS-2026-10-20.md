# Preparación para lanzamiento — EventNow

No se asigna un porcentaje de «lista» ni se promete ausencia total de fallos. La aceptación debe basarse en recorridos comprobados, condiciones reales de operación y capacidad de recuperar el servicio.

## Evidencia cerrada en el bloque internacional

- Veinte mejoras implementadas en web y móvil: ver `GLOBAL-20-IMPROVEMENTS-2026-10-20.md`.
- 180 pruebas focalizadas aprobadas: 80 web, 63 móvil, 37 API. Incluyen autorización, datos privados, horarios, calendarios, cambios de cuenta y exportaciones.
- TypeScript completo y lint focalizado aprobados.
- Corregida la cabecera que impedía solicitar cámara en el escáner web.
- Cerrada la lectura de convocatorias secretas por personas ajenas; compartir ayuda requiere permiso público explícito del servidor.
- No se modificó una base de producción, ni se ejecutaron migraciones o un despliegue.

## Comprobaciones necesarias para aceptar un lanzamiento

| Área | Evidencia necesaria | Estado actual |
| --- | --- | --- |
| Recorridos completos | Registro → intereses → descubrimiento → detalle → asistencia → pase → check-in; creación → revisión → publicación; colaboración → entrega → confirmación. | Pruebas parciales automatizadas; recorrido integrado con servicios principales pendiente. |
| Diseño real | Revisión visual en pantalla pequeña y grande, teclado, zoom, textos largos, carga, vacíos y errores de los módulos afectados. | Código revisado y componentes probados; revisión visual integrada pendiente. |
| Dispositivos | Cámara, permisos denegados, calendario, pérdida de foco, red intermitente y regreso a la aplicación en Android e iOS físicos. | Casos simulados; comprobación física pendiente. |
| Operación de datos | Revisar y aplicar índices únicos existentes; verificar backup y restauración en un entorno adecuado. | Índices documentados; no ejecutados contra datos reales. |
| Capacidad | Prueba con volumen y concurrencia representativos, midiendo latencia, errores y saturación. | Hay casos de concurrencia de funciones; no hay una prueba de carga que certifique escala mundial. |
| Integraciones | Comprobar subidas de imágenes, autenticación externa y entrega real de notificaciones con la configuración del entorno de lanzamiento. | No certificadas en este bloque. No se requiere pasarela para las funciones nuevas. |
| Recuperación | Comprobar registro de errores, alertas, reversión y respuesta ante caída del API o almacenamiento. | Aceptación operativa pendiente. |
| Uso internacional | Revisión de idiomas de interfaz, zonas, monedas admitidas, textos de países y contenido de soporte por mercado. | Mejoradas herramientas horarias e internacionalización práctica; traducción completa pendiente. |

Los borradores de preparación y patrocinio nuevos permanecen en memoria. Se informa de ello y se pueden exportar; no se ha implementado sincronización entre dispositivos para esos borradores.

Una revisión automática anterior rechazó el arranque del API principal con «blocked by policy». No se eludió ese rechazo. Sin el entorno principal disponible no se marca como aprobada la revisión visual ni el recorrido integrado.
