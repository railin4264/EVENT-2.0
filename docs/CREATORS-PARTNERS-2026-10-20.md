# Herramientas comunitarias, anfitriones y colaboradores

Implementación del 20 de octubre de 2026. Cambios locales; este documento no certifica un despliegue ni una prueba física en Samsung.

## Seis ideas conectadas

1. **Yo aporto:** el anfitrión define aportes con cupos y acepta o rechaza ofrecimientos. Disponible para eventos e ideas. Ofrecer ayuda no confirma asistencia automáticamente.
2. **¿Lo repetimos?:** después del evento, participantes con una inscripción o pedido válido pueden expresar interés y días preferidos. No se presenta como una prueba de presencia física.
3. **Nos encontramos aquí:** punto público opcional, participación voluntaria y consentimiento separado para compartir nombre. El punto caduca; al cambiarlo se reinician los consentimientos.
4. **Tengo un rato libre:** búsqueda pública por ventana horaria, ciudad opcional y minutos de traslado indicados por la persona. Sólo incluye eventos públicos con hora final conocida que caben en la ventana. No calcula tráfico.
5. **Tenemos público, falta espacio:** necesidades de espacio, equipos o difusión asociadas a una actividad; directorio de espacios y propuestas de colaboración.
6. **De conversación a borrador:** texto pegado voluntariamente se convierte en campos editables. Guardar genera un borrador privado; publicar requiere entrar en creación y enviar explícitamente. No se leen chats ni portapapeles automáticamente.

## Anfitriones y patrocinadores

El espacio de colaboradores permite publicar necesidades, elegir una propuesta y mantener una conversación privada entre las dos partes. El colaborador registra una entrega y el anfitrión la confirma. La entrega declarada y su confirmación son estados distintos.

Incluye plantillas editables de espacio accesible, equipos, hidratación y difusión; kit descargable e imprimible; reporte CSV con protección frente a fórmulas de hoja de cálculo. Los reportes no exportan contactos ni identidades de asistentes ni inventan alcance, ventas o retorno publicitario.

No hay cobros, custodia de dinero, liquidaciones ni contratos automáticos. No se requiere una pasarela para estas herramientas.

## Accesos

| Función | Web | Aplicación móvil |
| --- | --- | --- |
| Aportes, encuentro y repetición | `/community/events/:id` | `/community-event/:id` |
| Aportes a ideas | `/community/ideas/:id` | `/community-event/:id?scope=ideas` |
| Colaboradores | `/partners` | `/partners` |
| Tiempo libre y borradores | `/planning-tools` | `/planning-tools` |

Hay accesos desde inicio, detalle de evento, ideas y herramientas de organizadores. Las mutaciones requieren sesión. El regreso tras iniciar sesión conserva el destino permitido. Las respuestas privadas no se deben almacenar en caché compartida.

La API expone `/api/community-actions`, `/api/partners` y `/api/planning-tools`, además de sus montajes versionados existentes. Se verifican propiedad, visibilidad, restricciones de edad y acceso a conversaciones privadas. Los cupos, la selección de propuesta y el límite de borradores tienen protecciones frente a concurrencia.

## Creación de eventos

La creación móvil envía JSON conforme al contrato del API, convierte la zona horaria IANA a UTC y rechaza horas ambiguas o inexistentes. Las imágenes seleccionadas usan el endpoint de subida; si éste no está configurado se informa el error y se puede retirar la imagen.

En web, al importar un borrador con una zona diferente a la del dispositivo, se exige revisar la fecha y hora local: no se cambia silenciosamente la zona. El servidor conserva la revisión pendiente para organizadores no verificados.

## Validación realizada

- API: 54 pruebas aprobadas, incluyendo integración con base de datos efímera, permisos, concurrencia y recorrido de borrador a envío explícito del evento.
- Móvil: 43 pruebas aprobadas, incluyendo retornos de autenticación, cambios de cuenta, aportes, colaboradores, borradores y creación.
- Web: 65 pruebas aprobadas y una prueba anterior omitida, incluyendo regresiones de inicio, ideas, detalle y creación; exportaciones seguras; búsqueda pública y borradores privados.
- TypeScript completo aprobado en web y móvil. Lint focalizado aprobado en los módulos nuevos; comprobación sintáctica del script de índices aprobada.
- Evidencia de ejecución local: `E:/CodexBuilds/creators-20261020/`.

Son 162 pruebas aprobadas en estos conjuntos; no equivalen a una certificación de toda la aplicación.

## Pendiente antes de producción

El script `backend-api/scripts/mongodb-indexes.js` incluye los índices de estos modelos. No se ejecutó contra una base real. Revisar y aplicar esos índices antes de habilitar tráfico; son necesarios, especialmente, para unicidad y cupos concurrentes de borradores.

Quedan pendientes el recorrido visual con los servicios principales en ejecución, la prueba física de móvil y la comprobación de la configuración real de subida de imágenes. Una revisión automática anterior rechazó el arranque del API principal con «blocked by policy»; no se eludió ese bloqueo.
