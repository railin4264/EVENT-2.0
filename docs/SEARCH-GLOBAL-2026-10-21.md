# Búsqueda global · 21 octubre 2026

Implementación compartida en comportamiento y contrato entre API, web y móvil.

## Funciones

- Tipos: Todo, Eventos, Tribus, Personas y Creadores/anfitriones.
- Busca nombres, títulos, descripciones y usuarios; acepta `@usuario` y palabras con o sin tildes.
- Identifica anfitriones por rol creator/organizer o por autoría real de eventos públicos visibles para el solicitante. No cambia roles ni inventa verificación de cuentas.
- Resultados con destinos específicos: evento, perfil de persona o tribu. En móvil, los destinos protegidos conservan su ruta después de iniciar sesión.
- Solicitudes con debounce, cancelación y aislamiento por búsqueda, filtro, página y cuenta. Vacío y fallo de conexión tienen estados diferentes y reintento.
- Paginación en servidor. El límite se aplica por tipo de entidad; en Todo pueden aparecer resultados de varios tipos en una página.
- La web conserva búsquedas recientes por cuenta, guardadas sólo al enviar la consulta, con borrado y tolerancia a almacenamiento corrupto o no disponible.
- La web conserva filtros de categoría, lugar, fechas y precio para eventos; la categoría usa la taxonomía existente.
- Los campos e iconos de búsqueda de Navbar abren `/search`; el móvil lo ofrece desde Inicio, el centro de funciones y Explorar.

## Privacidad y compatibilidad

Los tres endpoints `/search`, `/search/global` y `/search/suggestions` utilizan los mismos filtros de visibilidad. El endpoint principal devuelve una lista canónica `results`, que consumen web y móvil. Conserva `data` para compatibilidad, y `/global` conserva sus grupos.

Se excluyen eventos privados, borradores, perfiles inactivos/privados y tribus privadas/secretas. Se aplica la restricción de edad existente. Las ubicaciones secretas se proyectan sin calle ni coordenadas; el filtro de lugar tampoco consulta su calle. Las proyecciones de usuarios no incluyen correo, contraseña, teléfono o tokens.

Se validan tipos, longitud de consulta, paginación, fechas y precios. Las expresiones regulares del usuario se buscan literalmente. Se limita la frecuencia y se indica `Cache-Control: private, no-store`. El reconocimiento de anfitriones consulta sólo las páginas candidatas o una agregación con límite temporal; esto no sustituye una prueba de carga en producción.

El endpoint de tendencias deja de presentar términos estáticos como popularidad observada. No se añadieron métricas de tendencias ficticias.

## Verificación confirmada

| Comprobación | Resultado |
| --- | --- |
| Suite móvil completa | 53 suites, 250 pruebas aprobadas |
| Suite web completa | 84 archivos, 490 pruebas aprobadas y una omitida |
| API de búsqueda, Mongo temporal | 17 pruebas aprobadas |
| Tipos móviles | Aprobados |
| Compilación web, tipos y lint | Aprobados |
| Exportación Android | Aprobada; Hermes/recursos, no APK |
| Lint móvil de los cinco archivos revisados | Cero errores y advertencias |

La prueba API usa `--coverage=false` para verificar esta ruta; no aprueba ni modifica el gate global de cobertura. No se arrancó la API principal, no se usó la base real y no se certificó el recorrido en el Samsung ni una carga de producción.

Evidencia local en `E:/CodexBuilds/audit-20261020/`: `search-api-tests.log`, `search-mobile-full.log`, `search-web-full.log`, `search-mobile-types.log`, `search-web-build.log`, `search-mobile-lint.json`, `search-api-lint.json`, `search-mobile-export.log` y `search-mobile-android/metadata.json`.
