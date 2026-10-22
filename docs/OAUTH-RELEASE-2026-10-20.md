# Acceso social: configuración y validación pendiente

La web dispone de la ruta `/oauth/[provider]/callback`. El proveedor redirige allí mediante GET; la web valida el estado guardado en esa pestaña y envía el código por POST a la API. No configurar la consola del proveedor para redirigir al POST de la API.

Para el desarrollo actual en `http://localhost:3001`, registrar exactamente `http://localhost:3001/oauth/google/callback`. En Compose el ejemplo utiliza el puerto 3000. En producción debe utilizarse el origen HTTPS público. La URI registrada en el proveedor y `GOOGLE_OAUTH_REDIRECT_URI` deben coincidir, incluyendo puerto y ruta.

Las variables que lee la API son `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` y `GOOGLE_OAUTH_REDIRECT_URI`. Los nombres antiguos `GOOGLE_CLIENT_ID` y `GOOGLE_CALLBACK_URL` no configuran este servicio. El secreto se queda en el backend; nunca usar un nombre `NEXT_PUBLIC_` para él. Los ejemplos permanecen vacíos para no ofrecer un proveedor ficticiamente configurado. No se editaron secretos reales.

Facebook utiliza `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` y `FACEBOOK_REDIRECT_URI`, con retorno web `/oauth/facebook/callback`. Su botón se muestra sólo cuando la API lo declara disponible, igual que Google. Apple y GitHub no están implementados en la API y no deben anunciarse como habilitados.

Los estados OAuth se guardan en Mongo durante diez minutos, como resúmenes SHA-256, y se consumen mediante una operación atómica. No dependen de Redis opcional ni se escriben en logs. Antes del release, `npm run db:verify-release` comprueba también el índice de caducidad de OAuthState. El comando sólo inspecciona; cualquier preparación de índices requiere revisar el entorno objetivo.

Cada intercambio o renovación Google utiliza un cliente separado. La librería verifica firma, emisor, audiencia y caducidad; se requiere correo verificado para el acceso Google. El callback respeta cuentas inactivas y segundo factor. Los tokens del proveedor no aparecen en la respuesta pública. La contraseña interna de una cuenta creada por OAuth es aleatoria; accesos posteriores conservan credenciales de renovación omitidas por el proveedor.

Las pruebas utilizan certificados RSA locales y una base efímera, sustituyendo únicamente las llamadas HTTP al proveedor. No prueban una autorización real de Google, consentimiento, configuración de la consola, cookies del navegador, móvil nativo ni el comportamiento de los proveedores en producción. Falta probar estos recorridos con un cliente OAuth configurado y el dominio de lanzamiento. Esto no requiere una pasarela de pagos.

Referencias: [biblioteca oficial de Google](https://github.com/googleapis/google-auth-library-nodejs), [aviso de uuid que motivó la actualización](https://github.com/advisories/GHSA-w5hq-g745-h8pq).
