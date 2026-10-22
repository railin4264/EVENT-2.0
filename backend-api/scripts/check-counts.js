const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventconnect');
  const ev = await mongoose.connection.collection('events').countDocuments();
  const src = await mongoose.connection.collection('sources').countDocuments();
  const tr = await mongoose.connection.collection('tribes').countDocuments();
  const u = await mongoose.connection.collection('users').countDocuments();
  const posts = await mongoose.connection.collection('posts').countDocuments();
  
  // Also breakdown events by source or category
  const categories = await mongoose.connection.collection('events').aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  const sourcesBreakdown = await mongoose.connection.collection('events').aggregate([
    { $group: { _id: '$source', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  const countriesBreakdown = await mongoose.connection.collection('events').aggregate([
    { $group: { _id: '$location.countryCode', country: { $first: '$location.country' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  const topCities = await mongoose.connection.collection('events').aggregate([
    { $group: { _id: '$location.city', country: { $first: '$location.country' }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 15 }
  ]).toArray();

  const virtualCount = await mongoose.connection.collection('events').countDocuments({ isVirtual: true });

  console.log(JSON.stringify({
    counts: { events: ev, sources: src, tribes: tr, users: u, posts, virtualEvents: virtualCount },
    countriesBreakdown,
    topCities,
    categories,
    sourcesBreakdown
  }, null, 2));

  await mongoose.disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
