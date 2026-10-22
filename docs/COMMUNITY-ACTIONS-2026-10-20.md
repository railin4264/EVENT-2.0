# Colaboración y encuentros — 20 de octubre de 2026

## Funciones implementadas

- **Yo aporto:** el anfitrión publica necesidades con plazas, cierra o reabre convocatorias y acepta o rechaza ofertas. Cada persona puede enviar una oferta por necesidad y retirarla. Disponible para eventos publicados vigentes e ideas abiertas sin plazo vencido.
- **¿Lo repetimos?:** después del evento, una persona con asistencia confirmada o una orden confirmada/completada con pago registrado como satisfactorio puede pedir otra edición, elegir días, actualizar su respuesta o retirar el interés. Una persona representa un voto. Los días se presentan como agregados; nunca se devuelve la lista de votantes. Los eventos `expired` siguen admitiendo esta demanda.
- **Nos encontramos aquí:** el anfitrión declara un lugar público y una hora futura dentro de las 24 horas anteriores al evento. Sólo personas con asistencia confirmada y el anfitrión pueden apuntarse. Compartir el nombre es una elección separada y desactivada por defecto; los nombres sólo se muestran al grupo y al anfitrión. Cambiar hora o lugar vacía la lista y requiere consentimiento de nuevo.

## Accesos y privacidad

La API verifica estado, edad, privacidad y participación del evento antes de devolver o cambiar información. Las órdenes pendientes, canceladas o reembolsadas no conceden acceso a eventos privados. Las ofertas con nombre y texto son privadas para su autor y el anfitrión; el formulario informa de esa entrega.

El punto y los nombres desaparecen al finalizar el evento, también con la pantalla abierta mediante temporizador y comprobación al volver al primer plano. No se utiliza GPS. Estas funciones no compran ni reservan entradas, no procesan pagos y no envían mensajes a servicios externos.

## Rutas e integración

- API: `/api/community-actions/:scope/:id`, con `scope` igual a `events` o `ideas`.
- Web: `/community/events/[id]`, `/community/ideas/[id]`.
- Móvil: `/community-event/[id]`; para ideas añadir `?scope=ideas`.
- Índice requerido: colección `communityactions`, `{ scope: 1, target: 1 }`, único. El modelo lo declara; la creación del índice en producción depende del procedimiento de despliegue.

Las mutaciones usan comparaciones de versión y reintentos: ofertas simultáneas no duplican participantes ni sobrepasan las plazas aceptadas. Límites de esta primera versión: 20 necesidades por actividad, 50 plazas por necesidad, 100 ofertas por necesidad, 200 personas por encuentro y 10 000 respuestas para otra edición. No se ha realizado una prueba de carga.

## Verificación

22 pruebas focalizadas aprobadas: 14 de API, 5 de web y 3 de móvil. Cubren permisos, eventos privados y restringidos por edad, concurrencia, una respuesta por persona, órdenes verificadas, agregación sin identidades, consentimiento, expiración con pantalla abierta, fallos de red y respuestas tardías de otra cuenta.

Registros en `E:/CodexBuilds/finish-20261019/community-actions.log`, `community-web-tests.log` y `community-mobile-tests.log`. Lint de los archivos de API y web sin errores. La revisión visual y la prueba física del teléfono no forman parte de esta validación. No se arrancó el servicio principal.
