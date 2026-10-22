const fs = require('fs'), path = require('path'), vm = require('vm'), mongoose = require('mongoose');
require('dotenv').config();
function data(file, cut, expression) {
  const source = fs.readFileSync(path.join(__dirname, '../src/services', file), 'utf8');
  const context = { module: { exports: {} }, require: () => ({}), Date };
  vm.runInNewContext(source.slice(0, source.indexOf(cut)) + '\nmodule.exports = '+expression, context, { timeout: 1000 });
  return context.module.exports;
}
(async () => {
  const entries = [...data('rdEventSeeder.js','class RDEventSeeder','getEventsData({})'), ...data('seedDominicanMasterEcosystem.js','async function seedMasterEcosystem','MASTER_EVENTS'), ...data('eventIngestion/GlobalEventHarvester.js','class GlobalEventHarvester','CATALOG_ITEMS')];
  const fingerprints = entries.filter(e=>e.title && e.description && e.location?.coordinates).map(e=>({title:e.title,description:e.description,'location.coordinates':e.location.coordinates}));
  const pairs = [['DJ Manny & SoundPro Quisqueya','18095550199'],['Caribe Lens & Drone Visuals','18295550145'],['Mixología Criolla & Barras Móviles','18495550122'],['Skyline Terrace Bella Vista','18095550177'],['Chillout Deco & Luces de Hadas RD','18295550188'],['Seguridad & Protocolo Quisqueya','18095550111']];
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const db = mongoose.connection.db;
    const events = await db.collection('events').find({archivedAt:null,$or:fingerprints}).toArray();
    const suppliers = await db.collection('suppliers').find({archivedAt:null,$or:pairs.map(([name,whatsapp])=>({name,whatsapp}))}).toArray();
    console.log(JSON.stringify({eventCount:events.length,supplierCount:suppliers.length,titles:events.map(e=>e.title)}));
    if (!process.argv.includes('--apply')) return;
    const backupPath = process.argv.find(a=>a.startsWith('--backup='))?.slice(9);
    if (!backupPath || !path.isAbsolute(backupPath)) throw new Error('Absolute --backup path required');
    fs.writeFileSync(backupPath,mongoose.mongo.BSON.EJSON.stringify({at:new Date(),events,suppliers},null,2),{flag:'wx'});
    const archivedAt = new Date();
    if(events.length) await db.collection('events').updateMany({_id:{$in:events.map(e=>e._id)},archivedAt:null},{$set:{archivedAt,status:'draft',isOfficial:false,isFeatured:false,isOrganizerVerified:false},$addToSet:{tags:'demo'}});
    if(suppliers.length) await db.collection('suppliers').updateMany({_id:{$in:suppliers.map(e=>e._id)},archivedAt:null},{$set:{archivedAt,isVerified:false,featured:false,rating:0,reviewsCount:0}});
    console.log('Archived; recovery backup: '+backupPath);
  } finally { await mongoose.disconnect(); }
})().catch(error=>{console.error(error.message);process.exitCode=1});
