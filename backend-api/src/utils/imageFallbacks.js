'use strict';

/**
 * imageFallbacks.js
 * ------------------------------------------------------------------
 * Curated high-resolution (1200x800) royalty-free Unsplash photography
 * categorized by activity, theme, and keywords so no event ever renders
 * with an empty or broken placeholder.
 */

const FALLBACK_IMAGE_MAP = {
  // Motors, Racing & Monster Trucks
  monster_truck: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200&q=80',
  racing: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1200&q=80',
  cars: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80',

  // Water Sports & Jet Ski
  jetski: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80',
  water_sports: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80',
  surf: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=1200&q=80',
  kayak: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80',

  // Running & Park Races
  running: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1200&q=80',
  marathon: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1200&q=80',
  sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=80',

  // Cycling & Bicycles
  cycling: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1200&q=80',
  bicycle: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1200&q=80',

  // Workshops & Crafts
  workshop: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=1200&q=80',
  woodworking: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=1200&q=80',
  ceramics: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&q=80',
  coffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80',

  // Technology & Hackathons
  technology: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80',
  hackathon: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80',
  ai: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',

  // Virtual & Streaming
  virtual: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=1200&q=80',
  webinar: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=1200&q=80',

  // Sci-Fi & Cyberpunk
  scifi: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80',
  cyberpunk: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&q=80',

  // Ghosts, Mysteries & Night Legends
  mystery: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=80',
  ghost: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=80',

  // UFOs & Astronomy
  astronomy: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&q=80',
  ufo: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80',

  // Clean Energy & Climate
  clean_energy: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1200&q=80',
  green: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1200&q=80',

  // University & Education
  university: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&q=80',
  education: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80',

  // Fashion, Modeling, Makeup & Digital Magazines
  fashion: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80',
  runway: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200&q=80',
  makeup: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1200&q=80',
  modeling: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&q=80',
  digital_magazine: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&q=80',

  // Standard Categories
  music: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80',
  art: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1200&q=80',
  dance: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&q=80',
  food: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80',
  wellness: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80',
  outdoors: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=1200&q=80',
  culture: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=1200&q=80',
  community: 'https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?w=1200&q=80',
  family: 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=1200&q=80',
  gaming: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&q=80',
  film: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80',
  photography: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200&q=80',
  nightlife: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80',
  entertainment: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200&q=80',
  business: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
  health: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&q=80',
  party: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80',
  other: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80'
};

/**
 * Resolves the best-matching fallback image URL based on metadata.
 */
function getCategoryFallbackImage({ category = '', activityType = '', tags = [], title = '', isVirtual = false } = {}) {
  const text = `${title} ${activityType} ${tags.join(' ')} ${category}`.toLowerCase();

  if (isVirtual || text.includes('virtual') || text.includes('stream') || text.includes('webinar')) {
    return FALLBACK_IMAGE_MAP.virtual;
  }
  if (text.includes('monster') || text.includes('camion') || text.includes('drifting') || text.includes('karting') || text.includes('concesionario') || text.includes('vehiculo')) {
    return FALLBACK_IMAGE_MAP.monster_truck;
  }
  if (text.includes('jetski') || text.includes('jet ski') || text.includes('moto acuatica') || text.includes('surf') || text.includes('kayak') || text.includes('paddle') || text.includes('acuatica')) {
    return FALLBACK_IMAGE_MAP.jetski;
  }
  if (text.includes('running') || text.includes('correr') || text.includes('maraton') || text.includes('5k') || text.includes('10k') || text.includes('carrera en el parque') || text.includes('atletismo')) {
    return FALLBACK_IMAGE_MAP.running;
  }
  if (text.includes('bici') || text.includes('ciclismo') || text.includes('bicicleta') || text.includes('ciclovia')) {
    return FALLBACK_IMAGE_MAP.cycling;
  }
  if (text.includes('scifi') || text.includes('sci-fi') || text.includes('ciencia ficcion') || text.includes('cyberpunk')) {
    return FALLBACK_IMAGE_MAP.scifi;
  }
  if (text.includes('fantasma') || text.includes('misterio') || text.includes('leyenda') || text.includes('nocturno')) {
    return FALLBACK_IMAGE_MAP.mystery;
  }
  if (text.includes('ovni') || text.includes('ufo') || text.includes('uap') || text.includes('astrobiologia') || text.includes('telescopio') || text.includes('astronomia')) {
    return FALLBACK_IMAGE_MAP.astronomy;
  }
  if (text.includes('solar') || text.includes('energialimpia') || text.includes('energia limpia') || text.includes('sostenibilidad') || text.includes('reciclaje') || text.includes('clima')) {
    return FALLBACK_IMAGE_MAP.clean_energy;
  }
  if (text.includes('universidad') || text.includes('facultad') || text.includes('campus') || text.includes('simposio') || text.includes('conferencia')) {
    return FALLBACK_IMAGE_MAP.university;
  }
  if (text.includes('taller') || text.includes('workshop') || text.includes('carpinteria') || text.includes('ceramica') || text.includes('oficio')) {
    return FALLBACK_IMAGE_MAP.workshop;
  }
  if (text.includes('maquillaje') || text.includes('makeup') || text.includes('cosmetica') || text.includes('skincare') || text.includes('belleza')) {
    return FALLBACK_IMAGE_MAP.makeup;
  }
  if (text.includes('pasarela') || text.includes('runway') || text.includes('modelaje') || text.includes('model') || text.includes('casting')) {
    return FALLBACK_IMAGE_MAP.runway;
  }
  if (text.includes('revista') || text.includes('magazine') || text.includes('editorial') || text.includes('lookbook')) {
    return FALLBACK_IMAGE_MAP.digital_magazine;
  }
  if (text.includes('moda') || text.includes('fashion') || text.includes('ropa') || text.includes('haute couture') || text.includes('diseno textil')) {
    return FALLBACK_IMAGE_MAP.fashion;
  }
  if (text.includes('cafe') || text.includes('barista') || text.includes('gastronomia') || text.includes('comida') || text.includes('culinaria')) {
    return FALLBACK_IMAGE_MAP.food;
  }

  const cleanCat = String(category).toLowerCase();
  return FALLBACK_IMAGE_MAP[cleanCat] || FALLBACK_IMAGE_MAP.other;
}

module.exports = {
  FALLBACK_IMAGE_MAP,
  getCategoryFallbackImage
};
