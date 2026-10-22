const { buildAgeRestrictionFilter } = require('./eventVisibility');
const { buildCategoryFilterQuery } = require('./categories');
const { confirmedRegistrations } = require('./recommendationRanking');

const CARD_FIELDS = '_id title description category activityType date endDate timeZone location images price isFeatured featuredRank isUnofficial isSecretLocation isVirtual paymentMode ticketUrl maxAttendees createdBy organizer interestedCount tags imported source createdAt';
function publicEventCard(event) {
  const source = event.toObject ? event.toObject() : event;
  const card = Object.fromEntries(CARD_FIELDS.split(' ').filter(key => source[key] !== undefined).map(key => [key, source[key]]));
  card.attendeesCount = confirmedRegistrations(source.attendees);
  if (source.isSecretLocation && source.location) {
    // A public recommendation never reveals a street, venue or exact coordinate.
    card.location = { city: source.location.city, country: source.location.country,
      countryCode: source.location.countryCode, address: 'Ubicación secreta · se revela al confirmar' };
  }
  return card;
}
function publicRecommendationFilter(user, options = {}) {
  const category = buildCategoryFilterQuery({ ...options, userPreferences: user?.settings?.preferences });
  const now = new Date();
  const coords = options.location || (Array.isArray(user?.location?.coordinates) && user.location.coordinates.some(n => n !== 0) ? { lng: user.location.coordinates[0], lat: user.location.coordinates[1] } : null);
  const geo = coords && Number.isFinite(Number(coords.lat)) && Number.isFinite(Number(coords.lng)) && Math.abs(Number(coords.lat)) <= 90 && Math.abs(Number(coords.lng)) <= 180
    ? { location: { $geoWithin: { $centerSphere: [[Number(coords.lng), Number(coords.lat)], Math.min(500, Math.max(0.1, Number(options.radius) || 50)) / 6371] } } } : {};
  return { ...geo, status: 'published', isPrivate: { $ne: true }, ...buildAgeRestrictionFilter(user),
    ...(category !== null ? { category } : {}),
    $or: [{ endDate: { $gte: now } }, { endDate: null, date: { $gte: now } }] };
}
module.exports = { CARD_FIELDS, publicEventCard, publicRecommendationFilter };
