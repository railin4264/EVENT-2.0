const { getRedisClient } = require('../config/redis');
const incrementScript = 'local count = redis.call(\'INCR\', KEYS[1]); if count == 1 then redis.call(\'PEXPIRE\', KEYS[1], ARGV[1]) end; return {count, redis.call(\'PTTL\', KEYS[1])}';

class SharedRateLimitStore {
  constructor(prefix) {
    this.prefix = `rate:${prefix}:`;
    this.localKeys = false;
    this.memoryHits = new Map();
  }
  init(options) {
    this.windowMs = options?.windowMs || 60000;
  }
  client() {
    const client = getRedisClient();
    if (!client?.isReady) {
      if (process.env.REDIS_REQUIRED === 'true') {
        throw new Error('Rate limit coordination unavailable');
      }
      return null;
    }
    return client;
  }
  async increment(key) {
    const redis = this.client();
    if (redis) {
      const [totalHits, ttl] = await redis.eval(incrementScript, { keys: [this.prefix + key], arguments: [String(this.windowMs)] });
      return { totalHits: Number(totalHits), resetTime: new Date(Date.now() + Math.max(0, Number(ttl))) };
    }
    // In-memory fallback when Redis is not connected (e.g. unit/integration tests)
    const now = Date.now();
    const hit = this.memoryHits.get(key);
    if (!hit || hit.resetTime <= now) {
      this.memoryHits.set(key, { totalHits: 1, resetTime: now + this.windowMs });
      return { totalHits: 1, resetTime: new Date(now + this.windowMs) };
    }
    hit.totalHits += 1;
    return { totalHits: hit.totalHits, resetTime: new Date(hit.resetTime) };
  }
  async decrement(key) {
    const redis = this.client();
    if (redis) {
      await redis.eval('if tonumber(redis.call(\'GET\', KEYS[1]) or \'0\') > 0 then return redis.call(\'DECR\', KEYS[1]) end; return 0', { keys: [this.prefix + key], arguments: [] });
      return;
    }
    const hit = this.memoryHits.get(key);
    if (hit && hit.totalHits > 0) hit.totalHits -= 1;
  }
  async resetKey(key) {
    const redis = this.client();
    if (redis) {
      await redis.del(this.prefix + key);
      return;
    }
    this.memoryHits.delete(key);
  }
}

module.exports = { SharedRateLimitStore };
