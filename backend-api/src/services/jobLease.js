const crypto = require('crypto');
const JobLease = require('../models/JobLease');
const logger = require('../utils/logger');

// Shared leases prevent concurrent replicas from running the same scheduled job.
// Jobs must still be idempotent: process crashes can cause at-least-once execution.
async function withJobLease(name, run, { slot } = {}) {
  const owner = crypto.randomUUID(), ttl = 120000;
  try {
    await JobLease.findOneAndUpdate({ _id: name, expiresAt: { $lte: new Date() }, ...(slot ? { completedSlot: { $ne: slot } } : {}) },
      { $set: { owner, expiresAt: new Date(Date.now() + ttl) } }, { upsert: true, new: true });
  } catch (error) {
    if (error.code === 11000) return false;
    throw error; // Fail closed when the shared coordination store is unavailable.
  }
  const heartbeat = setInterval(() => {
    JobLease.updateOne({ _id: name, owner }, { $set: { expiresAt: new Date(Date.now() + ttl) } })
      .catch(() => logger.error('Scheduled job lease renewal failed', { job: name }));
  }, 30000);
  heartbeat.unref();
  let completed = false;
  try { await run(); completed = true; return true; }
  finally {
    clearInterval(heartbeat);
    await JobLease.updateOne({ _id: name, owner }, { $set: { expiresAt: new Date(0), ...(completed && slot ? { completedSlot: slot } : {}) } });
  }
}
module.exports = { withJobLease };
