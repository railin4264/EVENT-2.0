require('dotenv').config();
const { MongoClient } = require('mongoose').mongo;
const { inspectEventScale } = require('../src/services/eventScaleInspection');
async function main() {
  if (process.argv.includes('--help')) { console.log('Read-only event sizes and explain. Uses MONGODB_URI; prints no event content, addresses or credentials. Does not certify capacity.'); return; }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  const client = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 2, serverSelectionTimeoutMS: 5000, readPreference: 'secondaryPreferred' });
  try {
    await client.connect();
    console.log(JSON.stringify(await inspectEventScale(client.db().collection('events')), null, 2));
  } finally { await client.close(); }
}
main().catch(() => { console.error('Scale inspection failed; no database changes applied.'); process.exitCode = 1; });
