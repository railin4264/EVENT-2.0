# EventNow sin pasarela: producto, ingresos y operación

## Decisión de producto

El usuario confirmó que no dispone de una pasarela comercial. La etapa actual es descubrimiento, confirmación de intención de asistir y servicios de difusión. EventNow no cobra boletas, no custodia serruchos y no liquida fondos automáticamente. Una reserva o RSVP no acredita un pago externo ni garantiza una entrada. El negocio puede facturar servicios acordados directamente con organizadores; eso requiere conseguir clientes y entregar el servicio, no solamente añadir botones.

## Qué vender primero

| Oferta | Entrega concreta | Cobro y activación | Qué medir |
| --- | --- | --- | --- |
| Promoción de un evento | Ubicación y duración acordadas en espacios de difusión disponibles | Presupuesto aceptado y pago directo coordinado con el equipo; activación manual con fecha de vencimiento | Exposición y visitas si están instrumentadas; confirmaciones atribuibles sólo con trazabilidad real |
| Campaña con un organizador recurrente | Calendario de difusión y acompañamiento para sus eventos publicados | Acuerdo mensual revisado manualmente; sin renovación ni débito automático | Eventos publicados, tiempo de preparación, repetición del organizador y consultas recibidas |
| Patrocinio de una selección local | Asociación identificable de una marca con una selección temática o ciudad | Acuerdo específico por período y entregables; requiere implementar la identificación del patrocinio antes de venderlo | Alcance medido y clics; sin prometer ventas o asistencia |
| Servicio presencial de operación | Apoyo de preparación, lista y recepción en un evento | Honorario de servicio por alcance acordado | Incidencias, tiempo de acceso y horas de trabajo reales |

La primera oferta ya tiene una solicitud persistida y un mecanismo existente de activación de destacados. Las otras son propuestas comerciales: no equivalen a suscripciones activadas, staff delegado, anuncios instrumentados ni patrocinios publicados. No vender capacidades que todavía no estén entregadas. Una verificación de identidad no debe convertirse en una insignia comprable.

## Oferta piloto propuesta, no tarifa aprobada

Probar con pocos organizadores un servicio puntual y un paquete recurrente. Pedir primero qué necesitan, acordar qué espacio y cuántos días se pueden entregar, y registrar coste de atención y satisfacción. Los precios deben validarse con esas conversaciones. Como hipótesis de prueba, se puede presentar una propuesta de promoción puntual entre RD$1,000 y RD$2,000 y un acompañamiento mensual entre RD$2,500 y RD$5,000, ajustados al trabajo y la audiencia medible. Estas cifras no son precios de mercado investigados, no se activaron en la app y no garantizan demanda.

Ejemplo aritmético de ingresos brutos, no pronóstico: 8 acuerdos de RD$2,500 y 6 promociones de RD$1,500 suman RD$29,000. Para decidir si compensa, restar infraestructura, soporte, producción, captación y demás costes reales. Si no hay audiencia ni entrega diferenciada, no cobrar por una promesa de exposición. En ese caso vender trabajo concreto de acompañamiento y aprender qué parte resuelve un dolor real.

## Flujo comercial mínimo real

1. El organizador publica un evento público y vigente siguiendo las reglas de aprobación.
2. En `/organizers` elige uno de sus eventos y envía un objetivo o nota. El servidor valida titularidad, estado y longitud. Reintentos no duplican la solicitud ni activan publicidad.
3. El equipo revisa disponibilidad y prepara una propuesta con fechas, ubicación, entregables y presupuesto. La solicitud por sí sola no prueba que alguien la haya revisado.
4. La aceptación y el pago directo se registran mediante el proceso operativo que se acuerde. No se introducen credenciales bancarias ni números de tarjeta en el formulario público.
5. Sólo un administrador autorizado activa el destacado con su vencimiento. La solicitud no aumenta el ranking orgánico ni marca el evento como pagado.
6. Se entrega un informe con datos disponibles. Si no existe seguimiento de impresiones o conversiones atribuibles, indicarlo y no fabricar números.

Antes de vender a escala hace falta responsable comercial, canal de contacto, registro de acuerdos/pagos externos, identificación visible de campañas pagadas y métricas de entrega. El módulo de administración reservado a Antigravity debe incorporar o confirmar ese circuito. No se ha modificado su panel en esta revisión.

## Cómo mantener el producto atractivo para el público

- Explorar y ver un evento público sin cuenta; pedir autenticación en la acción que la necesita y conservar el destino.
- Un clic explícito para confirmar después del regreso del login; nunca confirmar por abrir un enlace compartido.
- «¿Qué hay hoy?» conserva ciudad o destino y muestra las siguientes doce horas, sin recomendar otro día dentro de esa vista.
- Separar inscripciones, entradas pagadas y check-in real. El serrucho muestra recepción manual, compromisos pendientes y referencias por revisar.
- Alertas sociales sólo entre amigos mutuos: quien asiste permite compartir y quien recibe permite planes de amigos. El permiso push es independiente. La implementación piloto limita candidatos a 50 por RSVP y una alerta de plan por destinatario y día UTC mediante clave única; no es un sistema de fanout masivo.
- Las recomendaciones mezclan afinidad explícita, historial, cercanía al punto elegido y popularidad confirmada. La primera selección favorece variedad de organizadores; no se vende ese ranking orgánico. El conjunto candidato sigue limitado a 300 próximos eventos, por lo que no se declara una recomendación global exhaustiva.
- Los ajustes de privacidad/notificaciones se leen del servidor, guardan sólo el campo cambiado, muestran errores y descartan respuestas antiguas de otra cuenta. Mostrar ubicación en un perfil no activa GPS.

## Piloto de treinta días

Empezar con una ciudad y un conjunto pequeño de organizadores que puedan traer planes reales y su audiencia. Semana 1: cerrar recorridos, datos correctos y soporte. Semana 2: acompañar publicaciones y recoger objeciones. Semana 3: probar propuestas de promoción con entregables medibles. Semana 4: revisar cuántos organizadores repiten, cuánto trabajo consume cada acuerdo y si los usuarios regresan a buscar planes. Escalar sólo lo que se pueda operar y medir.

Medir por separado: visitantes que abren un detalle; personas que confirman; asistencia con check-in verificable; organizadores que publican otra vez; solicitudes de promoción; propuestas aceptadas; dinero realmente recibido por servicios; coste y tiempo de atención. No atribuir compras externas sin una integración que lo pruebe. Las notificaciones no sustituyen retención y no deben convertirse en mensajes repetidos o falsos.

## Referencias y límites

Eventbrite documenta herramientas opcionales de marketing y publicidad además de publicar eventos: https://www.eventbrite.com/help/en-us/articles/193833/%3B/ . Meetup permite registrar transacciones manuales en su página de dinero: https://help.meetup.com/hc/en-us/articles/360002866392-Managing-a-group-s-Money-page . Estos precedentes apoyan explorar el modelo; no demuestran que los precios o la demanda sean iguales en República Dominicana.

No hay promesa de monetización al 100 %, ingresos automáticos ni aplicación certificada para producción. Falta validar disposición a pagar, operación comercial, métricas de campañas y prueba física del QR. El cobro dentro de EventNow seguirá desactivado sin configuración de pasarela, incluso si sólo se fuerza la bandera de pagos.
