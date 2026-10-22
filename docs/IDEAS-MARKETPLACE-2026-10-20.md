# Condiciones privadas y propuestas para ideas

Web: `/ideas` → «Yo voy si… · Ver propuestas». Móvil: `/ideas-market`.

## Contrato

- `GET /api/ideas/:id/conditions`: `{ success, data: { summary, own } }`. Sin cuenta, `own:null`. Nunca expone usuarios, IDs ni respuestas ajenas. Resumen hasta 5000 respuestas; sólo grupos de al menos 5 coincidencias. Presupuestos por intervalo y moneda, sin mezclar monedas. No es garantía de anonimato estadístico frente a información externa.
- `PUT /api/ideas/:id/conditions`: reemplaza la respuesta propia. `{ maxBudget?:number, currency?:'DOP'|'USD'|'EUR', dayOfWeek?:0..6, zone?:string }`. Requiere al menos una condición, presupuesto de 0 a 1000000 con dos decimales y zona hasta 80 caracteres. `{remove:true}` retira la respuesta incluso si cerró la idea.
- `GET /api/ideas/:id/proposals`: `{data:{proposals:[{_id,note,accepted,event:{_id,title,date,price,city}}],canAccept}}`. Omite eventos retirados, privados, vencidos o cuyo propietario cambió. No muestra dirección ni ciudad cuando la ubicación es secreta.
- `POST /api/ideas/:id/proposals`: `{eventId,note?:string}`. Cualquier cuenta puede proponer su propio evento público, publicado, vigente y sin otra idea. Límite de 20 propuestas por idea y evento único, comprobados con actualización condicional atómica.
- `POST /api/ideas/:id/proposals/:proposalId/accept`: autor de la idea o administrador. Reutiliza el lanzamiento existente con CAS: un ganador vincula y envía las notificaciones a los apoyos existentes. No confirma asistencia ni cobra. Se comprueba de nuevo la vigencia y visibilidad del evento.

## Operación y límites

El índice único `IdeaCondition {idea:1,user:1}` debe existir antes de habilitar escrituras en producción. El modelo lo declara; los tests ejecutan `Condition.init()` en una base aislada. No se aplicó una migración a datos reales.

La vinculación idea/evento conserva el mecanismo previo de dos escrituras compensadas. Un cierre del proceso entre ambas necesita reconciliación; no se presenta como transacción. Notificaciones de lanzamiento: entrega de mejor esfuerzo, máximo 500 destinatarios, sin cola durable nueva.

La aceptación no cambia el precio ni crea un evento distinto: fecha, ciudad y precio se leen del evento publicado. El autor confirma explícitamente antes de vincular. Cada interesado debe confirmar asistencia por separado. La lista de propuestas se limita a eventos vigentes; no constituye archivo histórico.

Pantallas móviles y web manejan fallos de carga, reintentos, bloqueo de doble envío y aislamiento por cuenta. La publicación de la idea y sus apoyos sigue usando el módulo existente.

## Validación

32 pruebas API (marketplace e integridad previa de ideas); 3 pruebas de interacción móvil; 3 pruebas de interacción web. TypeScript móvil aprobado. El import de EventPracticalInfo detectado inicialmente se corrigió en la integración; TypeScript web completo también aprobado. Ver `docs/SEVEN-PRODUCT-FEATURES-2026-10-20.md` para la validación integrada.
