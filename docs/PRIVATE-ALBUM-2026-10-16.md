# Álbum: almacenamiento y lectura privada

Implementación local del 16 de octubre de 2026. Sustituye la subida pública de fotos del álbum. No modifica las imágenes públicas de perfiles, eventos o publicaciones.

## Contrato

- `POST /api/events/:id/memories`: autenticación Bearer y participación confirmada, o rol organizador/admin. Multipart con un archivo `memoryImage` y comentario opcional `caption` de hasta 200 caracteres. JPEG, PNG o WebP; máximo 10 MB y 20 millones de píxeles de entrada. No se aceptan URLs externas ni referencias arbitrarias a archivos.
- La foto se decodifica, orienta y vuelve a codificar como JPEG de hasta 2400 × 2400. Se descartan metadatos EXIF/GPS y el nombre original. El límite local de subida es de 30 peticiones por cuenta y hora, además del limitador general existente.
- Los bytes se guardan en las colecciones GridFS `privateMemories.files` y `privateMemories.chunks` de la misma conexión MongoDB. No pasan por `/uploads` ni por la subida pública de Cloudinary. No hay alternativa pública si el almacenamiento privado falla.
- `GET /api/events/:id/memories/:memoryId/image`: valida sesión, evento, restricciones de edad, asistencia/compra y aprobación de la foto en cada petición. También comprueba que el archivo pertenezca al recuerdo y al evento. Devuelve `image/jpeg` con `private, no-store`, sin token en la URL.
- El listado devuelve una ruta de API autenticada, sin identificadores de almacenamiento, enlaces públicos ni reportes de moderación. El navegador obtiene los bytes con Authorization y crea una URL temporal; la libera al salir/cambiar de cuenta. Las fotos fuera de la zona visible esperan antes de descargarse.
- El cliente respeta `no-store` y no conserva blobs en la caché compartida de API. Las consultas de álbum se distinguen por cuenta. Las cancelaciones de peticiones no generan reintentos ni avisos de fallo de red.
- El detalle del evento reconoce compras confirmadas para habilitar la sección. Las respuestas autenticadas eluden la caché interna del servidor para no conservar asistencia/permisos después de un reembolso o cancelación; las lecturas públicas conservan su caché.
- El borrado elimina primero el recuerdo y después su archivo privado. Si guardar el recuerdo falla tras subir bytes, se intenta compensar eliminando esos bytes.

## Fotos anteriores

Los recuerdos con `imageUrl` pública conservan su registro en la base, pero la API oculta ese enlace y devuelve `imageUnavailable: true`. La interfaz pide volver a subir la foto al álbum privado. No se descargan URLs antiguas desde el servidor ni se borran automáticamente archivos públicos que podrían estar usados en otros lugares.

Esto no retira copias ya publicadas en `/uploads`, proveedores externos, cachés, descargas o capturas. Las personas autorizadas pueden guardar las fotos que ya hayan recibido.

## Operación y límites pendientes

- Los respaldos/restauraciones de Mongo deben incluir ambas colecciones GridFS junto con los recuerdos. El almacenamiento y tráfico de medios aumentarán el uso de la base; medirlos antes de escalar.
- A gran escala, evaluar almacenamiento de objetos privado y entrega autorizada conservando el mismo contrato de permisos. Esta implementación no certifica capacidad de usuarios simultáneos.
- El limitador de subida usa memoria del proceso: debe compartirse al desplegar varias réplicas, como los demás límites de la API.
- Un cierre abrupto entre subir bytes y guardar el recuerdo puede dejar un archivo huérfano. Falta una tarea de reconciliación con periodo de gracia y monitorización de fallos de borrado.
- Falta completar interfaz de denuncias/moderación, cuotas duraderas de almacenamiento, eliminación de cuentas/eventos y el resto de criterios de producción del proyecto.
- La pérdida de permiso bloquea nuevas lecturas; no puede retirar bytes ya descargados. La protección depende también de TLS, base de datos privada y configuración del despliegue.

## Verificación

`backend-api/tests/private-memories.test.js` prueba almacenamiento/lectura de bytes reales con Mongo temporal, eliminación de EXIF, autorización directa del archivo, aislamiento entre eventos, cancelación/reembolso, moderación, borrado, contenido falso/sobredimensionado y compensación ante fallo de guardado.

`eventconnect-frontend/src/lib/api/client-privacy.test.ts` comprueba que respuestas `no-store` y blobs no entren en la caché compartida, conserva la caché pública y verifica que una cancelación no se reintente.

Registros de esta pasada: `logs/private-album-api-tests.log`, `logs/private-album-web-tests.log`, `logs/private-album-web-types.log`, `logs/private-album-lint.log`, `logs/private-album-web-lint.log` y `logs/private-album-web-build.log`. Consultarlos para el resultado final; este documento no sustituye una prueba de despliegue ni de carga.

La comprobación de producción en C: se interrumpió al agotar el espacio. Se conservó el directorio generado `.next` en `E:\CodexBuilds\eventnow-private-album-20261016\workspace-next`, mediante un enlace de directorio desde su ubicación original; los fuentes permanecen en su carpeta. El proyecto necesita que E: esté disponible para usar ese enlace. El intento de compilar una copia de fuentes en E: con dependencias enlazadas entre unidades falló al resolver entradas de Next; no se certifica esa copia. La verificación posterior se ejecuta desde el proyecto original y escribe `E:\CodexBuilds\eventnow-private-album-20261016\workspace-build.log`.

### Resultado al cerrar esta pasada

- Backend: 48 pruebas aprobadas en cinco suites (álbum privado, funciones sociales, aislamiento de caché, checkout y planes), registro `E:\CodexBuilds\eventnow-private-album-20261016\api-final-verification.log`.
- Preservación de la base local: una prueba adicional aprobada. Se retiraron del script de arranque tanto el borrado de locks como el borrado/reinicio automático del directorio ante un fallo. El arranque ahora falla conservando datos. Registro `E:\CodexBuilds\eventnow-private-album-20261016\local-database-test.log`.
- Web: 21 pruebas aprobadas; TypeScript y lint sin errores en las comprobaciones indicadas. El lint backend focalizado termina sin errores y con cinco advertencias por variables sin usar; registro `E:\CodexBuilds\eventnow-private-album-20261016\backend-lint.log`.
- Producción: la compilación del proyecto original generó código correctamente y pasó a recopilar páginas, pero terminó con `PageNotFoundError` para `/_document`. Había otro servidor Next activo sobre el mismo directorio generado. Esa concurrencia puede explicar la inconsistencia; falta repetir una compilación aislada antes de certificarla. Se limitó Next a dos CPUs para contener el uso de recursos.
- Se detectaron modificaciones externas durante la pasada, incluida una edición de `scripts/dev-local.js` a las 18:35, hora de Santo Domingo. Se solicitó coordinación antes de reiniciar el otro proceso. No se atribuyen esos cambios a una persona concreta.
- Se conservó una copia lógica local de las 28 colecciones de desarrollo antes de continuar. No se envió a servicios externos. Las consultas de salud y listado de eventos en el puerto 5000 respondían 200 al cerrar la revisión.
- La prueba visual del álbum autenticado no se completó. La vista abierta se devolvió al inicio. Los resultados anteriores no certifican ese flujo en navegador/móvil ni los servicios reales de publicación.

Referencias técnicas consultadas: [GridFS del driver MongoDB](https://www.mongodb.com/docs/drivers/node/current/crud/gridfs/) y [opciones de entrada de Sharp](https://sharp.pixelplumbing.com/api-constructor/).
