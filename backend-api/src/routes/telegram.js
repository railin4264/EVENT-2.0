const express = require('express');
const router = express.Router();
const telegramBotService = require('../services/telegramBotService');
const logger = require('../utils/logger');

// @route   POST /api/telegram/webhook
// @desc    Receives incoming updates from Telegram Bot API
// @access  Public
router.post('/webhook', async (req, res) => {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_WEBHOOK_SECRET) return res.status(503).json({ ok: false, code: 'TELEGRAM_NOT_CONFIGURED' });
  const expected = Buffer.from(process.env.TELEGRAM_WEBHOOK_SECRET);
  const actual = Buffer.from(req.get('X-Telegram-Bot-Api-Secret-Token') || '');
  if (actual.length !== expected.length || !require('crypto').timingSafeEqual(actual, expected)) return res.status(403).json({ ok: false });
  try {
    await telegramBotService.handleWebhookUpdate(req.body);
    res.json({ ok: true });
  } catch (err) {
    logger.error('Telegram webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/telegram/digest
// @desc    Previews the formatted weekend digest
// @access  Public
router.get('/digest', async (req, res) => {
  try {
    const digest = await telegramBotService.buildWeekendDigest();
    res.json({ success: true, digest });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   GET /api/telegram/status
// @desc    Status of Telegram bot integration
// @access  Public
router.get('/status', (req, res) => {
  res.json({
    success: true,
    configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    channel: process.env.TELEGRAM_CHANNEL_ID || null,
    botName: process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_USERNAME || null : null
  });
});

module.exports = router;
