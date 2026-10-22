# Revisión de entrega: operación sin pasarela — 19 de octubre de 2026

## Implementado

- `/organizers`: pantalla comercial con selección de eventos propios publicados y solicitud de promoción persistida. El servidor valida propiedad, estado, vigencia, privacidad y nota; reintentos concurrentes no activan el destacado ni generan un cobro. El presupuesto y la operación comercial siguen siendo manuales.
- Cobros internos desactivados cuando no existe configuración de pasarela, incluso si se fuerza únicamente `PAYMENTS_ENABLED=true`. No se guardaron credenciales ni se contrataron servicios.
- Serrucho manual: el creador empieza pendiente; una referencia de comprobante queda por revisar. Sólo la recepción registrada por creador/administrador cuenta en la meta, con actor y fecha. Los registros heredados `paid=true` sin evidencia de confirmación no se presentan como fondos verificados. Nuevas adhesiones autenticadas, sin duplicados ni sobrecupo concurrente, con validación de importes y vencimiento. Las confirmaciones tardías se identifican como tales. Vista pública sin teléfonos, comprobantes ni instrucciones bancarias; eventos privados/secretos protegidos. La UI distingue aportar, presentar referencia y registrar recepción.
- RSVP web: regreso al evento tras login/2FA con intención explícita, sin confirmar por abrir un enlace. Prelectura autenticada antes del POST, rechazo si cambió disponibilidad/precio, control de doble clic y error reintentable.
- RSVP móvil: detalle público accesible, destino de regreso acotado a eventos, acciones protegidas y respuestas antiguas descartadas. QR: autorización por evento antes de cámara, solicitud explícita del permiso, códigos acotados, bloqueo de duplicados y aceptación sólo si el servidor devuelve validación positiva. El rol sigue siendo organizador del evento/administrador; no se anuncia delegación de staff que el backend todavía no implementa.
- Alertas de asistencia entre amigos mutuos con doble consentimiento: compartir la propia asistencia y recibir planes son opciones distintas, desactivadas por defecto. Excluyen eventos privados/secretos, restricciones de edad/categorías y cuentas inactivas. Push requiere además consentimiento de canal. Límite piloto de 50 candidatos por RSVP y una alerta por destinatario/día UTC, mediante índice único disperso `notifications.deliveryKey`. Avisos persistidos y emisión al socket correcto; la entrega física push no está certificada sin proveedor/dispositivo.
- Preferencias de notificaciones reales en web y móvil. Privacidad móvil y web: lectura de servidor, cambios parciales, protección frente a respuestas de otra cuenta, bloqueo durante la escritura y restauración del estado anterior al fallar. El perfil oculto se excluye del listado general y de la apertura de perfil ajena; el propietario conserva acceso.
- Ajustes móviles: se sustituyeron acciones vacías por herramientas de cuenta, ayuda, solicitud de recuperación de contraseña, tickets de soporte/verificación y consultas sobre datos. No se afirma envío de correo si el servicio no lo confirma ni se cambian credenciales automáticamente.
- Configuración web: corregido el error por Cloudinary ausente usando las URLs de imágenes disponibles; el formulario no se monta con una cuenta vacía y reinicia su estado al cambiar de identidad. Se omiten teléfono y apellido opcionales vacíos al guardar. Actualizaciones del perfil/imágenes se reflejan en la sesión correspondiente. Las antiguas acciones inertes de descargar datos/bloqueos ahora llevan a soporte con textos honestos; no se declara implementada una exportación integral ni un gestor completo de bloqueos.
- Recomendaciones: historial sin duplicados, popularidad basada en inscripciones confirmadas únicas y una primera selección que da espacio a distintos organizadores. La cercanía se describe respecto al punto elegido, sin fingir GPS. Se conservan filtros de visibilidad/edad/categoría y el límite existente de 300 candidatos.

## Validación

Registros en `E:/CodexBuilds/finish-20261019/`:

| Alcance | Resultado |
| --- | --- |
| API: promoción/configuración, ajustes/privacidad, alertas sociales, serrucho, Discovery | 92 pruebas correctas, `api-final.log` |
| Web: notificaciones, RSVP/detalle, intención de regreso, login, serrucho, organizadores | 70 pruebas únicas correctas entre `web-final.log` y `web-last-changes.log` |
| Web: perfil sin Cloudinary y privacidad parcial/restauración | 5 pruebas correctas, `profile-privacy-web.log` |
| Móvil: privacidad, notificaciones, QR, asistencia, validación y herramientas de cuenta | 29 pruebas correctas entre `mobile-all-final.log` y `mobile-account-tools.log` |
| TypeScript web/móvil | Comprobación completa sin errores al cierre |

Son 196 pruebas focalizadas únicas; no equivalen a una certificación de toda la aplicación ni a pruebas de carga. ESLint del alcance nuevo web/móvil sin errores. En móvil se desactivaron únicamente dos reglas inexistentes en su configuración previa al ejecutar la comprobación focalizada. La API conserva advertencias anteriores en rutas compartidas.

Comprobación visual con API/MongoDB y cuentas ficticias aisladas: `/organizers` público y autenticado, selección y registro de solicitud, creación de serrucho con DOP0 recibido y comprobante que queda por revisar sin sumar dinero, apertura de Configuración sin Cloudinary y presencia de controles de consentimiento separados. Evidencias: `organizers-preview.png`, `promotion-request-saved.png`, `serrucho-reference-pending.png`, `settings-notifications.png` en el directorio de registros. No hubo pagos, mensajes por WhatsApp, concesiones de cámara/GPS ni notificaciones a personas reales.

## Operación y límites pendientes

1. Activación comercial: responsable, contacto, propuesta aceptada, registro de pagos externos y reporte de entrega. El documento `MONETIZATION-WITHOUT-GATEWAY-2026-10-19.md` desarrolla ofertas y piloto. No hay ingresos garantizados ni suscripciones cobradas automáticamente.
2. Administración, zonas/GPS, creación/aprobación y conciliación global de aforo siguen reservados a Antigravity. No se declara terminada su revisión. Una inscripción, compra y check-in deben seguir siendo estados distintos.
3. Push físico, correo operativo y QR/cámara necesitan configuración y prueba en dispositivo. Las alertas sociales son un mecanismo piloto de mejor esfuerzo dentro del RSVP; no existe todavía una cola durable de fanout masivo. En despliegue debe existir el índice único `notifications.deliveryKey` antes de habilitarlas.
4. La exportación completa de datos, la aplicación uniforme de bloqueos en todos los recursos, la atribución comercial y las métricas de anuncios siguen pendientes. La UI no presenta acciones ficticias para esas funciones.
5. El entorno principal `localhost:3001`/API5000 estaba apagado. Se intentó iniciar la API mediante el script local persistente existente, pero la revisión automática rechazó la ejecución con el único motivo `blocked by policy`. Ese arranque no ocurrió; tampoco se reinició otro proceso ni se cambió la base real. La revisión visual se hizo en `127.0.0.1:3002` con datos ficticios. No se publicó ni desplegó esta revisión.
