/**
 * Mobile App - Genre-Specific High Resolution Fallback Photography
 * Ensures 100% visual fidelity for all categories and themes:
 * Monster Trucks, Jet Ski, Running, Biking, Crafts, Sci-Fi, Ghosts, UFOs, Clean Energy, Universities, etc.
 */

export function getEventFallbackImage(category?: string, title?: string, activityType?: string): string {
  const text = `${category || ''} ${title || ''} ${activityType || ''}`.toLowerCase()

  if (text.includes('monster') || text.includes('camion') || text.includes('drifting') || text.includes('concesionario') || text.includes('motor') || text.includes('auto')) {
    return 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1200&q=80'
  }
  if (text.includes('jet ski') || text.includes('jetski') || text.includes('acuat') || text.includes('agua') || text.includes('marina') || text.includes('buceo') || text.includes('paddle') || text.includes('surf')) {
    return 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80'
  }
  if (text.includes('running') || text.includes('correr') || text.includes('5k') || text.includes('10k') || text.includes('carrera') || text.includes('maraton')) {
    return 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1200&q=80'
  }
  if (text.includes('bici') || text.includes('bicicleta') || text.includes('ciclismo')) {
    return 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1200&q=80'
  }
  if (text.includes('taller') || text.includes('workshop') || text.includes('carpinteria') || text.includes('ceramica') || text.includes('barismo') || text.includes('artesania')) {
    return 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=1200&q=80'
  }
  if (text.includes('tech') || text.includes('ia') || text.includes('hackathon') || text.includes('robot') || text.includes('software') || text.includes('programac')) {
    return 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80'
  }
  if (text.includes('universidad') || text.includes('educacion') || text.includes('simposio') || text.includes('academic') || text.includes('campus')) {
    return 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&q=80'
  }
  if (text.includes('solar') || text.includes('energialimpia') || text.includes('clima') || text.includes('verde') || text.includes('sustentab') || text.includes('planeta')) {
    return 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1200&q=80'
  }
  if (text.includes('scifi') || text.includes('cyberpunk') || text.includes('ciencia ficcion') || text.includes('futur')) {
    return 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&q=80'
  }
  if (text.includes('fantasma') || text.includes('misterio') || text.includes('leyenda') || text.includes('paranormal') || text.includes('oculto')) {
    return 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&q=80'
  }
  if (text.includes('ufo') || text.includes('ovni') || text.includes('astronomia') || text.includes('alien') || text.includes('espacio')) {
    return 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1200&q=80'
  }
  if (text.includes('maquillaje') || text.includes('makeup') || text.includes('skincare') || text.includes('cosmetica') || text.includes('belleza')) {
    return 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1200&q=80'
  }
  if (text.includes('pasarela') || text.includes('runway') || text.includes('modelaje') || text.includes('model') || text.includes('casting')) {
    return 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200&q=80'
  }
  if (text.includes('revista') || text.includes('magazine') || text.includes('editorial') || text.includes('lookbook')) {
    return 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&q=80'
  }
  if (text.includes('moda') || text.includes('fashion') || text.includes('ropa') || text.includes('haute couture') || text.includes('textil')) {
    return 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80'
  }
  if (text.includes('music') || text.includes('concierto') || text.includes('rock') || text.includes('jazz') || text.includes('festival')) {
    return 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80'
  }
  if (text.includes('food') || text.includes('comida') || text.includes('gastronomia') || text.includes('degustacion')) {
    return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80'
  }
  if (text.includes('deporte') || text.includes('sport') || text.includes('fitness')) {
    return 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=80'
  }

  return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80'
}

/**
 * Normalizes an image URL for Mobile App, replacing missing or broken images
 * with curated genre photography.
 */
export function getMobileImageUrl(
  imageUrl?: string | { url?: string } | null,
  category?: string,
  title?: string,
  activityType?: string
): string {
  let url: string | undefined
  if (!imageUrl) url = undefined
  else if (typeof imageUrl === 'string') url = imageUrl
  else if (typeof imageUrl === 'object' && 'url' in imageUrl) url = (imageUrl as { url?: string }).url

  if (!url || url.trim() === '' || url === '/default-avatar.png') {
    return getEventFallbackImage(category, title, activityType)
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url.replace('photo-1520523839898-5071216a7d33', 'photo-1511671782779-c97d3d27a1d4')
  }

  // Local/backend URL fallback
  return url
}
