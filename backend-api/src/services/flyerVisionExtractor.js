'use strict';

const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

// Reads the facts printed on a flyer image with Claude. Off unless ANTHROPIC_API_KEY is set;
// FLYER_VISION_MODEL picks the model (default Claude Opus 5.5).
const MODEL = process.env.FLYER_VISION_MODEL || 'claude-opus-5-5';
const MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const nullable = type => ({ type: [type, 'null'] });
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'description', 'day', 'month', 'year', 'time', 'venue', 'address', 'city', 'country_code', 'price_amount', 'price_currency', 'is_free'],
  properties: {
    title: nullable('string'),
    description: nullable('string'),
    day: nullable('integer'),
    month: nullable('integer'),
    year: nullable('integer'),
    time: { ...nullable('string'), description: '24-hour HH:MM' },
    venue: nullable('string'),
    address: nullable('string'),
    city: nullable('string'),
    country_code: { ...nullable('string'), description: 'ISO 3166-1 alpha-2, only if printed or unambiguous from the printed address' },
    price_amount: nullable('number'),
    price_currency: { ...nullable('string'), description: 'ISO 4217, only if a currency symbol or code is printed and unambiguous' },
    is_free: nullable('boolean')
  }
};

const INSTRUCTIONS = `Read this event flyer and transcribe the facts that are printed on it.
Use null for anything the flyer does not state. Do not infer a year, a time, a venue, a price or a currency that is not printed.
A bare "$" without a country or code is not a currency: leave price_currency null.
is_free is true only if the flyer says the entry is free, false only if it shows a price.
description: one or two sentences summarising what the flyer announces, in the flyer's language.`;

function enabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Facts printed on the flyer, or null when vision is off, the image is unusable or the model declines. */
async function readFlyerImage(file) {
  if (!enabled() || !file?.path || !MEDIA_TYPES.has(file.mimetype)) return null;
  const image = await fs.promises.readFile(file.path);
  if (image.length > MAX_IMAGE_BYTES) return null;
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      // Transcription needs little reasoning; low effort keeps each flyer fast and cheap.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      // On a safety decline the API retries on a fallback model inside the same call.
      fallbacks: 'default',
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: file.mimetype, data: image.toString('base64') } },
          { type: 'text', text: INSTRUCTIONS }
        ]
      }]
    }, { headers: { 'anthropic-beta': 'server-side-fallback-2026-07-01' } });
    if (response.stop_reason !== 'end_turn') return null;
    const text = response.content.find(block => block.type === 'text')?.text;
    return text ? JSON.parse(text) : null;
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) logger.warn('Flyer vision rate limited');
    else if (error instanceof Anthropic.APIError) logger.warn(`Flyer vision API error ${error.status}`);
    else logger.warn('Flyer vision failed: ' + error.message);
    return null;
  }
}

/** Calendar day from printed parts; a missing year means the next occurrence of that day. */
function printedDay({ day, month, year }, now = new Date()) {
  if (!Number.isInteger(day) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  const build = y => {
    const date = new Date(Date.UTC(y, month - 1, day));
    return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
  };
  let date = Number.isInteger(year) ? build(year) : build(now.getFullYear());
  if (date && !Number.isInteger(year) && date < new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))) date = build(now.getFullYear() + 1);
  return date ? date.toISOString().slice(0, 10) : null;
}

/** Same shape as the text extractor, so the form fills both the same way. */
function fieldsFromVision(facts, now = new Date()) {
  if (!facts) return null;
  const time = typeof facts.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(facts.time) ? facts.time : null;
  const currency = typeof facts.price_currency === 'string' && /^[A-Z]{3}$/.test(facts.price_currency) ? facts.price_currency : null;
  const price = facts.is_free === true ? { amount: 0, currency, isFree: true }
    : typeof facts.price_amount === 'number' && facts.price_amount > 0 ? { amount: facts.price_amount, currency, isFree: false } : null;
  return {
    title: facts.title || null, description: facts.description || null,
    date: printedDay(facts, now), time,
    venue: facts.venue || null, address: facts.address || null, city: facts.city || null,
    countryCode: typeof facts.country_code === 'string' && /^[A-Z]{2}$/.test(facts.country_code) ? facts.country_code : null,
    // A printed address is not a map point: the form geocodes it and the organizer confirms the pin.
    coordinates: null,
    price
  };
}

module.exports = { readFlyerImage, fieldsFromVision, printedDay, enabled, SCHEMA };
