// Start the backend with an in-memory MongoDB (mongodb-memory-server) so it can
// run locally without a system mongod binary. Spawns the REAL server as the main
// module (so its `if (require.main === module)` listen block runs), with
// MONGODB_URI pointed at the in-memory instance. Local verification only.
const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const path = require('path');

process.on('unhandledRejection', (r) => console.error('UNHANDLED_REJECTION:', r && r.stack ? r.stack : r));

(async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  const env = Object.assign({}, process.env, {
    MONGODB_URI: uri,
    NODE_ENV: process.env.NODE_ENV || 'development',
    JWT_SECRET: process.env.JWT_SECRET || 'dev-verify-secret-' + Date.now(),
    PORT: process.env.PORT || '5055',
    REDIS_ENABLED: 'false'
  });
  console.log('MMS_URI=' + uri);

  const srv = spawn('node', [path.join(__dirname, '..', 'src', 'server.js')], {
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let out = '';
  srv.stdout.on('data', (d) => (out += d));
  srv.stderr.on('data', (d) => (out += d));

  // Wait for listen, then health-check
  const http = require('http');
  setTimeout(() => {
    http.get(`http://localhost:${env.PORT}/health`, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        console.log('HEALTH_STATUS=' + res.statusCode);
        console.log('HEALTH_BODY=' + body);
        console.log('SERVER_LOG_TAIL=' + out.slice(-600));
        srv.kill();
        mongod.stop();
        process.exit(0);
      });
    }).on('error', (e) => {
      console.log('HEALTH_ERROR=' + (e && e.stack ? e.stack : e.message));
      console.log('SERVER_LOG_TAIL=' + out.slice(-800));
      srv.kill();
      mongod.stop();
      process.exit(1);
    });
  }, 6000);
})().catch((e) => {
  console.error('START_FAILED', e && e.stack ? e.stack : e);
  process.exit(1);
});
