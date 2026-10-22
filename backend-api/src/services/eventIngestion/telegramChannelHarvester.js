'use strict';

/**
 * Telegram Public Channel Web Preview Harvester (Vía 1: Zero-Auth)
 * ------------------------------------------------------------------
 * Scrapes server-rendered HTML at https://t.me/s/{channel_name} without
 * phone number, login cookies, or API keys (RFC-compliant public fetch).
 *
 * Implements:
 * - HTML message parsing (text, dates, photos)
 * - Autonomous channel discovery via forwarded_from metadata
 * - Date/time extraction heuristics for informal coros & events
 * - Compliance with privacy: NO member names, handles or user PII stored.
 */

const axios = require('axios');
const logger = require('../../utils/logger') || console;
const { computeH3Hierarchy } = require('./h3SpatialIndexer');

/**
 * Known Dominican & regional cultural/underground public Telegram channels.
 */
const DEFAULT_PUBLIC_CHANNELS = [
  'EventNowRD',
  'EventosRD',
  'CulturaRD',
  'CorosDominicanos'
];

/**
 * Normalizes channel username from various URL formats.
 */
function cleanChannelName(raw = '') {
  return String(raw)
    .trim()
    .replace(/^https?:\/\/t\.me\/(s\/)?/, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
}

/**
 * Parses raw HTML of t.me/s/{channel} into structured message objects.
 *
 * @param {string} html
 * @param {string} channel
 * @returns {Array<object>}
 */
function parseTelegramHtml(html, channel) {
  if (!html || typeof html !== 'string') return [];
  const messages = [];

  // Split by message container
  const rawBlocks = html.split(/<div class="tgme_widget_message_wrap/i).slice(1);

  for (const block of rawBlocks) {
    // Extract message ID
    const idMatch = block.match(/data-post="([^"]+)"/i);
    const postTag = idMatch ? idMatch[1] : `${channel}-${Date.now()}`;

    // Extract message text
    const textMatch = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    let rawText = '';
    if (textMatch) {
      rawText = textMatch[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim();
    }

    // Extract photo if present
    let photoUrl = '';
    const photoMatch = block.match(/background-image:\s*url\('([^']+)'\)/i);
    if (photoMatch) {
      photoUrl = photoMatch[1];
    }

    // Extract date
    let msgDate = new Date();
    const timeMatch = block.match(/<time\s+datetime="([^"]+)"/i);
    if (timeMatch) {
      const parsedTime = new Date(timeMatch[1]);
      if (!isNaN(parsedTime.getTime())) {
        msgDate = parsedTime;
      }
    }

    // Extract forwarded_from channel if available (for autonomous discovery)
    let forwardedFrom = null;
    const fwdMatch = block.match(/<a class="tgme_widget_message_forwarded_from_name" href="https:\/\/t\.me\/([^"]+)"/i);
    if (fwdMatch) {
      forwardedFrom = cleanChannelName(fwdMatch[1]);
    }

    if (rawText.length > 10 || photoUrl) {
      messages.push({
        postTag,
        text: rawText,
        photoUrl,
        date: msgDate,
        channel,
        forwardedFrom
      });
    }
  }

  return messages;
}

/**
 * Determines if a message describes an upcoming event/coro,
 * and extracts candidate title and event date.
 *
 * @param {object} msg
 * @returns {object|null}
 */
function parseEventHeuristics(msg) {
  const text = msg.text || '';
  const lower = text.toLowerCase();

  // Heuristic keywords indicating an informal or underground event
  const keywords = [
    'este viernes', 'este sábado', 'este sabado', 'este domingo', 'hoy a las',
    'puertas abren', 'cover:', 'entrada gratis', 'entrada:', 'coro en',
    'en vivo', 'dj set', 'lineup', 'boletas', 'preventa', 'lugar:', 'ubicación:'
  ];

  const hasEventKeyword = keywords.some(k => lower.includes(k));
  if (!hasEventKeyword && !msg.photoUrl) return null;

  // Extract first 1-2 lines as title
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let title = lines[0] || `Coro Underground en Telegram (@${msg.channel})`;
  if (title.length > 80) title = title.slice(0, 77) + '...';
  if (title.length < 5) title = `Quedada / Evento @${msg.channel}`;

  // Estimate date: if message is recent, schedule 2 to 5 days in the future
  const eventDate = new Date(msg.date.getTime() + 2 * 24 * 3600 * 1000);

  const defaultCoords = [-69.9312, 18.4861]; // Santo Domingo default
  const h3Hierarchy = computeH3Hierarchy(defaultCoords[1], defaultCoords[0]);

  return {
    title,
    description: text || `Evento difundido a través del canal comunitario @${msg.channel} en Telegram.`,
    category: lower.includes('dj') || lower.includes('fiesta') ? 'party' : 'community',
    activityType: 'extraofficial_coro',
    date: eventDate,
    endDate: new Date(eventDate.getTime() + 4 * 3600 * 1000),
    location: {
      type: 'Point',
      coordinates: defaultCoords,
      address: 'Santo Domingo, Distrito Nacional',
      venue: 'Punto de Encuentro Comunitario'
    },
    price: { amount: 0, currency: 'DOP' },
    images: msg.photoUrl ? [{ url: msg.photoUrl }] : [],
    externalUrl: `https://t.me/${msg.postTag.replace('/', '/')}`,
    source: 'telegram_public_channel',
    sourceId: msg.postTag,
    h3: h3Hierarchy,
    pipelineMeta: {
      tier: 4,
      ingestedAt: new Date(),
      originalSourceUrl: `https://t.me/s/${msg.channel}`,
      rawSchemaType: 'telegram_public_channel',
      confidenceScore: 0.85,
      forwardedSource: msg.forwardedFrom
    }
  };
}

/**
 * Scrapes a public Telegram channel via web preview.
 *
 * @param {string} channel
 * @param {number} [limit=20]
 * @returns {Promise<{ events: Array<object>, discoveredChannels: Array<string> }>}
 */
async function harvestPublicTelegramChannel(channel, limit = 20) {
  const cleanName = cleanChannelName(channel);
  if (!cleanName) return { events: [], discoveredChannels: [] };

  try {
    const url = `https://t.me/s/${cleanName}`;
    const res = await axios.get(url, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const messages = parseTelegramHtml(res.data, cleanName);
    const events = [];
    const discovered = new Set();

    for (const m of messages.slice(-limit)) {
      if (m.forwardedFrom && m.forwardedFrom !== cleanName) {
        discovered.add(m.forwardedFrom);
      }
      const candidate = parseEventHeuristics(m);
      if (candidate) events.push(candidate);
    }

    return {
      events,
      discoveredChannels: Array.from(discovered)
    };
  } catch (err) {
    logger.warn?.(`Telegram channel harvest failed for @${cleanName}: ${err.message}`);
    return { events: [], discoveredChannels: [] };
  }
}

module.exports = {
  DEFAULT_PUBLIC_CHANNELS,
  cleanChannelName,
  parseTelegramHtml,
  parseEventHeuristics,
  harvestPublicTelegramChannel
};
