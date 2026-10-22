const mongoose = require('mongoose');
const connectDB = require('../src/config/database');
const logger = require('../src/utils/logger');
test('production fails closed without a URI and never logs credentials or falls back to a local database', async () => {
  const original = { NODE_ENV: process.env.NODE_ENV, MONGODB_URI: process.env.MONGODB_URI };
  const connect = jest.spyOn(mongoose, 'connect').mockRejectedValue(new Error('mongodb://user:PRIVATE_PASSWORD@host/database'));
  const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
  try {
    process.env.NODE_ENV = 'production'; process.env.MONGODB_URI = '';
    await expect(connectDB()).rejects.toThrow('MONGODB_URI is required');
    expect(connect).not.toHaveBeenCalled();
    process.env.MONGODB_URI = 'mongodb://user:PRIVATE_PASSWORD@host/database';
    await expect(connectDB()).rejects.toThrow('unavailable');
    expect(connect).toHaveBeenCalledTimes(1);
    expect(connect.mock.calls[0][1]).toMatchObject({ autoIndex: false, maxPoolSize: 20, waitQueueTimeoutMS: 5000 });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('PRIVATE_PASSWORD');
  } finally {
    for (const [key, value] of Object.entries(original)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    jest.restoreAllMocks();
  }
});
