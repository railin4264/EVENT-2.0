const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.use(restrictTo('admin'));

const sanitize = (value, maxLength = 500) => {
  if (typeof value !== 'string') return String(value ?? '').slice(0, maxLength);
  return value.replace(/[\r\n]/g, ' ').slice(0, maxLength);
};

// Endpoint para recibir errores de consola del frontend
router.post('/console-errors', (req, res) => {
  const { level, message, url, line, column, error, timestamp, userAgent } = req.body;

  console.log('\n🔥 ===== FRONTEND CONSOLE ERROR =====');
  console.log(`📅 Time: ${new Date(Number(timestamp)).toISOString()}`);
  console.log(`🎯 Level: ${sanitize(level, 20).toUpperCase()}`);
  console.log(`📝 Message: ${sanitize(message)}`);
  console.log(`🌐 URL: ${sanitize(url)}`);
  console.log(`📍 Line: ${parseInt(line) || 0}:${parseInt(column) || 0}`);
  console.log(`🖥️  User Agent: ${sanitize(userAgent)}`);

  if (error) {
    console.log(`💥 Stack trace: ${sanitize(error, 1000)}`);
  }

  console.log('🔥 ================================\n');

  res.status(200).json({ received: true });
});

// Endpoint para recibir logs de red (network errors)
router.post('/network-errors', (req, res) => {
  const { url, method, status, statusText, response, timestamp } = req.body;

  console.log('\n🌐 ===== FRONTEND NETWORK ERROR =====');
  console.log(`📅 Time: ${new Date(Number(timestamp)).toISOString()}`);
  console.log(`🎯 Method: ${sanitize(method, 10)}`);
  console.log(`🌐 URL: ${sanitize(url)}`);
  console.log(`💥 Status: ${parseInt(status) || 0} ${sanitize(statusText, 50)}`);

  if (response) {
    console.log(`📝 Response: ${sanitize(JSON.stringify(response), 500)}`);
  }

  console.log('🌐 =================================\n');

  res.status(200).json({ received: true });
});

// Endpoint para logs generales del frontend
router.post('/frontend-logs', (req, res) => {
  const { level, message, data, timestamp } = req.body;

  console.log(`\n📱 [FRONTEND ${sanitize(level, 20).toUpperCase()}] ${new Date(Number(timestamp)).toISOString()}`);
  console.log(`📝 ${sanitize(message)}`);

  if (data) {
    console.log(`📊 Data: ${sanitize(JSON.stringify(data), 500)}`);
  }

  console.log('');

  res.status(200).json({ received: true });
});

module.exports = router;