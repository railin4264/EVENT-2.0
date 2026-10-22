# Vigencia de ideas y navegación compartida

## Vigencia

El formulario web permite reunir apoyos durante 3, 7, 14, 30 o 60 días; el valor inicial es 14. La API admite enteros entre 3 y 60 y rechaza plazos inválidos.

Las tarjetas muestran la fecha límite y los días restantes. Se distinguen ideas activas, vencidas y convertidas en evento. Al vencer se bloquean nuevos apoyos, condiciones, propuestas y colaboraciones; alcanzar el quórum no crea un evento ni confirma asistencia automáticamente. Una idea convertida ofrece acceso al evento vinculado.

El archivo es una vista calculada: no elimina registros ni cambia sus fechas al consultarlos. Las ideas antiguas sin `quorumDeadline` usan 14 días desde `createdAt`, por lo que dejan de permanecer activas indefinidamente. La misma regla se aplica al listado, demanda, operaciones de ideas, aportes comunitarios y colaboración con patrocinadores. El índice definido es normal, no TTL.

Web permite consultar Activas, Vencidas y Convertidas en evento. Móvil muestra fecha de vigencia y filtros de archivo, con estados de carga y error y colores adaptados al tema. El registro de propuestas y los apoyos anteriores se conserva.

## Navegación

Se identificaron dos menús independientes: el del inicio y el de las pantallas interiores. Ahora `SiteSections` y `SITE_SECTIONS` mantienen los destinos públicos compartidos:

- Eventos, mapa y comunidades como accesos principales.
- Tengo un rato libre, planes en grupo, ideas, organizadores, suplidores, pasaporte e historias dentro de Más planes.
- Con sesión se agregan entradas, feed y chat.

Se conserva la barra inferior móvil. El menú compartido complementa sus accesos. Ofrece indicador de sección activa, foco visible, cierre al navegar, cierre al tocar fuera y Escape con retorno de foco. La altura del menú se limita al espacio de pantalla.

## Verificación

- 17 tests web aprobados para inicio, navegación y sesiones/estados de ideas.
- 68 tests API distintos aprobados para ideas, propuestas, comunidad y patrocinadores. Incluyen archivo de ideas antiguas, bloqueo de apoyo vencido, plazo elegido e ideas vencidas excluidas de colaboraciones. Se usó base temporal.
- 4 tests móvil aprobados para condiciones y filtro de vencidas.
- TypeScript web/móvil, lint API y compilación de producción web completados.
- Navegador real a 1440 y 390 px: inicio, ideas y planes ofrecen exactamente las mismas 10 secciones públicas, sin desbordamiento horizontal.
- API local: filtros open, expired y launched responden HTTP 200. La base local no contiene ideas en este momento; las tarjetas y operaciones con contenido se verificaron con fixtures en pruebas.

No se sembraron ideas ni se borraron registros del usuario. No se ha comprobado este cambio en el Samsung físico ni se ha generado una nueva APK.

Web activa con `NEXT_DIST_DIR=.next-ideas-nav-20261021`; se conservaron 44 recursos estáticos anteriores para las pestañas abiertas. Registros en `E:/CodexBuilds/audit-20261020/ideas-nav-*`.
