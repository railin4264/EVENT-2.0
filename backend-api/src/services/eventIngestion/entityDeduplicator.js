'use strict';

/**
 * Probabilistic Entity Deduplicator (Fellegi-Sunter / Splink Pattern)
 * ------------------------------------------------------------------
 * Resolves duplicated events across disparate sources (Ticketmaster,
 * Schema.org, Socrata, Resident Advisor, Telegram) into unified
 * canonical entities using spatiotemporal blocking (Date + H3 Res 9)
 * and multi-attribute probabilistic similarity scoring.
 */

const { getSurroundingCells } = require('./h3SpatialIndexer');

/**
 * Calculates Jaro-Winkler string similarity between two strings (0.0 to 1.0).
 */
function jaroWinkler(s1 = '', s2 = '') {
  const str1 = String(s1).toLowerCase().trim();
  const str2 = String(s2).toLowerCase().trim();

  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;

  const matchDistance = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
  const str1Matches = new Array(str1.length).fill(false);
  const str2Matches = new Array(str2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < str1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, str2.length);

    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < str1.length; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }

  const jaro = (
    matches / str1.length +
    matches / str2.length +
    (matches - transpositions / 2) / matches
  ) / 3;

  // Winkler prefix adjustment
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(str1.length, str2.length)); i++) {
    if (str1[i] === str2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Computes Token Overlap (Dice Coefficient) between words of two strings.
 */
function tokenOverlap(s1 = '', s2 = '') {
  const words1 = new Set(String(s1).toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(String(s2).toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0.0;

  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }

  return (2 * intersection) / (words1.size + words2.size);
}

/**
 * Computes probabilistic similarity score between two event candidate objects.
 *
 * @param {object} e1
 * @param {object} e2
 * @returns {{ score: number, isDuplicate: boolean }}
 */
function compareEvents(e1, e2) {
  // Attribute 1: Title similarity (55% weight)
  const titleJaro = jaroWinkler(e1.title, e2.title);
  const titleTokens = tokenOverlap(e1.title, e2.title);
  const titleScore = 0.55 * titleJaro + 0.45 * titleTokens;

  // Attribute 2: Venue similarity (25% weight)
  const v1 = e1.location?.venue || e1.location?.address || '';
  const v2 = e2.location?.venue || e2.location?.address || '';
  const venueScore = (v1 && v2) ? jaroWinkler(v1, v2) : 0.6;

  // Attribute 3: Temporal alignment (20% weight)
  const d1 = new Date(e1.date).getTime();
  const d2 = new Date(e2.date).getTime();
  const hourDiff = Math.abs(d1 - d2) / (3600 * 1000);
  let timeScore = 1.0;
  if (hourDiff > 12) timeScore = 0.0;
  else if (hourDiff > 3) timeScore = 0.5;
  else if (hourDiff > 1) timeScore = 0.8;

  let totalScore = 0.55 * titleScore + 0.25 * venueScore + 0.20 * timeScore;

  // Spatiotemporal coherence boost: If venue matches strongly and time is identical
  if (venueScore >= 0.80 && timeScore >= 0.9 && titleTokens >= 0.40) {
    totalScore = Math.min(1.0, totalScore + 0.10);
  }

  return {
    score: totalScore,
    isDuplicate: totalScore >= 0.75
  };
}

/**
 * Merges two duplicate events into a unified canonical record.
 *
 * @param {object} primary
 * @param {object} duplicate
 * @returns {object} Merged canonical event
 */
function mergeEventRecords(primary, duplicate) {
  const merged = { ...primary };

  // Keep richer description
  if ((duplicate.description?.length || 0) > (merged.description?.length || 0)) {
    merged.description = duplicate.description;
  }

  // Merge images
  const existingUrls = new Set((merged.images || []).map(img => img.url));
  for (const img of duplicate.images || []) {
    if (img?.url && !existingUrls.has(img.url)) {
      merged.images.push(img);
      existingUrls.add(img.url);
    }
  }

  // Keep ticket URL if primary is missing
  if (!merged.ticketUrl && duplicate.ticketUrl) {
    merged.ticketUrl = duplicate.ticketUrl;
  }

  // Record provenance
  merged.pipelineMeta = merged.pipelineMeta || {};
  merged.pipelineMeta.mergedSources = merged.pipelineMeta.mergedSources || [];

  merged.pipelineMeta.mergedSources.push({
    sourceName: duplicate.source,
    sourceId: duplicate.sourceId,
    extractedAt: duplicate.pipelineMeta?.ingestedAt || new Date()
  });

  return merged;
}

/**
 * Deduplicates an array of incoming events using H3 spatiotemporal blocking.
 *
 * @param {Array<object>} eventList
 * @returns {{ canonical: Array<object>, duplicateCount: number }}
 */
function deduplicateEventBatch(eventList = []) {
  if (!Array.isArray(eventList) || eventList.length <= 1) {
    return { canonical: eventList, duplicateCount: 0 };
  }

  // Stage 1: Spatiotemporal blocking (Date YYYY-MM-DD + H3 Res 9)
  const blocks = new Map();

  for (const ev of eventList) {
    const day = ev.date instanceof Date ? ev.date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const h3Cell = ev.h3?.res9 || 'unassigned_h3';
    const blockKey = `${day}_${h3Cell}`;

    if (!blocks.has(blockKey)) {
      blocks.set(blockKey, []);
    }
    blocks.get(blockKey).push(ev);
  }

  const canonicalEvents = [];
  let duplicateCount = 0;

  // Stage 2: Within-block Fellegi-Sunter pairwise linkage
  for (const [, candidates] of blocks.entries()) {
    const localCanonical = [];

    for (const cand of candidates) {
      let matched = false;

      for (let i = 0; i < localCanonical.length; i++) {
        const { isDuplicate, score } = compareEvents(localCanonical[i], cand);
        if (isDuplicate) {
          localCanonical[i] = mergeEventRecords(localCanonical[i], cand);
          localCanonical[i].pipelineMeta.confidenceScore = Math.max(localCanonical[i].pipelineMeta.confidenceScore || 0.8, score);
          matched = true;
          duplicateCount++;
          break;
        }
      }

      if (!matched) {
        localCanonical.push(cand);
      }
    }

    canonicalEvents.push(...localCanonical);
  }

  return {
    canonical: canonicalEvents,
    duplicateCount
  };
}

module.exports = {
  jaroWinkler,
  tokenOverlap,
  compareEvents,
  mergeEventRecords,
  deduplicateEventBatch
};
