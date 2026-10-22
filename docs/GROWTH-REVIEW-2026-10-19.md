# EventNow: crecimiento y preparación — 19 de octubre de 2026

## Entregado en esta revisión

- Home web y móvil: «¿Qué hay hoy?» con intervalo móvil de doce horas, eventos públicos publicados, incluidos los que siguen en curso. El final es exclusivo; sin hora final se usa la estimación existente de dos horas y se indica como estimación. El reloj se actualiza en primer plano y limpia sus suscripciones. El destino seleccionado se conserva.
- `startsBefore` se combina con `timeFilter=upcoming` en el servidor antes de paginar. La API ya dispone de esos filtros mediante `eventListFilters`; no se ha duplicado esa lógica.
- En web, al activar el intervalo se sustituyen el carrusel general y las recomendaciones generales para evitar que aparezcan eventos de otro día junto al catálogo filtrado.
- «Armar el coro en WhatsApp»: borrador con enlace público, fecha, zona horaria, moneda y registros confirmados deduplicados. No se envían mensajes automáticamente. Los eventos privados o sin publicar no se comparten; los cancelados/finalizados no ofrecen invitación. La dirección secreta se omite incluso si quien comparte ya puede verla. Se reutilizan los exportadores verticales existentes con una copia segura de los datos.
- Los contadores nuevos distinguen inscripciones confirmadas de presencia física. No se interpreta el tamaño del array de asistentes como personas en el lugar.
- Tribus web/móvil/API: solicitudes, cancelación, revisión por administradores y moderadores activos, estados claros y protección de muro/miembros/enlaces privados. Las tribus secretas no aparecen para externos. Una prohibición no se elimina al salir o volver a solicitar. Las decisiones concurrentes no duplican membresías.

## Validación automatizada

- Home web, intervalo y filtros: 25 pruebas correctas.
- Invitación WhatsApp, menú de compartir y flujo de detalle: 40 pruebas correctas, incluyendo rechazo de estados pendientes/rechazados/ausentes y los contadores visibles de confirmados.
- Home móvil: 9 pruebas correctas; TypeScript móvil correcto.
- Tribus: 21 pruebas API, 14 web y 12 móvil correctas en las comprobaciones de los agentes.
- TypeScript web completo correcto. ESLint del alcance Home y WhatsApp correcto. Móvil usa comprobación focalizada por incompatibilidad previa de dos reglas de la configuración Expo; queda una advertencia anterior en PulseMarker.
- Filtros/paginación API: 9 pruebas correctas. La ejecución focalizada con cobertura global activada no satisface el umbral global del repositorio; no equivale a haber ejecutado la suite completa.
- Registros de esta revisión: `E:/CodexBuilds/growth-20261019/`; compartir y tribus web: `E:/CodexBuilds/ux-audit-20261018/`; tribus API: `E:/CodexBuilds/ux-audit-20261016/tribes-access-final.log`.

## Contrato para el módulo de organizadores

Antigravity tiene reservado administración, zonas/GPS, creación y aprobación de eventos. Esta revisión no declara terminado ese trabajo ni reinicia los servicios compartidos.

| Necesidad | Comportamiento y criterio de aceptación |
| --- | --- |
| Crear sin fricción | Borrador recuperable, datos mínimos al principio, vista previa y lista de requisitos antes de enviar. Reutilizar un evento sin copiar asistentes ni ventas. |
| Publicar con control | Borrador → pendiente de revisión → publicado/rechazado. Motivo visible al organizador; cambios sustanciales requieren una política explícita de nueva revisión. Ningún catálogo público debe mostrar pendientes. |
| Medir demanda | Visitas únicas sólo si se instrumentan; guardar favoritos, confirmaciones y ventas como métricas diferentes. Mostrar período, filtros y fecha de actualización. |
| Medir ingresos | Separar venta bruta, descuentos, comisión, devoluciones, neto previsto y dinero efectivamente liquidado. Nunca sumar monedas diferentes sin conversión explícita. Conciliar webhooks idempotentes con la pasarela. |
| Medir asistencia | Personas con check-in único / entradas válidas; presentar cancelaciones y ausencias separadamente. No equiparar RSVP, compra y check-in. |
| Entender adquisición | Medir enlace compartido → visita → registro/compra mediante identificador de campaña sin datos personales en la URL. Informar atribución incompleta, no inventar conversiones. |
| Operar la puerta | Roles de staff por evento, validación autorizada y atómica, segundo escaneo identificado como duplicado. Medir latencia real y probar cámara, mala conexión y concurrencia antes de anunciar velocidad. |

## Próximas entregas con dependencias reales

1. RSVP rápido: mantener exploración pública y retorno al evento tras autenticación. Google y teléfono requieren proveedor configurado y verificado; no omitir controles de identidad/edad ni ofrecer botones que no funcionan.
2. «Quién va»: mostrar sólo identidades autorizadas, controles de visibilidad y preferencias de notificaciones. Las alertas de amigos requieren relaciones y permisos reales, deduplicación y límites de frecuencia.
3. Serrucho: el modelo actual registra aportes manuales; no acredita fondos ni implementa custodia o pagos todo-o-nada. Definir proveedor, vencimiento, autorizaciones, reembolsos, conciliación, fallos parciales y tratamiento de cupos antes de cobrar. Una autorización de tarjeta tiene vencimiento; no prometer una retención indefinida. Referencia primaria: https://support.stripe.com/questions/does-stripe-support-holding-an-authorization-for-more-than-7-days-before-capture
4. Push contextual: consentimiento, preferencias, horario local, frecuencia limitada y exclusión de eventos vencidos. Medir entrega y apertura. No prometer geofencing persistente en web; validar permisos y ejecución en segundo plano por plataforma.
5. QR y pagos: existen piezas de escaneo y entradas, pero no se certifica una latencia de 0,1 segundos ni liquidación/comisiones sin contrato y pruebas con el proveedor.

## Criterio de salida a piloto

### Comprobaciones visuales realizadas en copia aislada

En `127.0.0.1:3002` con API y MongoDB exclusivos de prueba: el interruptor selecciona «Ahora y próximas 12 h», muestra los dos eventos incluidos y excluye el del día siguiente. Cada uno muestra una inscripción confirmada aunque exista además un registro pendiente. Se comprobó la maquetación web a 390 × 844 y se restauró el tamaño del navegador al terminar. Evidencias: `E:/CodexBuilds/growth-20261019/home-12h-hero.png`, `home-12h.png` y `home-12h-mobile.png`.

Tribu privada: visitante sin sesión no ve el muro; el inicio de sesión conserva el destino; el visitante envía, cancela y vuelve a enviar su solicitud; una moderadora activa la aprueba; al volver como visitante aprobado se ve el contenido privado y no aparece la bandeja de moderación. Evidencia: `E:/CodexBuilds/growth-20261019/tribe-request-pending.png`. Los casos de prohibición y concurrencia están cubiertos por pruebas automatizadas, sin afirmar revisión visual de todos los roles.

El detalle muestra el enlace de WhatsApp con fecha/zona, evento y una inscripción confirmada. No se abrió WhatsApp ni se enviaron mensajes. Las credenciales y los datos usados pertenecen exclusivamente a la base temporal. No se concedieron permisos de GPS/cámara ni se hicieron pagos.

Queda una conciliación para el módulo de creación/aforo reservado a Antigravity: la ocupación y los cupos heredados usan `attendeesCount`; deben acordarse estados que reservan plaza y contrastarse con la validación atómica del servidor. Cambiar el texto de confirmados no demuestra que todo el modelo de aforo esté reconciliado.

Recorrer con cuentas de visitante, participante, organizador y staff: descubrir sin cuenta, autenticarse regresando al evento, confirmar, cancelar, compartir, solicitar acceso a tribu y revisar la solicitud. Para eventos de pago, comprobar también webhook repetido, devolución y escaneo duplicado en entorno de prueba. Comenzar con un conjunto controlado de organizadores y medir repetición semanal, confirmación/compra y asistencia real antes de ampliar distribución.

Esta revisión aporta implementación y pruebas focalizadas; no certifica toda la aplicación para producción ni garantiza crecimiento comercial. La instalación y experiencia nativa en Samsung todavía no están verificadas: la herramienta de dispositivo no pudo abrir su runtime (`runtime_open_timeout`).
