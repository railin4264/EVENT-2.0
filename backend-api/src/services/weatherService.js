'use strict';

/**
 * weatherService.js
 * ------------------------------------------------------------------
 * Smart Weather Shield for EventNow 2.0.
 * Connects to Open-Meteo API (100% free, zero-key, global forecast)
 * to provide real-time weather and forecast contingencies for events.
 */

const { fetchSource } = require('./eventIngestion/safeSourceFetch');
const logger = require('../utils/logger') || console;

const WMO_CODE_MAP = {
  0: { label: 'Despejado', emoji: '☀️', condition: 'clear' },
  1: { label: 'Mayormente despejado', emoji: '🌤️', condition: 'mostly_clear' },
  2: { label: 'Parcialmente nublado', emoji: '⛅', condition: 'partly_cloudy' },
  3: { label: 'Nublado', emoji: '☁️', condition: 'cloudy' },
  45: { label: 'Neblina', emoji: '🌫️', condition: 'fog' },
  48: { label: 'Niebla con escarcha', emoji: '🌫️', condition: 'fog' },
  51: { label: 'Llovizna ligera', emoji: '🌦️', condition: 'light_rain' },
  53: { label: 'Llovizna moderada', emoji: '🌦️', condition: 'rain' },
  55: { label: 'Llovizna intensa', emoji: '🌧️', condition: 'heavy_rain' },
  61: { label: 'Lluvia ligera', emoji: '🌦️', condition: 'light_rain' },
  63: { label: 'Lluvia moderada', emoji: '🌧️', condition: 'rain' },
  65: { label: 'Lluvia fuerte', emoji: '🌧️', condition: 'heavy_rain' },
  71: { label: 'Nevada ligera', emoji: '🌨️', condition: 'snow' },
  73: { label: 'Nevada moderada', emoji: '❄️', condition: 'snow' },
  75: { label: 'Nevada fuerte', emoji: '❄️', condition: 'heavy_snow' },
  80: { label: 'Chubascos ligeros', emoji: '🌦️', condition: 'rain_showers' },
  81: { label: 'Chubascos moderados', emoji: '🌧️', condition: 'rain_showers' },
  82: { label: 'Chubascos violentos', emoji: '⛈️', condition: 'severe_showers' },
  95: { label: 'Tormenta eléctrica', emoji: '⛈️', condition: 'thunderstorm' },
  96: { label: 'Tormenta con granizo ligero', emoji: '⛈️', condition: 'thunderstorm_hail' },
  99: { label: 'Tormenta con granizo fuerte', emoji: '⛈️', condition: 'severe_thunderstorm' }
};

const weatherCache = new Map();
const CACHE_TTL_MS = 45 * 60 * 1000; // 45 minutes

function generateAdvice(temp, precipProb, code) {
  const isRain = (code >= 51 && code <= 67) || (code >= 80 && code <= 99) || precipProb >= 40;
  if (code >= 95) {
    return '⛈️ Alerta de tormenta eléctrica. Se recomienda confirmar con los organizadores si el evento se traslada a recinto cerrado.';
  }
  if (isRain) {
    return `🌧️ Probabilidad de lluvia (${precipProb}%). Se sugiere llevar paraguas o impermeable y calzado adecuado.`;
  }
  if (temp >= 31) {
    return `☀️ Clima caluroso (${Math.round(temp)}°C). Mantén buena hidratación y usa protección solar.`;
  }
  if (temp <= 14) {
    return `🧥 Ambiente fresco (${Math.round(temp)}°C). Lleva una chaqueta o abrigo cómodo para la noche.`;
  }
  return '✨ Excelentes condiciones meteorológicas para disfrutar de actividades al aire libre.';
}

/**
 * Retrieves weather forecast for given coordinates and target date.
 */
async function getWeatherForCoordinates(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return null;
  }

  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;
  const cacheKey = `${roundedLat},${roundedLng}`;

  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${roundedLat}&longitude=${roundedLng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&timezone=auto`;
    const res = await fetchSource(url, { maxBytes: 1024 * 1024 });
    const data = res.data;

    const current = data.current || {};
    const code = current.weather_code != null ? current.weather_code : 0;
    const info = WMO_CODE_MAP[code] || { label: 'Parcialmente nublado', emoji: '⛅', condition: 'partly_cloudy' };
    const temp = current.temperature_2m || 25;
    const feelsLike = current.apparent_temperature || temp;
    const humidity = current.relative_humidity_2m || 60;
    const windSpeed = current.wind_speed_10m || 10;

    // Get hourly precipitation probability average
    const hourlyProbs = data.hourly?.precipitation_probability || [];
    const precipProb = hourlyProbs.length > 0 ? Math.round(hourlyProbs.slice(0, 12).reduce((a, b) => a + b, 0) / Math.min(12, hourlyProbs.length)) : 10;

    const advice = generateAdvice(temp, precipProb, code);

    const result = {
      temperature: Math.round(temp),
      feelsLike: Math.round(feelsLike),
      humidity,
      windSpeed: Math.round(windSpeed),
      precipitationProbability: precipProb,
      weatherCode: code,
      label: info.label,
      emoji: info.emoji,
      condition: info.condition,
      advice,
      isOutdoorFriendly: code < 61 && precipProb < 50,
      timestamp: new Date().toISOString()
    };

    weatherCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  } catch (err) {
    logger.warn?.(`[WeatherService] Could not fetch forecast for ${lat},${lng}: ${err.message}`);
    return null;
  }
}

module.exports = {
  getWeatherForCoordinates,
  WMO_CODE_MAP,
  generateAdvice
};
