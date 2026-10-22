// Read-only release preflight. Never creates or drops an index.
require('dotenv').config();
const mongoose = require('mongoose');
const models = ['User', 'Notification', 'PushReceipt', 'UserWorkspace', 'OAuthState', 'JobLease', 'Ticket', 'Order', 'AnalyticsEvent'];
async function verify() {
  if (process.argv.includes('--help')) { console.log('Read-only check: MONGODB_URI must point to the intended release database. No schema changes are applied.'); return; }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  mongoose.set('autoCreate', false);
  mongoose.set('autoIndex', false);
  await mongoose.connect(process.env.MONGODB_URI, { autoCreate: false, autoIndex: false, maxPoolSize: 2, serverSelectionTimeoutMS: 5000 });
  require('../src/routes/analytics');
  let missing = 0;
  for (const name of models) {
    const model = name === 'AnalyticsEvent' ? mongoose.model(name) : require(`../src/models/${name}`);
    const expected = model.schema.indexes().filter(([, options]) => options.unique || options.expireAfterSeconds !== undefined);
    let indexes = [];
    try { indexes = await model.collection.listIndexes().toArray(); }
    catch (error) { if (error.code !== 26) throw error; }
    for (const [keys, options] of expected) {
      const found = indexes.some(index => Boolean(index.unique) === Boolean(options.unique) && index.expireAfterSeconds === options.expireAfterSeconds && JSON.stringify(index.key) === JSON.stringify(keys) &&
        Boolean(index.sparse) === Boolean(options.sparse) && JSON.stringify(index.partialFilterExpression || null) === JSON.stringify(options.partialFilterExpression || null));
      if (!found) { console.error(`Missing required index: ${model.collection.collectionName} ${JSON.stringify(keys)}`); missing++; }
    }
  }
  if (missing) throw new Error('Required indexes must be reviewed and prepared before release');
  console.log('Required unique and expiry indexes verified');
}
verify().catch(() => { console.error('Release index check failed; no changes applied.'); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
