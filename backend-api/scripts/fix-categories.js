const mongoose = require('mongoose');

// Mapeo de categorías inglés -> español
const categoryMap = {
  'technology': 'tecnología',
  'music': 'música',
  'art': 'arte',
  'food': 'gastronomía',
  'sports': 'deportes',
  'education': 'educación',
  'networking': 'networking',
  'entertainment': 'entretenimiento',
  'culture': 'cultura',
  'health': 'salud'
};

mongoose.connect('mongodb://localhost:27017/eventconnect').then(async () => {
  const Event = require('../src/models/Event');

  const events = await Event.find({});
  console.log('=== ACTUALIZANDO CATEGORÍAS ===\n');

  for (const event of events) {
    const oldCategory = event.category;
    const newCategory = categoryMap[oldCategory] || oldCategory;

    if (oldCategory !== newCategory) {
      event.category = newCategory;
      await event.save();
      console.log('✅', event.title, ':', oldCategory, '->', newCategory);
    } else {
      console.log('⏭️ ', event.title, ': ya estaba en español (' + oldCategory + ')');
    }
  }

  console.log('\n=== CATEGORÍAS ACTUALIZADAS ===');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
