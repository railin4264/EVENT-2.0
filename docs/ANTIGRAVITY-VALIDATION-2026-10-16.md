# Validación del estado actual — 16 de octubre de 2026

## Segunda pasada: nuevas funciones sociales

**Actualización posterior:** la entrega de fotos nuevas del álbum se cambió a almacenamiento privado y lectura autenticada. Las fotos antiguas con URL pública requieren volver a subirse. Contrato, pruebas y límites en `PRIVATE-ALBUM-2026-10-16.md`; los pendientes y resultados de abajo corresponden al cierre de la pasada anterior.

Se encontraron álbum de recuerdos, reconexión mutua, acompañantes/boletas extra, afters y votación de canciones. Se corrigieron los siguientes defectos en el estado actual del checkout:

- Las mutaciones buscan ahora cada recuerdo, after, canción o publicación dentro del evento de la URL. Ser organizador de otro evento no permite modificar sus recursos.
- Una política común comprueba existencia, borrador, privacidad y restricciones de edad del evento. Álbum y reconexión requieren participación confirmada; una compra confirmada con pago satisfactorio también cuenta. Una compra reembolsada por sí sola no concede acceso.
- Las consultas autenticadas de afters, canciones y acompañantes reconocen la sesión. Solicitudes y mensajes de acompañantes solo se entregan al autor; el público recibe el contador.
- Solo puede aceptarse un solicitante real y solo mientras la publicación siga abierta. Postulaciones, aceptación y votos usan escrituras atómicas para evitar pérdidas o duplicados bajo concurrencia.
- Las selecciones recíprocas se guardan antes de resolver la coincidencia; reintentos reparan selecciones pendientes. Los candidatos registrados cancelados quedan excluidos. Se corrigió el nombre de sala del aviso Socket.IO.
- El álbum web utiliza `/upload/post-images`, campo `postImages` y el contrato real de respuesta; se libera la URL temporal de previsualización. No se certifica aquí una subida real a Cloudinary.

Pruebas de regresión: `backend-api/tests/event-social-regression.test.js`. Cubren permisos, aislamiento entre eventos, compras/reembolsos, privacidad de solicitudes, concurrencia en votos/postulaciones/aceptaciones/reconexión, borrado por antiguo asistente e identificadores/URL de imagen inválidos. Usan Mongo temporal y no envían pagos ni correos.

Resultados de esta pasada:

- API: 40 pruebas aprobadas en tres suites (`event-social-regression`, `checkout-regression`, `group-plans`); registro `logs/latest-social-and-checkout-tests.log`. Diez pruebas pertenecen a la nueva regresión social.
- Web: 17 pruebas aprobadas en cuatro archivos; registro `logs/latest-web-tests.log`. Son pruebas unitarias existentes, no pruebas de navegador de las secciones nuevas.
- TypeScript web: `tsc --noEmit` aprobado; registro `logs/latest-web-types.log`.
- ESLint backend de rutas, servicio y regresión social: cero errores y cuatro advertencias por variables sin usar en el archivo de eventos; registro `logs/latest-social-lint.log`.
- ESLint de los dos componentes web modificados: aprobado; registro `logs/latest-social-web-lint.log`.
- No se ejecutó aquí una compilación nueva de producción, una regresión completa ni pruebas de carga. Estos resultados no certifican todos los cambios del checkout.

Pendientes materiales de estos módulos:

1. Las URLs de imágenes siguen siendo públicas o externas. Proteger la API del álbum no equivale a proteger el archivo; falta almacenamiento con entrega autorizada por recurso.
2. Completar consentimiento, bloqueo/denuncia, retirada de selección y regla temporal de reconexión. Los candidatos actuales provienen de `Event.attendees`, aunque el permiso también reconoce compradores.
3. Revisar paginación, límites contra spam, validación completa de campos/enlaces y moderación de las cinco familias; no se certifica escalabilidad por estas pruebas.
4. Validar en navegador y móvil subida, aceptación, notificaciones y errores con los proveedores del entorno de publicación. La lista de producción y capacidad continúa en `PRODUCTION-READINESS-AND-SCALE-2026-10-16.md`.

Los apartados siguientes conservan resultados históricos de revisiones anteriores; no representan una nueva ejecución de la suite completa.

**Actualización posterior del mismo día:** se encontraron correcciones nuevas y se revalidaron los dos escenarios descritos abajo. Ambos pasan ahora con las expectativas seguras; registro `logs/readiness-privacy-results.log`. Los hallazgos se conservan como historial de la instantánea anterior. La revisión de producción y capacidad está en `PRODUCTION-READINESS-AND-SCALE-2026-10-16.md`.

El checkout contiene cambios mezclados de varias sesiones, sin un commit que permita atribuir cada modificación a Antigravity. Esta revisión valida el estado actual y se centra en las funciones nuevas de descubrimiento e ideas. No modifica código de la aplicación.

## Hallazgos confirmados

### P1 — Descubrimiento omite las restricciones de edad

`backend-api/src/routes/discovery.js:48` y `:53` construyen filtros de publicación y privacidad, pero omiten `ageRestriction`. `/featured` y `/trending` son públicos, y `/for-you` tampoco aplica la edad de su usuario.

Reproducción aislada: crear un evento publicado con `minAge: 21` e `isAdultOnly: true`; pedir su detalle sin sesión devuelve 403, pero `/api/events/featured` y `/api/events/trending` incluyen su tarjeta y descripción. Ambos resultados fueron comprobados por prueba automática. Debe compartirse la política de edad entre las rutas, cuidando también la caché de respuestas según la sesión.

### P1 — Ubicación secreta recuperable mediante rutas públicas

`backend-api/src/routes/events.js:157` y `:655` devuelven documentos de eventos sin ocultar su ubicación. La transformación `toCard` de las nuevas tarjetas no protege esas rutas alternativas.

Reproducción aislada: crear un evento con `isSecretLocation: true`, dirección y coordenadas exactas; tanto `/api/events` como `/api/events/:id` responden 200 sin sesión y conservan la dirección y las coordenadas completas. El ocultamiento debe aplicarse en todos los contratos públicos, revelando la ubicación únicamente a los roles/asistentes autorizados según la regla del producto.

## Comprobaciones

- TypeScript web: aprobado (`logs/antigravity-web-types.log`).
- ESLint web: sin advertencias ni errores (`logs/antigravity-web-lint.log`).
- Vitest web: 13 pruebas aprobadas en tres archivos (`logs/antigravity-web-tests.log`).
- Reproducción de los dos hallazgos: dos casos confirmados (`logs/antigravity-review-reproduction.log`). Estos casos pasan al reproducir el defecto; no certifican su corrección.
- Backend funcional completo: 9 suites aprobadas, 153 pruebas aprobadas y una omitida, usando `npx jest --runInBand --coverage=false` (`logs/antigravity-backend-tests.log`). Este comando no certifica el umbral global de cobertura.

Las reproducciones usan MongoDB temporal y no envían pagos ni correos. El script de revisión y su configuración están en `logs/antigravity-review.test.js` y `logs/antigravity-review.config.cjs`, separados de la suite habitual.

La comprobación visual no se completó: el controlador del navegador agotó su tiempo de respuesta. Esta revisión tampoco certifica compilación de producción, dispositivos móviles ni servicios externos.
