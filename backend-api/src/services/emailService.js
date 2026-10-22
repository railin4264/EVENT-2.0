const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.isConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

    if (this.isConfigured) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    this.fromAddress = process.env.EMAIL_FROM || 'EventConnect <no-reply@eventconnect.app>';
    this.appUrl = process.env.APP_URL || 'http://localhost:3000';
  }

  async send(to, subject, html) {
    if (!this.isConfigured) {
      logger.warn(`[EmailService] SMTP not configured. Would have sent "${subject}" to ${to}`);
      return { messageId: 'dev-no-send', devMode: true };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
      logger.info(`Email sent to ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      // Email delivery failure must never break the calling request
      // (registration, password reset, etc.). Log and return a failed marker.
      logger.error(`Failed to send email to ${to} (continuing without email):`, error.message);
      return { messageId: null, sent: false, error: error.message };
    }
  }

  async sendEmailVerification(to, firstName, token) {
    const verifyUrl = `${this.appUrl}/verify-email?token=${token}`;
    const subject = 'Verifica tu correo — EventConnect';
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#8b5cf6">¡Hola, ${firstName}!</h2>
        <p>Gracias por registrarte en EventConnect. Haz clic en el botón para verificar tu correo:</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#8b5cf6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Verificar correo
        </a>
        <p style="color:#6b7280;font-size:13px">Este enlace expira en 24 horas. Si no creaste una cuenta, ignora este mensaje.</p>
        <p style="color:#6b7280;font-size:12px">O copia este enlace: ${verifyUrl}</p>
      </div>`;
    return this.send(to, subject, html);
  }

  async sendPasswordReset(to, firstName, token) {
    const resetUrl = `${this.appUrl}/reset-password?token=${token}`;
    const subject = 'Restablecer contraseña — EventConnect';
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#8b5cf6">Hola, ${firstName}</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic aquí:</p>
        <a href="${resetUrl}" style="display:inline-block;background:#8b5cf6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Restablecer contraseña
        </a>
        <p style="color:#6b7280;font-size:13px">Este enlace expira en 1 hora. Si no solicitaste esto, ignora este mensaje.</p>
        <p style="color:#6b7280;font-size:12px">O copia este enlace: ${resetUrl}</p>
      </div>`;
    return this.send(to, subject, html);
  }

  async send2FARecoveryCode(to, firstName, recoveryCode) {
    const subject = 'Código de recuperación 2FA — EventConnect';
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#8b5cf6">Hola, ${firstName}</h2>
        <p>Tu código de recuperación de autenticación en dos factores es:</p>
        <div style="background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;margin:16px 0">
          <code style="font-size:24px;font-weight:700;letter-spacing:4px;color:#111827">${recoveryCode}</code>
        </div>
        <p style="color:#6b7280;font-size:13px">Este código expira en 15 minutos. No lo compartas con nadie.</p>
      </div>`;
    return this.send(to, subject, html);
  }

  async sendWelcome(to, firstName) {
    const subject = '¡Bienvenido a EventConnect! 🎉';
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#8b5cf6">¡Bienvenido, ${firstName}!</h2>
        <p>Tu cuenta ha sido verificada. Ya puedes explorar eventos, unirte a tribus y conectar con personas.</p>
        <a href="${this.appUrl}" style="display:inline-block;background:#8b5cf6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Explorar eventos
        </a>
      </div>`;
    return this.send(to, subject, html);
  }
}

module.exports = new EmailService();
