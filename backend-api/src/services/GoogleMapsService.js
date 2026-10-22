const axios = require('axios');
const logger = require('../utils/logger');

class GoogleMapsService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseURL = 'https://maps.googleapis.com/maps/api';
  }

  /**
   * Geocode an address to get coordinates
   * @param {string} address - The address to geocode
   * @returns {Promise<Object>} - Coordinates and formatted address
   */
  async geocodeAddress(address) {
    try {
      if (this.apiKey) {
        try {
          const response = await axios.get(`${this.baseURL}/geocode/json`, {
            params: { address, key: this.apiKey }
          });
          if (response.data.status === 'OK' && response.data.results.length > 0) {
            const result = response.data.results[0];
            const { lat, lng } = result.geometry.location;
            return {
              coordinates: [lng, lat],
              formattedAddress: result.formatted_address,
              placeId: result.place_id,
              types: result.types,
              addressComponents: result.address_components
            };
          }
          // Google returned non-OK status → fall through to Nominatim
          logger.warn('Google geocode non-OK, falling back to Nominatim:', response.data.status);
        } catch (gErr) {
          logger.warn('Google geocode error, falling back to Nominatim:', gErr.message);
        }
      }
      return await this._nominatimGeocode(address);
    } catch (error) {
      logger.error('Error geocoding address:', error);
      throw error;
    }
  }

  async _nominatimGeocode(address) {
    const resp = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: address, format: 'json', limit: 1 },
      headers: { 'User-Agent': 'EventConnect/2.0 (eventconnect)' }
    });
    if (resp.data && resp.data.length > 0) {
      const r = resp.data[0];
      return {
        coordinates: [parseFloat(r.lon), parseFloat(r.lat)],
        formattedAddress: r.display_name,
        placeId: r.place_id || r.osm_id,
        types: r.type ? [r.type] : [],
        addressComponents: []
      };
    }
    throw new Error('No results from Nominatim');
  }

  /**
   * Reverse geocode coordinates to get address
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<Object>} - Address information
   */
  async reverseGeocode(lat, lng) {
    try {
      if (this.apiKey) {
        try {
          const response = await axios.get(`${this.baseURL}/geocode/json`, {
            params: { latlng: `${lat},${lng}`, key: this.apiKey }
          });
          if (response.data.status === 'OK' && response.data.results.length > 0) {
            const result = response.data.results[0];
            return {
              formattedAddress: result.formatted_address,
              placeId: result.place_id,
              types: result.types,
              addressComponents: result.address_components
            };
          }
          logger.warn('Google reverse-geocode non-OK, falling back to Nominatim:', response.data.status);
        } catch (gErr) {
          logger.warn('Google reverse-geocode error, falling back to Nominatim:', gErr.message);
        }
      }
      return await this._nominatimReverse(lat, lng);
    } catch (error) {
      logger.error('Error reverse geocoding:', error);
      throw error;
    }
  }

  async _nominatimReverse(lat, lng) {
    const resp = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: { lat, lon: lng, format: 'json' },
      headers: { 'User-Agent': 'EventConnect/2.0 (eventconnect)' }
    });
    if (resp.data && resp.data.display_name) {
      return {
        formattedAddress: resp.data.display_name,
        placeId: resp.data.place_id || resp.data.osm_id,
        types: resp.data.type ? [resp.data.type] : [],
        addressComponents: resp.data.address ? Object.entries(resp.data.address).map(([k, v]) => ({ long_name: v, short_name: v, types: [k] })) : []
      };
    }
    throw new Error('No results from Nominatim');
  }

  /**
   * Search for places using Google Places API
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Array of places
   */
  async searchPlaces(query, options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('Google Maps API key not configured');
      }

      const { lat, lng, radius = 50000, type } = options;

      const params = {
        query,
        key: this.apiKey
      };

      if (lat && lng) {
        params.location = `${lat},${lng}`;
        params.radius = radius;
      }

      if (type) {
        params.type = type;
      }

      const response = await axios.get(`${this.baseURL}/place/textsearch/json`, {
        params
      });

      if (response.data.status === 'OK') {
        return response.data.results.map(place => ({
          placeId: place.place_id,
          name: place.name,
          formattedAddress: place.formatted_address,
          coordinates: [
            place.geometry.location.lng,
            place.geometry.location.lat
          ],
          rating: place.rating,
          priceLevel: place.price_level,
          types: place.types,
          photos: place.photos ? place.photos.map(photo => ({
            reference: photo.photo_reference,
            width: photo.width,
            height: photo.height
          })) : []
        }));
      } else {
        throw new Error(`Places search failed: ${response.data.status}`);
      }
    } catch (error) {
      logger.error('Error searching places:', error);
      throw error;
    }
  }

  /**
   * Get distance matrix between origins and destinations
   * @param {Array} origins - Array of origin addresses/coordinates
   * @param {Array} destinations - Array of destination addresses/coordinates
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Distance matrix
   */
  async getDistanceMatrix(origins, destinations, options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('Google Maps API key not configured');
      }

      const { mode = 'driving', units = 'metric' } = options;

      const response = await axios.get(`${this.baseURL}/distancematrix/json`, {
        params: {
          origins: origins.join('|'),
          destinations: destinations.join('|'),
          mode,
          units,
          key: this.apiKey
        }
      });

      if (response.data.status === 'OK') {
        return response.data;
      } else {
        throw new Error(`Distance matrix failed: ${response.data.status}`);
      }
    } catch (error) {
      logger.error('Error getting distance matrix:', error);
      throw error;
    }
  }

  /**
   * Get photo URL from photo reference
   * @param {string} photoReference - Photo reference from Places API
   * @param {number} maxWidth - Maximum width of the photo
   * @returns {string} - Photo URL
   */
  getPhotoUrl(photoReference, maxWidth = 400) {
    if (!this.apiKey) {
      return null;
    }

    return `${this.baseURL}/place/photo?photoreference=${photoReference}&maxwidth=${maxWidth}&key=${this.apiKey}`;
  }

  /**
   * Validate coordinates
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {boolean} - True if valid
   */
  validateCoordinates(lat, lng) {
    return (
      typeof lat === 'number' && 
      typeof lng === 'number' &&
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180
    );
  }

  /**
   * Calculate distance between two points (Haversine formula)
   * @param {number} lat1 - First point latitude
   * @param {number} lng1 - First point longitude
   * @param {number} lat2 - Second point latitude
   * @param {number} lng2 - Second point longitude
   * @returns {number} - Distance in kilometers
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees
   * @returns {number} - Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
}

module.exports = new GoogleMapsService();

