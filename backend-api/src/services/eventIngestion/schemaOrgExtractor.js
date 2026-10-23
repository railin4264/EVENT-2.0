'use strict';

/**
 * Schema.org / JSON-LD Event Extractor
 * ------------------------------------------------------------------
 * Harvests structured events annotated with Schema.org/Event from
 * any venue website, cultural calendar, or open-web page.
 *
 * Compliant with Google Rich Results & W3C JSON-LD specifications.
 */

const axios = require('axios');
const logger = require('../../utils/logger') || console;
const { computeH3Hierarchy } = require('./h3SpatialIndexer');

const EVENT_SUBTYPES = new Set([
  'event',
  'musicevent',
  'sportsevent',
  'festivalevent',
  'festival',
  'theaterevent',
  'theatreevent',
  'danceevent',
  'comedyevent',
  'visualartsevent',
  'exhibitionevent',
  'businessconferencerevent',
  'conferencerevent',
  'educationalevent',
  'socialevent',
  'childrensevent',
  'foodanddrankevent',
  'hackathonevent',
  'screeningevent'
]);

/**
 * Normalizes raw Schema.org text into a clean category slug.
 */
function mapSchemaTypeToCategory(type = '') {
  const t = String(type).toLowerCase().replace(/[^a-z]/g, '');
  if (t.includes('music') || t.includes('concert')) return 'music';
  if (t.includes('sport')) return 'sports';
  if (t.includes('art') || t.includes('exhibition')) return 'art';
  if (t.includes('theater') || t.includes('theatre') || t.includes('comedy')) return 'entertainment';
  if (t.includes('food') || t.includes('drink')) return 'food';
  if (t.includes('dance')) return 'dance';
  if (t.includes('business') || t.includes('conference')) return 'business';
  if (t.includes('education') || t.includes('course')) return 'education';
  if (t.includes('social') || t.includes('party')) return 'party';
  return 'community';
}

/**
 * Extracts JSON-LD scripts from raw HTML string.
 *
 * @param {string} html
 * @returns {Array<object>} Array of parsed JSON objects
 */
function extractJsonLdBlocks(html) {
  if (!html || typeof html !== 'string') return [];
  const results = [];
  const regex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const rawContent = match[1]?.trim();
    if (!rawContent) continue;
    try {
      const parsed = JSON.parse(rawContent);
      if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed['@graph'])) {
          results.push(...parsed['@graph']);
        } else {
          results.push(parsed);
        }
      }
    } catch {
      // Ignore unparseable JSON blocks
    }
  }

  return results;
}

/**
 * Normalizes a single Schema.org Event object into EventNow canonical format.
 *
 * @param {object} item - Parsed Schema.org item
 * @param {string} [sourceUrl=''] - URL of the source page
 * @returns {object|null}
 */
function normalizeSchemaOrgEvent(item, sourceUrl = '') {
  if (!item || typeof item !== 'object') return null;

  const rawType = Array.isArray(item['@type']) ? item['@type'][0] : item['@type'];
  const cleanType = String(rawType || '').toLowerCase().replace(/[^a-z]/g, '');

  if (!cleanType || !EVENT_SUBTYPES.has(cleanType)) {
    return null;
  }

  const title = item.name || item.headline || item.title;
  if (!title || typeof title !== 'string' || title.trim().length < 3) return null;

  const startDateStr = item.startDate || item.doorTime || item.datePublished;
  // Missing facts stay missing: no invented start, end, place or currency.
  const startDate = startDateStr ? new Date(startDateStr) : null;
  if (!startDate || !Number.isFinite(startDate.getTime())) return null;
  const endDate = item.endDate && Number.isFinite(new Date(item.endDate).getTime()) ? new Date(item.endDate) : undefined;

  // Extract location
  let venueName = '';
  let addressText = '';
  let lat = null;
  let lng = null;

  const loc = item.location;
  if (typeof loc === 'string') {
    addressText = loc;
  } else if (loc && typeof loc === 'object') {
    venueName = loc.name || '';
    if (typeof loc.address === 'string') {
      addressText = loc.address;
    } else if (loc.address && typeof loc.address === 'object') {
      const a = loc.address;
      addressText = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry]
        .filter(Boolean)
        .join(', ');
    }

    if (loc.geo) {
      lat = parseFloat(loc.geo.latitude);
      lng = parseFloat(loc.geo.longitude);
    }
  }

  // Extract offers / price
  let priceAmount = 0;
  let priceCurrency = null;
  let ticketUrl = '';

  const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
  if (offers && typeof offers === 'object') {
    if (offers.price != null) {
      priceAmount = parseFloat(offers.price) || 0;
    }
    if (offers.priceCurrency) {
      priceCurrency = String(offers.priceCurrency).toUpperCase();
    }
    ticketUrl = offers.url || '';
  }

  // Extract image
  let imageUrl = '';
  if (typeof item.image === 'string') {
    imageUrl = item.image;
  } else if (Array.isArray(item.image) && item.image.length > 0) {
    imageUrl = typeof item.image[0] === 'string' ? item.image[0] : item.image[0]?.url || '';
  } else if (item.image?.url) {
    imageUrl = item.image.url;
  }

  const located = Number.isFinite(lng) && Number.isFinite(lat);

  // Check attendance mode & virtual location
  const attendanceMode = String(item.eventAttendanceMode || '').toLowerCase();
  const isVirtualLocation = loc && (loc['@type'] === 'VirtualLocation' || loc.type === 'VirtualLocation');
  const isVirtual = attendanceMode.includes('online') || attendanceMode.includes('mixed') || Boolean(isVirtualLocation) || Boolean(item.virtualLocation);
  const eventType = attendanceMode.includes('mixed') ? 'hybrid' : (isVirtual ? 'virtual' : 'in_person');
  if (!isVirtual && !located) return null;
  if (priceAmount > 0 && !priceCurrency) return null;
  const coordinates = located ? [lng, lat] : undefined;
  const h3Hierarchy = located ? computeH3Hierarchy(lat, lng) : undefined;
  const rawVirtualLink = loc?.url || item.url || (isVirtual ? sourceUrl : '');
  const virtualLink = rawVirtualLink && (rawVirtualLink.startsWith('http://') || rawVirtualLink.startsWith('https://')) ? rawVirtualLink : '';

  let virtualPlatform = 'custom';
  if (virtualLink.includes('youtube.com') || virtualLink.includes('youtu.be')) virtualPlatform = 'youtube_live';
  else if (virtualLink.includes('twitch.tv')) virtualPlatform = 'twitch';
  else if (virtualLink.includes('kick.com')) virtualPlatform = 'kick';
  else if (virtualLink.includes('zoom.us')) virtualPlatform = 'zoom';
  else if (virtualLink.includes('meet.google.com')) virtualPlatform = 'google_meet';
  else if (virtualLink.includes('discord.')) virtualPlatform = 'discord';
  else if (virtualLink.includes('teams.microsoft.com')) virtualPlatform = 'teams';

  return {
    title: title.trim(),
    description: (item.description || `${title} - Evento publicado en la web abierta.`).slice(0, 3000),
    category: mapSchemaTypeToCategory(cleanType),
    date: startDate,
    endDate,
    isVirtual,
    eventType,
    virtualPlatform,
    virtualLink: virtualLink || undefined,
    virtualDetails: isVirtual ? {
      isStream: Boolean(virtualPlatform === 'youtube_live' || virtualPlatform === 'twitch' || virtualPlatform === 'kick'),
      isWorkshop: Boolean(cleanType.includes('course') || title.toLowerCase().includes('taller') || title.toLowerCase().includes('workshop')),
      isWebinar: Boolean(cleanType.includes('conference') || title.toLowerCase().includes('webinar') || title.toLowerCase().includes('summit'))
    } : undefined,
    location: coordinates ? {
      type: 'Point',
      coordinates,
      address: addressText || venueName,
      venue: venueName || undefined
    } : undefined,
    price: {
      amount: priceAmount,
      currency: priceCurrency || 'USD'
    },
    images: imageUrl ? [{ url: imageUrl }] : [],
    externalUrl: sourceUrl || item.url || '',
    ticketUrl: ticketUrl || '',
    source: 'schema_org_json_ld',
    sourceId: item['@id'] || `${sourceUrl}#${startDate.toISOString()}#${encodeURIComponent(title)}`,
    h3: h3Hierarchy,
    pipelineMeta: {
      tier: 3,
      ingestedAt: new Date(),
      originalSourceUrl: sourceUrl,
      rawSchemaType: cleanType,
      confidenceScore: 0.95
    }
  };
}

/**
 * Harvests events from an arbitrary web page URL.
 *
 * @param {string} url - Target webpage
 * @returns {Promise<Array<object>>} Canonical EventNow objects
 */
async function harvestUrl(url) {
  try {
    const res = await axios.get(url, {
      timeout: 12000,
      headers: {
        'User-Agent': 'EventNowBot/2.0 (+https://eventnow.do/bot; open-web-discovery)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });

    const blocks = extractJsonLdBlocks(res.data);
    const events = [];

    for (const b of blocks) {
      const normalized = normalizeSchemaOrgEvent(b, url);
      if (normalized) events.push(normalized);
    }

    return events;
  } catch (err) {
    logger.warn?.(`Schema.org harvest failed for ${url}: ${err.message}`);
    return [];
  }
}

module.exports = {
  extractJsonLdBlocks,
  normalizeSchemaOrgEvent,
  harvestUrl
};
