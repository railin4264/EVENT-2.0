# Nuevas funciones de EventNow

Actualización del inventario: existen cambios posteriores a la primera entrega, incluidos mesa para quienes van solos, coros espontáneos, ruleta, pasaporte y serrucho. Antes de crear otra función, consultar `FEATURE-INVENTORY-AND-PSYCHOLOGY-2026-10-16.md`. La existencia de rutas y pantallas no certifica su funcionamiento completo.

## 1. Arma el plan con tu gente

**Estado: primera versión implementada en web y API; validación local completada para el alcance descrito.**

Entrada desde la portada y la navegación: `/plans`. Una persona con cuenta elige de dos a cinco eventos y un plazo de uno a siete días. Se genera una URL aleatoria compartible. Sus invitados votan sin registrarse y pueden cambiar su voto mientras siga abierta la votación. Los resultados son agregados; no se publican identidades ni listas de participantes.

Cada cuenta tiene un voto. Los invitados se reconocen por una cookie firmada HttpOnly: borrar cookies o cambiar de navegador permite otra identidad invitada. Es una herramienta para coordinar amigos, no una elección con identidad verificada. Límite de 1.000 identidades por votación, 20 votaciones nuevas por creador/día y límite de peticiones por IP.

Solo el creador puede confirmar una opción disponible entre las más votadas; resuelve los empates. La confirmación cierra los votos de forma atómica. Cada persona tramita su entrada en el evento y puede descargar un archivo de calendario. Votar no reserva ni cobra entradas.

Para compartir opciones sin cuentas solo se admiten eventos públicos futuros sin restricciones de edad. No se incluyen coordenadas y se ocultan direcciones secretas. Si un evento deja de ser público/disponible, se retira su información de la votación. En producción, web y API deben estar en el mismo sitio (por ejemplo, subdominios del mismo dominio) para conservar la cookie invitada con SameSite=Lax.

API: `POST /api/plans`, `GET /api/plans/mine`, `GET /api/plans/:token`, `POST /api/plans/:token/vote`, `POST /api/plans/:token/decide`. Disponibles también bajo `/api/v1`.

Verificación: nueve pruebas de API aprobadas en MongoDB temporal, 15 pruebas unitarias web aprobadas (dos nuevas para calendario), TypeScript y compilación de producción aprobados. ESLint de los archivos nuevos del backend sin errores. Revisada la pantalla real de creación/estado vacío en escritorio y a 390 px, sin desbordamiento horizontal; el flujo de votos y cierre se comprobó por API, no con una sesión de navegador autenticada. Captura: `group-plans-2026-10-16.jpg`.

Se reparó un cierre de función faltante en `backend-api/src/routes/gamification.js`, que impedía importar la API con los cambios recientes. La regresión completa del backend aprobó descubrimiento, planes en grupo y seguridad antes de quedarse sin progreso. Se detuvo; **no se considera una ejecución completa aprobada**. Registros de esta entrega: `logs/group-plans-tests.log`, `group-plans-web-tests.log`, `group-plans-build.log` y `group-plans-backend-full.log`.

## 2. Quiero ir, pero voy solo

**Estado actualizado: base ya presente en la mesa de asistentes solos y en coros espontáneos. Ampliar esos flujos; no crear un tercer sistema de grupos.**

Grupos voluntarios vinculados a un evento y con aforo pequeño. Una persona solicita entrar; el anfitrión aprueba. Los integrantes acceden a un chat del grupo y a un punto de encuentro compartido. Nadie aparece como disponible ni se agrega automáticamente.

Criterios: abandonar/bloquear/denunciar desde el grupo, evitar contacto entre edades incompatibles, ocultar teléfono y ubicación precisa, moderación y límites de invitaciones. La solicitud no equivale a entrada comprada. Medir solicitudes aceptadas y encuentros confirmados, sin publicar identidades.

## 3. De la idea al evento con quórum

**Estado: existe radar de ideas, apoyo y lanzamiento; ampliación por quórum pendiente.**

Añadir objetivo de interesados, plazo y estado «objetivo alcanzado». El organizador propone fecha, condiciones y precio final, y quienes apoyaron reciben una invitación para confirmar. Alcanzar el quórum no cobra ni convierte apoyos en reservas automáticamente.

Criterios: conteos atómicos de apoyo, un apoyo por cuenta, notificaciones sin duplicados y transición al evento sin perder la relación con la idea. Medir ideas que alcanzan objetivo y posteriores asistencias.

## 4. Tengo dos horas y RD$1.000

**Estado actualizado: la ruleta ya ofrece selección por ambiente, zona y gratuidad. Ampliarla con presupuesto numérico y horario; no crear otro recomendador paralelo.**

Formulario con presupuesto por persona, moneda, horario disponible, zona/radio y compañía. Devuelve pocas opciones con motivos concretos: precio conocido, horario compatible y distancia aproximada. La ubicación se solicita únicamente por acción del usuario.

Criterios: no sumar monedas distintas sin conversión explícita, diferenciar entrada de transporte/comida/cargos, no inventar duración de eventos ni tiempo de traslado. Si faltan datos, indicarlo y evitar presentar compatibilidad como garantizada.

## 5. Recuerdos compartidos del encuentro

**Estado: propuesta definida; no implementada en esta entrega.**

Álbum privado para asistentes confirmados, con permiso explícito para compartir cada foto. Solo integrantes autorizados pueden verlo; el autor puede retirar sus imágenes y las personas fotografiadas pueden reportar o solicitar retirada.

Criterios: verificación de asistencia, autorización en cada lectura/descarga, eliminación de metadatos de ubicación, validación real de imágenes y límites de almacenamiento. No reutilizar la visibilidad pública de historias como sustituto de un álbum privado.

## Prioridad

Validar la votación con grupos reales; después ampliar el radar con quórum y el buscador por presupuesto. Los compañeros y álbumes requieren cerrar primero sus permisos y herramientas de moderación. Los dos hallazgos de privacidad documentados en `ANTIGRAVITY-VALIDATION-2026-10-16.md` deben resolverse antes de publicar las funciones afectadas.
