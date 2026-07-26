#!/usr/bin/env node

/**
 * Generate Secure Secrets for EventConnect 2.0 Backend
 * 
 * This script generates cryptographically secure secrets
 * for JWT, sessions, and other security purposes.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 EventConnect 2.0 - Secret Generator');
console.log('=====================================\n');

// Generate different types of secrets
function generateJWTSecret() {
  return crypto.randomBytes(64).toString('hex');
}

function generateSessionSecret() {
  return crypto.randomBytes(32).toString('hex');
}

function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

function generatePassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Generate secrets
const secrets = {
  JWT_SECRET: generateJWTSecret(),
  JWT_REFRESH_SECRET: generateJWTSecret(),
  SESSION_SECRET: generateSessionSecret(),
  API_KEY: generateApiKey(),
  ADMIN_PASSWORD: generatePassword(20),
  DATABASE_PASSWORD: generatePassword(16),
};

console.log('🔑 Generated Secrets:');
console.log('====================');
console.log('');

Object.entries(secrets).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('');
console.log('📝 Environment Variables Template:');
console.log('==================================');
console.log('');

Object.entries(secrets).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('');
console.log('⚠️  IMPORTANT SECURITY NOTES:');
console.log('============================');
console.log('1. Store these secrets securely');
console.log('2. Never commit them to version control');
console.log('3. Use different secrets for development and production');
console.log('4. Rotate secrets regularly');
console.log('5. Use environment variables in production');
console.log('');

console.log('📋 Next Steps:');
console.log('==============');
console.log('1. Copy the secrets above to your .env file');
console.log('2. Update your backend configuration');
console.log('3. Restart your backend server');
console.log('4. Test authentication functionality');
console.log('5. Update production environment variables');
console.log('');

// Optionally save to a temporary file (not .env)
const tempFile = path.join(__dirname, '..', 'secrets.tmp');
fs.writeFileSync(tempFile, Object.entries(secrets).map(([key, value]) => `${key}=${value}`).join('\n'));

console.log(`💾 Secrets saved to: ${tempFile}`);
console.log('   (Remember to delete this file after copying to .env)');
console.log('');

console.log('✅ Secret generation completed!');

