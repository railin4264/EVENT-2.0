'use strict';

const mongoose = require('mongoose');
const Event = require('../src/models/Event');
const { syncActionSportsAndCrafts } = require('../src/services/eventIngestion/actionSportsAndCraftsHarvester');
const { getCategoryFallbackImage } = require('../src/utils/imageFallbacks');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventconnect');

  console.log('--- 1. Syncing Action Sports, Crafts & Motor ---');
  const res = await syncActionSportsAndCrafts();
  console.log('Action sports result:', res);

  console.log('--- 2. Backfilling high-res fallback images for events without images ---');
  const allEvents = await Event.find({}).lean();
  let updated = 0;

  for (const ev of allEvents) {
    const hasValidImg = Array.isArray(ev.images) && ev.images.length > 0 && ev.images[0]?.url && /^https?:\/\//i.test(ev.images[0].url);
    if (!hasValidImg) {
      const url = getCategoryFallbackImage({
        category: ev.category,
        activityType: ev.activityType,
        tags: ev.tags,
        title: ev.title,
        isVirtual: ev.isVirtual
      });
      await Event.updateOne({ _id: ev._id }, { $set: { images: [{ url, caption: ev.title }] } });
      updated++;
    }
  }

  console.log(`Successfully checked ${allEvents.length} events and backfilled ${updated} with high-res curated imagery!`);

  await mongoose.disconnect();
})();
