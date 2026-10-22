# Recuperación de cupos — 15 de octubre de 2026

Las cancelaciones y los reembolsos persistían su estado antes de devolver el cupo. Una interrupción entre ambas operaciones dejaba entradas bloqueadas sin una forma segura de reintentar.

## Comportamiento

- La transición a cancelado o reembolsado guarda también `inventoryReleaseRequestedAt`.
- Cada tipo de entrada guarda un recibo por pedido (`releasedOrderIds`), junto con el cambio de `sold` y `available`, en una única actualización atómica. Repetir la devolución no cambia de nuevo las existencias.
- El pedido recibe `inventoryReleasedAt` cuando terminan todas sus líneas. Se agrupan líneas históricas repetidas del mismo tipo de entrada.
- Una cancelación interrumpida puede reintentarse. Un reembolso ya persistido devuelve el identificador original y completa el inventario sin otra llamada a Stripe.
- El trabajo `orderInventoryRecovery` reanuda las devoluciones pendientes y cancela reservas vencidas cada cinco minutos cuando se inicia el servicio de cron en producción. Se crea detenido; el arranque de producción lo activa.
- Los fallos de una orden se registran y no detienen la recuperación de las demás. Los pedidos históricos sin solicitud explícita quedan excluidos para evitar devolver cupos que ya habían sido liberados.

Los recibos de inventario se conservan para reconocer reintentos tardíos y se excluyen de las consultas normales a entradas. No deben eliminarse sin un procedimiento que preserve esa garantía. Esta recuperación cubre las transiciones persistidas por este flujo; no reconstruye reservas antiguas de origen desconocido.

## Verificación

`npx jest tests/checkout-regression.test.js --runInBand --coverage=false`: 21 pruebas aprobadas. Cinco casos nuevos prueban interrupción entre tipos de entrada, interrupción después de devolver cupo, recuperación concurrente, reembolso reintentado sin Stripe, exclusión de datos históricos y continuidad ante una entrada inexistente.

ESLint aprobado en los cuatro archivos de producción modificados (se omitió únicamente la regla de finales de línea por la mezcla LF/CRLF del checkout de Windows).

Suite funcional completa: 8 suites aprobadas, 130 pruebas aprobadas y una omitida, con `npx jest --runInBand --coverage=false`. Registro: `logs/backend-recovery-full.log`.

No se contactó Stripe ni se ejecutó mantenimiento sobre una base de producción. Las pruebas usan MongoDB aislado y respuestas simuladas de Stripe. El requisito global de cobertura del backend sigue pendiente.
