# EventConnect: verificación de cierre

## Verificado localmente

- Web: compilación de producción con TypeScript y ESLint activados; sin errores.
- Web: siete pruebas unitarias de descubrimiento y redirecciones seguras.
- Navegador: seis casos verificados: cinco de descubrimiento, filtros, diseño móvil, inicialización del mapa, recuperación de errores, acceso protegido, recuperación de contraseña y desafío 2FA inválido; y uno nuevo de registro de entradas y rechazo de un segundo uso. La ejecución aislada aprobó los cinco existentes y el caso nuevo se aprobó por separado tras aislar las peticiones auxiliares de su sesión simulada.
- Móvil: cinco pruebas Jest persistidas y aprobadas para desafío 2FA, formato del código, credenciales verificadas y rechazo de sesiones incompletas. TypeScript sin errores tras integrar 2FA.
- Android: exportación del bundle Hermes completada con Expo 54. Esto no equivale a una APK firmada ni a una prueba en dispositivo.
- API local: listado público de eventos responde HTTP 200 con MongoDB local aislado.
- Backend: 8 suites completas aprobadas, 123 pruebas aprobadas y una omitida. Después, 16 pruebas focalizadas aprobadas, incluidas dos nuevas de admisión; 125 casos distintos verificados en conjunto.
- Seguridad 2FA: las rutas antiguas exigen un desafío temporal firmado tras la contraseña; los códigos de respaldo se consumen mediante una actualización atómica.
- Entradas: validación del QR firmado, control de organizador, uso único concurrente y estado «usado» persistente. El código admite al grupo completo. Si el evento no tiene hora de fin, vence 24 horas después del inicio.

## Cambios funcionales

Descubrimiento con datos reales, estados de error y filtros; mapa cargado solo en cliente; enlaces a detalles y creación protegida; checkout mediante Stripe hospedado; reservas de existencias y confirmación idempotente; entradas ligadas al comprador; restablecimiento de contraseña de un solo uso; invalidación de sesiones; caché separada por usuario y edad; acceso web con segundo factor.

El organizador dispone de «Control de entradas» en el detalle del evento, con formulario para pegar el contenido del QR o usar un lector conectado. La validación consume la entrada; no es una consulta informativa. No se integró un lector mediante cámara.

El acceso móvil también acepta el desafío 2FA y persiste la sesión únicamente al recibir credenciales verificadas. Las dependencias Expo quedaron alineadas con SDK 54 y se añadió el preset Babel que impedía exportar Android.

Se corrigieron rutas y comandos de los workflows CI y se instaló el proveedor de cobertura Vitest. No se ejecutaron los workflows en GitHub. La cobertura existente sigue siendo una puerta de calidad pendiente.

El JavaScript compartido inicial de la web pasó aproximadamente de 555 kB a 103 kB al retirar el agrupamiento global de dependencias.

## Arranque local

En `backend-api`, ejecutar `npm run dev:local`. Crea una base persistente y aislada en `.local-data/mongodb`; no usa la base de `.env`. Activa Socket.IO y desactiva correo, Stripe y Redis para esta ejecución.

En `eventconnect-frontend`, ejecutar `npm run build` y después `npm run start -- --port 3000`. Abrir http://localhost:3000. Para desarrollo, usar `npm run dev`.

## Verificaciones reproducibles

- Backend funcional: `npx jest --runInBand --coverage=false` desde `backend-api`.
- Backend con cobertura: `npm run test:coverage`; el requisito existente es 70% y actualmente NO se alcanza. No se ha reducido ese requisito.
- Web: `npx vitest run`, `npm run build` y, con servidor iniciado, `npx playwright test`.
- Móvil: `npx tsc --noEmit`, `npx expo install --check`, `npx expo export --platform android --output-dir dist-check`.

## Pendientes para producción

- Configurar y verificar Stripe/webhook, correo, mapas, Firebase/push y proyecto EAS con credenciales reales.
- Probar dispositivos Android/iOS y generar binarios firmados; no se ha publicado en tiendas.
- Resolver las alertas de dependencias que permanezcan tras las actualizaciones compatibles.
- La auditoría móvil posterior a actualizar `shell-quote` a 1.12.0 devolvió 0 críticas, 57 altas, 18 moderadas y 2 bajas para el árbol sin dependencias de desarrollo. La actualización masiva compatible no terminó y se detuvo; esas alertas siguen pendientes de revisión.
- Stripe usa su caducidad predeterminada en checkout para mantener parámetros idénticos en los reintentos; la reserva adopta la fecha devuelta por Stripe. El 15 de octubre se añadió recuperación de inventario tras interrupciones en cancelaciones y reembolsos; véase `INVENTORY-RECOVERY-2026-10-15.md`.
- Elevar cobertura backend; las pruebas de navegador usan respuestas controladas y no certifican compras reales ni entrega de correo.
- Verificar la carga de teselas del mapa en la red de destino: se comprobó inicialización sin errores, no disponibilidad de todos los proveedores externos.

No se ha desplegado, hecho push ni publicado la aplicación. Esta verificación no acredita que todas las pantallas heredadas estén completas.
