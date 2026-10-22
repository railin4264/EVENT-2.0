# Inventario para evitar duplicados y siguientes hipótesis de producto

Revisión de código del 16 de octubre de 2026, actualizada tras las incorporaciones sociales del mismo día. El checkout reúne cambios de varias sesiones; sin un commit específico no se atribuye la autoría de cada línea a Antigravity. Presencia de implementación no equivale a certificación de producción. Las correcciones y pruebas de esta pasada están en `ANTIGRAVITY-VALIDATION-2026-10-16.md`.

## Qué reutilizar

| Necesidad | Implementación observada | Decisión |
| --- | --- | --- |
| Elegir con amigos | `GroupPlan`, `routes/plans.js`, `app/plans` y detalle por token: creación, votos, cierre, calendario. La página ahora también incluye coros. | Mantener una entrada «Planes» y ampliar lo existente. |
| Salir sin compañía | Mesa en detalle de evento, `/events/:id/solo-toggle`, `/solo-attendees`, `SpontaneousCoro` y `/plans/spontaneous`: crear, unirse, salir. | Ya existe base. Completar acogida, permisos y moderación aquí; no crear otro módulo equivalente. |
| Descubrir sin decidir entre muchas opciones | `RouletteModal.tsx` y `/events/roulette`: ambiente, zona, filtro gratuito y frase para romper el hielo. | Ampliar presupuesto/horario y calidad de explicación; evitar otra ruleta. |
| Identidad/progreso local | `app/passport` y `/gamification/passport`: sellos, niveles y ofertas incluidas en código. | Reutilizar pasaporte. Presencia de ofertas hardcodeadas no acredita convenios reales ni canje funcional. |
| Demanda comunitaria | `ActivityIdea`, `routes/ideas.js`, radar y página de ideas: apoyo, demanda, lanzamiento y notificaciones. | Falta objetivo explícito de interesados/plazo; extender este modelo para quórum. |
| Aportaciones para un plan | `Serrucho`, `routes/serrucho.js`, `app/serrucho/[code]`: reparto/aportaciones y confirmación manual. | No duplicar repartidor. La marca manual de pagado no equivale a pago bancario verificado. |
| Historias y encuestas | Modelo/rutas de historias con contenido temporal y encuesta. | Reutilizar cuando el alcance sea historia/encuesta, conservando separación de la votación de planes. |
| Álbum de asistentes | `EventMemory` y `EventMemoriesSection`: subida privada en Mongo/GridFS, lectura autenticada, reacciones y borrado. Los enlaces públicos anteriores se ocultan y requieren nueva subida. | Reutilizar; completar moderación y validación de despliegue/escala. Detalles en `PRIVATE-ALBUM-2026-10-16.md`. |
| Reconexión mutua | Ahora existen `EventConnection`, candidatos, selección confidencial y coincidencias. Se corrigió la resolución concurrente. | Reutilizar; completar consentimiento, bloqueo/denuncia y candidatos procedentes de compras. |
| Acompañantes y boletas extra | `EventPlusOne` y su sección permiten publicar, postularse y aceptar. | Se corrigieron privacidad de solicitudes y aceptación concurrente; falta verificar transferencia de boletas y moderación. |
| Afters y canciones | `EventAfter` y `EventSong` ofrecen propuestas y votos. | Ya existen; revisar límites contra abuso, enlaces, paginación y ciclo de vida. |

La idea original «voy solo» coincide parcialmente con dos mecanismos ya presentes. El pendiente real es completar la experiencia y su control de acceso. La propuesta «dos horas y RD$1.000» coincide parcialmente con la ruleta; la diferencia pendiente son cantidades, moneda y compatibilidad de horario.

## Hipótesis nuevas centradas en las personas

Son hipótesis para comprobar en EventNow. La evidencia psicológica citada no demuestra por sí sola que una interfaz concreta aumente su conversión.

### P1. Primera visita con bienvenida concreta

- Fricción: querer ir y no saber qué ocurrirá al llegar.
- Ampliar la mesa/coro existente con una persona anfitriona voluntaria, una imagen del acceso público y una explicación de los primeros diez minutos: dónde esperar, quién recibe y cómo incorporarse.
- Mostrar compromiso de bienvenida solo cuando el anfitrión lo confirme. Una insignia automática no garantiza acompañamiento.
- Evaluar asistencia efectiva y valoración «me resultó fácil incorporarme» entre personas en su primera visita. Incluir abandono/denuncias en la evaluación.

Las investigaciones sobre el «liking gap» observaron que las personas subestimaban cuánto disfrutaban de su compañía sus interlocutores. Esto motiva probar apoyos para iniciar conversaciones; no garantiza que cada encuentro sea positivo. Fuente primaria: [Boothby et al., 2018](https://journals.sagepub.com/doi/10.1177/0956797618783714).

### P1. Del interés a un plan concreto

- Fricción: guardar un evento y posponer indefinidamente la decisión.
- Extender confirmación/calendario: elegir cuándo salir, punto de encuentro y recordatorio voluntario; añadir alternativa explícita si el plan se cancela o llueve cuando corresponda.
- Mantener recordatorios editables y cancelables. No tratar un favorito como reserva.
- Evaluar asistencia de usuarios interesados con y sin esta ayuda, además de cancelaciones y desactivación de recordatorios.

La investigación de intenciones de implementación estudia planes concretos sobre cuándo, dónde y cómo actuar. Nuestra aplicación a eventos es una hipótesis de producto. Fuente primaria: [Gollwitzer y Sheeran, 2006](https://www.socmot.uni-konstanz.de/publications/implementation-intentions-and-goal-achievement-meta-analysis-effects-and-processes).

### P2. «Me gustaría volver a coincidir»

Actualización: la base ya fue implementada; estos puntos son criterios para completar el módulo existente, no una propuesta de un segundo sistema.

- Fricción: una conversación agradable termina y nadie se anima a proponer otra salida.
- Después de asistencia confirmada, ofrecer una selección privada y voluntaria de personas con quienes repetir. Solo revelar la coincidencia si ambos lo eligen; permitir desactivar, bloquear y denunciar.
- Reutilizar cuentas, relaciones y chat existentes. No publicar quién rechazó o no seleccionó a alguien.
- Evaluar invitaciones aceptadas y una segunda asistencia compartida, incluyendo bloqueos y reportes. No inferir intenciones románticas.

### P2. Un ritmo propio dentro del pasaporte

- Fricción: recomendaciones que no encajan con el tiempo o energía disponibles.
- Añadir una meta flexible elegida por la persona («un plan tranquilo cada quince días», «probar algo nuevo este mes»), integrada en el pasaporte y sus recomendaciones.
- Conservar avances tras pausas. Personalizar con preferencias declaradas; evitar inferir salud mental o situación personal a partir de actividad.
- Evaluar satisfacción y repetición voluntaria de asistencia, con frecuencia de avisos controlada por el usuario.

## Criterio de diseño y evaluación

Priorizar pertenencia, claridad, autonomía y cumplimiento de lo prometido. Usar conteos de asistencia y disponibilidad reales. Las recompensas/cupos deben corresponder a condiciones verificables.

La ruleta actual añade una espera artificial de 1,4 segundos con un comentario sobre «dopamine thrill». Eso no acredita beneficio psicológico. Su utilidad debe evaluarse por la calidad del plan encontrado y la asistencia posterior.

Tampoco asumir que reducir opciones siempre mejora decisiones: una [metaanálisis de sobrecarga de elección](https://doi.org/10.1086/651235) encontró un efecto medio prácticamente nulo con variación entre contextos. Probar opciones acotadas en nuestro flujo, sin presentarlo como regla universal.

Orden recomendado: cerrar privacidad e integración de los módulos nuevos, completar bienvenida y concretar asistencia; después evaluar la reconexión ya presente y el ritmo personal. Terminar y probar los mecanismos existentes antes de sumar otra ruleta, otro grupo o un segundo pasaporte.
