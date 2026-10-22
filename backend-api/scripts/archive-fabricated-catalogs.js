/**
 * Retira los eventos escritos por los catálogos estáticos (fechas calculadas
 * desde "ahora", precios y enlaces sin fuente). Sin --apply solo informa.
 * Uso: node scripts/archive-fabricated-catalogs.js [--apply --backup=/ruta/absoluta.json]
 */
const fs = require('fs'), path = require('path'), mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { FABRICATED_CATALOG_FILTERS } = require('../src/services/eventIngestion/demoCatalogGuard');
const { GLOBAL_VIRTUAL_EVENTS } = require('../src/services/eventIngestion/virtualEventHarvester');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const db = mongoose.connection.db;
    const virtualTitles = GLOBAL_VIRTUAL_EVENTS.map(e => e.title);
    const filter = { archivedAt: null, $or: [...FABRICATED_CATALOG_FILTERS, { isVirtual: true, title: { $in: virtualTitles }, 'location.country': 'Mundial' }] };
    const events = await db.collection('events').find(filter).toArray();
    const withPeople = events.filter(e => (e.attendees || []).length > 0);
    console.log(JSON.stringify({
      eventCount: events.length,
      bySource: events.reduce((acc, e) => { const k = e.source || e.publicSource?.platform || 'virtual_catalog'; acc[k] = (acc[k] || 0) + 1; return acc; }, {}),
      eventsWithAttendees: withPeople.map(e => ({ id: String(e._id), title: e.title, attendees: e.attendees.length }))
    }, null, 2));
    if (!process.argv.includes('--apply')) return;
    const backupPath = process.argv.find(a => a.startsWith('--backup='))?.slice(9);
    if (!backupPath || !path.isAbsolute(backupPath)) throw new Error('Absolute --backup path required');
    fs.writeFileSync(backupPath, mongoose.mongo.BSON.EJSON.stringify({ at: new Date(), events }, null, 2), { flag: 'wx' });
    if (events.length) {
      await db.collection('events').updateMany({ _id: { $in: events.map(e => e._id) }, archivedAt: null }, {
        $set: { archivedAt: new Date(), status: 'draft', isOfficial: false, isFeatured: false, verified: false, curatorVerified: false, editorialApproved: false },
        $addToSet: { tags: 'demo' }
      });
    }
    console.log('Archived; recovery backup: ' + backupPath);
  } finally { await mongoose.disconnect(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
