#!/usr/bin/env node

const redis = require('redis');
const colors = require('colors');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function setupRedis() {
  console.log('\n⚡ SETTING UP REDIS'.bold.cyan);
  console.log('='.repeat(50).gray);

  try {
    console.log(`🔌 Connecting to: ${REDIS_URL}`.yellow);
    
    const client = redis.createClient({
      url: REDIS_URL,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true
      }
    });

    client.on('error', (err) => {
      console.log(`❌ Redis Client Error: ${err.message}`.red);
    });

    client.on('connect', () => {
      console.log('🔗 Redis Client Connected'.green);
    });

    client.on('ready', () => {
      console.log('✅ Redis Client Ready'.green);
    });

    await client.connect();
    
    // Test basic operations
    console.log('\n🧪 Testing Redis operations...'.yellow);
    
    // Set and get test
    await client.set('test:connection', 'EventConnect Redis Test', { EX: 10 });
    const testValue = await client.get('test:connection');
    
    if (testValue === 'EventConnect Redis Test') {
      console.log('  ✅ SET/GET operations working'.green);
    } else {
      throw new Error('SET/GET test failed');
    }
    
    // Hash operations test
    await client.hSet('test:hash', {
      field1: 'value1',
      field2: 'value2',
      timestamp: Date.now().toString()
    });
    
    const hashValue = await client.hGetAll('test:hash');
    if (Object.keys(hashValue).length === 3) {
      console.log('  ✅ HASH operations working'.green);
    } else {
      throw new Error('HASH test failed');
    }
    
    // List operations test
    await client.lPush('test:list', ['item1', 'item2', 'item3']);
    const listLength = await client.lLen('test:list');
    
    if (listLength === 3) {
      console.log('  ✅ LIST operations working'.green);
    } else {
      throw new Error('LIST test failed');
    }
    
    // Clean up test data
    await client.del(['test:connection', 'test:hash', 'test:list']);
    console.log('  🧹 Test data cleaned up'.gray);
    
    // Set up initial cache structure
    console.log('\n🏗️ Setting up cache structure...'.yellow);
    
    const cacheKeys = [
      'events:popular',
      'events:trending',
      'tribes:featured',
      'ai:recommendations',
      'gamification:leaderboards'
    ];
    
    for (const key of cacheKeys) {
      await client.set(`cache:${key}:initialized`, '1', { EX: 86400 }); // 24 hours
      console.log(`  ✅ Initialized cache key: ${key}`.green);
    }
    
    // Display Redis info
    const info = await client.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown';
    console.log(`\n📊 Redis Server Info:`.cyan);
    console.log(`  Version: ${version}`.gray);
    console.log(`  URL: ${REDIS_URL}`.gray);
    
    await client.disconnect();
    console.log('\n🎉 Redis setup completed successfully!'.bold.green);
    console.log('\n💡 Redis Cache Usage:'.bold.yellow);
    console.log('  - Session storage');
    console.log('  - API response caching');
    console.log('  - Real-time data (notifications, messages)');
    console.log('  - Rate limiting counters');
    console.log('  - Temporary data storage');
    
  } catch (error) {
    console.log(`❌ Redis setup failed: ${error.message}`.red);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.log('\n💡 SOLUTION:'.bold.yellow);
      console.log('1. Install Redis:');
      console.log('   Windows: https://redis.io/docs/getting-started/installation/install-redis-on-windows/');
      console.log('   macOS: brew install redis');
      console.log('   Linux: sudo apt-get install redis-server');
      console.log('\n2. Start Redis service:');
      console.log('   Windows: redis-server');
      console.log('   macOS: brew services start redis');
      console.log('   Linux: sudo systemctl start redis');
      console.log('\n🌐 OR use Redis Cloud:');
      console.log('1. Create account: https://redis.com/try-free/');
      console.log('2. Create database and get connection string');
      console.log('3. Update REDIS_URL in .env file');
      console.log('\n⚠️  Note: Redis is optional for basic functionality');
    }
    
    process.exit(1);
  }
}

// Run setup
setupRedis().catch(console.error);
