# Diseño, acceso y planificación de viaje

## Aplicado

- La página de planes mantiene sus funciones, con pestañas de tamaño táctil, estado seleccionado accesible y un acento consistente.
- Login web usa superficies del tema, una presentación más limpia y acceso social antes del formulario cuando el proveedor está habilitado.
- Registro sugiere un usuario a partir del nombre. Personalizarlo queda en un bloque opcional; un nombre elegido por el usuario no se sobrescribe. Se mantienen fecha de nacimiento, contraseña y consentimiento existentes.
- Google conserva el flujo OAuth ya implementado: estado de un solo uso, verificación en servidor y retorno al destino. Solicita sólo identidad, perfil y correo; no exige un nuevo consentimiento offline en cada acceso. No se ofrece el proveedor con configuración incompleta.
- Se corrigió la referencia al icono Sparkles del botón de flyers de administración.

## Recuperación de estilos

Se comprobó `/plans` contra el servidor local: CSS y JavaScript respondieron sin 404 y la tipografía calculada correspondía a la aplicación. La captura del usuario muestra una carga sin estilos, no el diseño final.

Se añadió un script temprano al HTML para recuperar fallos de CSS y chunks de la aplicación. Recarga como máximo una vez por minuto, no actúa sin conexión ni por imágenes o recursos externos y evita bucles. La publicación de esta versión conserva además los archivos estáticos con hash de la versión anterior para pestañas ya abiertas. No se sustituye contenido privado por páginas cacheadas.

## Viajes para eventos futuros

Web y móvil permiten ajustar adultos, noches antes y noches después del evento. Airbnb y Booking reciben las fechas sugeridas y el tamaño del grupo. El cálculo utiliza la zona horaria declarada del evento y no propone llegadas anteriores a hoy.

Trivago abre la búsqueda del destino: las fechas deben confirmarse allí. No se integra inventario, precios, reservas, afiliación ni cobros de esas plataformas. Uber abre una consulta de transporte, no una reserva futura ni una solicitud automática.

## Google: configuración pendiente

La instalación local no tiene `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` ni `GOOGLE_OAUTH_REDIRECT_URI`. Por ello no se certifica una entrada real con Google ni se muestra un botón que fallaría.

Para habilitar la web:

1. Crear un cliente OAuth de aplicación web en el proyecto de Google Cloud del negocio.
2. Registrar exactamente `http://localhost:3001/oauth/google/callback` para las pruebas locales. En producción se registrará el dominio HTTPS definitivo.
3. Guardar los tres valores anteriores sólo en el entorno del backend y reiniciar la API. El secreto no se envía al frontend ni se publica en el repositorio.
4. Probar cuenta nueva, cuenta existente, cancelación y regreso al evento con una cuenta de prueba autorizada.

[Configuración oficial de Google OAuth para servidor web](https://developers.google.com/identity/protocols/oauth2/web-server) y [OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).

La autenticación nativa de Google en Android/iOS requiere una integración y configuración específicas. No se ha añadido ni certificado en esta entrega; el registro y login por correo de móvil siguen disponibles.

## Validación de la entrega

- 29 pruebas web distintas aprobadas: acceso, registro, proveedores, planes, alojamiento y recuperación de recursos.
- 18 pruebas API OAuth aprobadas, con identidades firmadas de prueba; no se usó una cuenta real de Google.
- 10 pruebas móvil aprobadas para el panel y las fechas del viaje.
- TypeScript web/móvil y compilación de producción web completados. Lint de los archivos OAuth modificados sin errores.
- Login, registro, planes, planificación y detalle de evento revisados en navegador con sus hojas de estilo y sin excepciones.
- El selector de adultos se comprobó contra un evento existente: el enlace de Airbnb cambió a 8 adultos con fechas incluidas.
- Se simuló un fallo de CSS y se comprobó la recarga de recuperación en navegador. El registro a 390 px no desborda horizontalmente y sugiere el usuario sin escribirlo manualmente.
- La versión activa usa `NEXT_DIST_DIR=.next-design-auth-20261021`. Conserva 31 recursos estáticos de la versión anterior para pestañas abiertas.

Registros: `E:/CodexBuilds/audit-20261020/design-auth-*`. Capturas de revisión en `.playwright-mcp/login-redesign-20261021.png` y `.playwright-mcp/register-redesign-mobile-20261021.png`.
