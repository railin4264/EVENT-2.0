# Llegada y hospedaje — rediseño aplicado

Se reorganizaron las opciones añadidas por Antigravity en el detalle del evento, tanto en web como en móvil. Se conservan Uber, Airbnb, Booking, Trivago y Serrucho. Las actividades recurrentes, promociones y tours aparecen en bloques propios.

## Cambios

- Superficies neutras, un acento rosa, mayor espacio y jerarquía de lectura.
- Web adaptable a una o dos columnas, foco visible y enlaces externos identificados.
- Móvil con botones de al menos 50 puntos de alto, texto adaptable y colores para tema claro y oscuro.
- Destino tomado del evento; se eliminan las suposiciones de Santo Domingo y República Dominicana.
- Enlaces inactivos cuando falta el destino; coordenadas validadas, incluidos valores cero.
- Las ubicaciones reservadas no se envían al transporte hasta que el evento identifica al usuario como asistente. Se oculta también el punto de salida del tour mientras siga reservado.
- Fechas sugeridas de alojamiento sólo para eventos futuros con fecha válida; las actividades recurrentes requieren elegir una sesión.
- Copiar y abrir enlaces informan los errores. No se promete reserva ni disponibilidad.
- En móvil se montó el modal de Serrucho que los botones anteriores intentaban abrir sin renderizarlo. El acceso nuevo conserva el regreso al evento tras iniciar sesión.

## Validación

- Web: 35 tests aprobados, incluidos 25 del flujo del detalle.
- Móvil: 9 tests aprobados para destinos y acciones del panel.
- TypeScript de web y móvil sin errores.
- Compilación de producción de web completada.
- Lint móvil sin errores; la pantalla de detalle conserva advertencias por otros imports y estados sin usar.

Registros: `E:/CodexBuilds/audit-20261020/hospitality-*`.

No se ha verificado visualmente este cambio en el Samsung ni se ha instalado una nueva APK. Las pruebas no certifican reservas, viajes ni disponibilidad en proveedores externos. No se ejecutó el seeder ni se verificó el origen de los eventos del informe de Antigravity.
