'use strict';

/**
 * Uber H3 Hierarchical Hexagonal Spatial Indexer
 * ------------------------------------------------------------------
 * Provides multi-resolution hexagonal cell indexing for EventNow 2.0:
 * - Resolution 3: Regional / National partitioning (~12,393 km²)
 * - Resolution 5: Metropolitan Area (~252 km²)
 * - Resolution 7: Neighborhood / Local queries (~5.16 km², ~1.4 km radius)
 * - Resolution 9: Spatiotemporal deduplication block (~0.105 km², ~175m radius)
 *
 * Uses official 'h3-js' library with mathematical fallbacks.
 */

let h3;
try {
  h3 = require('h3-js');
} catch (e) {
  h3 = null;
}

/**
 * Computes all relevant H3 hierarchical resolutions for given lat/lng.
 *
 * @param {number} lat - Latitude in degrees (-90 to 90)
 * @param {number} lng - Longitude in degrees (-180 to 180)
 * @returns {{ res3: string, res5: string, res7: string, res9: string }}
 */
function computeH3Hierarchy(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { res3: '', res5: '', res7: '', res9: '' };
  }

  if (h3 && typeof h3.latLngToCell === 'function') {
    try {
      return {
        res3: h3.latLngToCell(latitude, longitude, 3),
        res5: h3.latLngToCell(latitude, longitude, 5),
        res7: h3.latLngToCell(latitude, longitude, 7),
        res9: h3.latLngToCell(latitude, longitude, 9)
      };
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback string-based bucketing if h3-js unavailable in edge environment
  const r3 = `h3_r3_${Math.round(latitude * 10)}_${Math.round(longitude * 10)}`;
  const r5 = `h3_r5_${Math.round(latitude * 50)}_${Math.round(longitude * 50)}`;
  const r7 = `h3_r7_${Math.round(latitude * 200)}_${Math.round(longitude * 200)}`;
  const r9 = `h3_r9_${Math.round(latitude * 1000)}_${Math.round(longitude * 1000)}`;
  return { res3: r3, res5: r5, res7: r7, res9: r9 };
}

/**
 * Returns an array of surrounding H3 cells at a given resolution using k-ring / gridDisk.
 * k = 1 produces 7 hexagons (center + 6 neighbors).
 * k = 2 produces 19 hexagons.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} [resolution=7]
 * @param {number} [ring=1]
 * @returns {string[]}
 */
function getSurroundingCells(lat, lng, resolution = 7, ring = 1) {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];

  if (h3 && typeof h3.latLngToCell === 'function' && typeof h3.gridDisk === 'function') {
    try {
      const center = h3.latLngToCell(latitude, longitude, resolution);
      return h3.gridDisk(center, ring);
    } catch {
      return [];
    }
  }

  const centerFallback = `h3_r${resolution}_${Math.round(latitude * (resolution * 25))}_${Math.round(longitude * (resolution * 25))}`;
  return [centerFallback];
}

/**
 * Generates an indexed MongoDB filter matching all events within k-ring of given coordinates.
 * Extremely fast: replaces slow $nearSphere or $geoWithin with simple B-tree $in match.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} [resolution=7]
 * @param {number} [ring=1]
 * @returns {object} MongoDB query filter object
 */
function buildH3SpatialFilter(lat, lng, resolution = 7, ring = 1) {
  const cells = getSurroundingCells(lat, lng, resolution, ring);
  const field = `h3.res${resolution}`;
  return { [field]: { $in: cells } };
}

module.exports = {
  computeH3Hierarchy,
  getSurroundingCells,
  buildH3SpatialFilter
};
