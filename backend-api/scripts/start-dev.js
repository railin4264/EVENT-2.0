// Start the backend with an in-memory MongoDB and leave it LISTENING (for manual
// functional testing / smoke tests). Local Redis is used if available.
const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  const env = Object.assign({}, process.env, {
    MONGODB_URI: uri,
    NODE_ENV: 'development',
    JWT_SECRET: process.env.JWT_SECRET || 'dev-verify-secret-' + Date.now(),
    PORT: process.env.PORT || '5077',
  });
  console.log('MMS_URI=' + uri);
  console.log('PORT=' + env.PORT);

  const srv = spawn('node', [path.join(__dirname, '..', 'src', 'server.js')], {
    env,
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  srv.on('exit', (code) => {
    console.log('SERVER_EXIT=' + code);
    mongod.stop().catch(() => {});
  });
  // Keep this process alive; the child server handles requests.
})().catch((e) => {
  console.error('START_FAILED', e && e.stack ? e.stack : e);
  process.exit(1);
});
