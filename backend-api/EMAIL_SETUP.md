# Configuración de Correo Electrónico — EventNow Backend

Esta guía explica cómo configurar el envío de correos para activar la verificación de cuentas en EventNow.

---

## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env` en la raíz del proyecto backend:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
FROM_EMAIL=noreply@eventnow.app
```

### Descripción de cada variable

| Variable    | Descripción                                                                 |
|-------------|-----------------------------------------------------------------------------|
| `SMTP_HOST` | Servidor SMTP. Para Gmail usa `smtp.gmail.com`.                             |
| `SMTP_PORT` | Puerto SMTP. Usa `587` para TLS (recomendado) o `465` para SSL.            |
| `SMTP_USER` | Tu dirección de Gmail que enviará los correos.                              |
| `SMTP_PASS` | Contraseña de aplicación generada en Google (ver instrucciones abajo).      |
| `FROM_EMAIL` | La dirección que aparecerá como remitente en los correos enviados.         |

---

## Cómo obtener una Contraseña de Aplicación en Gmail

1. Ve a tu cuenta de Google: [myaccount.google.com](https://myaccount.google.com)
2. Haz clic en **Seguridad** en el menú lateral.
3. En la sección "Cómo inicias sesión en Google", activa la **Verificación en dos pasos** si aún no la tienes habilitada.
4. Una vez activa, regresa a **Seguridad** y busca **Contraseñas de aplicaciones** (App Passwords).
5. Selecciona:
   - Aplicación: **Correo**
   - Dispositivo: **Otro (nombre personalizado)** — escribe `EventNow`
6. Haz clic en **Generar**.
7. Copia la contraseña de 16 caracteres que aparece y úsala como valor de `SMTP_PASS`.

> **Importante:** Nunca expongas `SMTP_PASS` en tu repositorio. Asegúrate de que `.env` esté en tu `.gitignore`.

---

## Activar el Envío de Correos de Verificación al Registrarse

El servicio de correo ya está integrado en el backend a través de `nodemailer`. Para que los usuarios reciban un correo de verificación al registrarse, el flujo de registro en `src/routes/auth.js` debe llamar a `sendVerificationEmail` después de crear el usuario.

### Ejemplo de uso en el controlador de registro:

```js
const { sendVerificationEmail } = require('../services/emailService');

// Después de crear el usuario:
await sendVerificationEmail(newUser.email, verificationToken);
```

Asegúrate de que:
1. El usuario recién creado tiene un campo `emailVerificationToken` guardado en la base de datos.
2. La ruta de verificación (por ejemplo, `GET /api/auth/verify-email/:token`) valida el token y activa la cuenta.
3. Las variables SMTP están correctamente configuradas en `.env` antes de iniciar el servidor.

---

## Proveedores Alternativos a Gmail

Si prefieres no usar Gmail, puedes configurar otros proveedores cambiando las variables:

| Proveedor    | `SMTP_HOST`              | `SMTP_PORT` |
|--------------|--------------------------|-------------|
| SendGrid     | `smtp.sendgrid.net`      | `587`       |
| Mailgun      | `smtp.mailgun.org`       | `587`       |
| Outlook/Hotmail | `smtp-mail.outlook.com` | `587`    |
| Mailtrap (desarrollo) | `smtp.mailtrap.io` | `2525` |

Para entornos de desarrollo y pruebas, se recomienda **Mailtrap** ya que captura los correos sin enviarlos realmente.
