const Event = require('../models/Event');
const logger = require('../utils/logger');

class TelegramBotService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.channelId = process.env.TELEGRAM_CHANNEL_ID || '';
    this.webUrl = (process.env.PUBLIC_WEB_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
    this.subscribers = new Set();
  }

  async sendTelegramMessage(chatId, text, extra = {}) {
    if (!this.botToken) {
      return { success: false, code: 'TELEGRAM_NOT_CONFIGURED' };
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
          ...extra
        }),
        signal: AbortSignal.timeout(10000)
      });
      const data = await response.json();
      return { success: response.ok && data.ok === true, ...(data.ok ? { messageId: data.result?.message_id } : { code: 'TELEGRAM_DELIVERY_FAILED' }) };
    } catch (err) {
      logger.warn('Telegram delivery unavailable');
      return { success: false, code: 'TELEGRAM_UNAVAILABLE' };
    }
  }

  async buildWeekendDigest() {
    if (!/^https:\/\//.test(this.webUrl)) throw new Error('TELEGRAM_WEB_URL_NOT_CONFIGURED');
    const escape = text => String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const now = new Date();
    const upcomingEvents = await Event.find({
      status: 'published',
      isPrivate: { $ne: true },
      isSecretLocation: { $ne: true },
      date: { $gte: now, $lte: new Date(now.getTime() + 5 * 24 * 3600 * 1000) }
    })
      .sort({ 'attendees.length': -1, date: 1 })
      .limit(6);

    let message = '🇩🇴 <b>¡RADAR DE PLANES EVENTNOW RD!</b> 🇩🇴\n';
    message += '<i>Los mejores eventos y coros para este fin de semana en Quisqueya:</i>\n\n';

    if (upcomingEvents.length === 0) {
      message += `Pronto anunciaremos nuevos planes. Visita ${this.webUrl} para explorar el mapa en vivo.`;
      return message;
    }

    upcomingEvents.forEach((ev, idx) => {
      const priceText = ev.price?.amount === 0 ? 'GRATIS' : Number.isFinite(ev.price?.amount) ? `${ev.price.currency || 'Moneda no indicada'} ${ev.price.amount}` : 'Precio por confirmar';
      const recurringPill = ev.isRecurring ? ' [🔁 Fijo Semanal]' : '';
      const venue = ev.location?.venue || ev.location?.address || 'Santo Domingo, RD';
      message += `<b>${idx + 1}. ${escape(ev.title)}</b>${recurringPill}\n`;
      message += `📍 ${escape(venue)}\n`;
      message += `🎟️ ${priceText} · 🔗 <a href="${this.webUrl}/events/${ev._id}">Ver Detalles</a>\n\n`;
    });

    message += `👉 Explora más en: <b>${this.webUrl}/discovery</b>\n`;
    message += '⚡ ¡Pásalo a tu coro en WhatsApp o Telegram!';
    return message;
  }

  async handleWebhookUpdate(update) {
    if (!this.botToken || !/^https:\/\//.test(this.webUrl) || !update || !update.message) return;
    const { chat, text } = update.message;
    if (!chat || !chat.id) return;

    this.subscribers.add(chat.id);
    const cmd = (text || '').trim().toLowerCase();

    if (cmd === '/start') {
      const welcome = '👋 <b>¡Klk! Bienvenido al Radar de EventNow RD</b>\n\nTe avisamos gratis cada viernes con el Top de planes, béisbol LIDOM, conciertos, talleres y actividades fijas en República Dominicana.\n\nComandos rápidos:\n/finde - Ver el Top de planes del fin de semana\n/gratis - Eventos de entrada libre\n/web - Abrir app web';
      await this.sendTelegramMessage(chat.id, welcome);
    } else if (cmd === '/finde' || cmd === '/planes') {
      const digest = await this.buildWeekendDigest();
      await this.sendTelegramMessage(chat.id, digest);
    } else if (cmd === '/gratis') {
      const freeEvents = await Event.find({
        status: 'published',
        isPrivate: { $ne: true },
        isSecretLocation: { $ne: true },
        date: { $gte: new Date() },
        'price.amount': 0
      }).limit(5);

      let msg = '🆓 <b>Planes Gratis en República Dominicana:</b>\n\n';
      freeEvents.forEach((e, i) => {
        msg += `<b>${i + 1}. ${String(e.title).replace(/[<>&]/g, '')}</b>\n📍 ${String(e.location?.address || '').replace(/[<>&]/g, '')}\n🔗 <a href="${this.webUrl}/events/${e._id}">Ver Evento</a>\n\n`;
      });
      await this.sendTelegramMessage(chat.id, msg);
    } else if (cmd === '/web') {
      await this.sendTelegramMessage(chat.id, `📱 Accede a la plataforma completa: ${this.webUrl}`);
    } else {
      await this.sendTelegramMessage(chat.id, 'Envía /finde para ver los mejores planes o /gratis para eventos libres de costo en RD.');
    }
  }
}

module.exports = new TelegramBotService();
