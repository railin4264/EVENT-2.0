#!/usr/bin/env node

/**
 * EMERGENCY SECURITY ROTATION SCRIPT
 * Rotates all compromised credentials and generates secure replacements
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🚨 EMERGENCY SECURITY ROTATION STARTING...');

// Generate cryptographically secure secrets
const generateJWTSecret = () => crypto.randomBytes(64).toString('hex');
const generateApiKey = () => crypto.randomBytes(32).toString('hex');
const generatePassword = () => crypto.randomBytes(24).toString('base64').replace(/[/+=]/g, '');

// COMPROMISED CREDENTIALS TO ROTATE
const COMPROMISED_KEYS = {
  GOOGLE_MAPS_API_KEY: 'AIzaSyDNN_nzVkisOiUq-O-3TT6vNYscXz5wkXo', // EXPOSED - IMMEDIATE ROTATION
  JWT_SECRET: 'eventconnect-super-secret-jwt-key-2024', // WEAK - NEEDS SECURE REPLACEMENT
  OLD_WEAK_JWT: 'your_super_secure_jwt_secret_here_minimum_64_characters_eventconnect_2024_development_key_12345'
};

// Generate new secure credentials
const NEW_SECURE_CREDENTIALS = {
  JWT_SECRET: generateJWTSecret(),
  JWT_REFRESH_SECRET: generateJWTSecret(),
  SESSION_SECRET: generateJWTSecret(),
  COOKIE_SECRET: generateJWTSecret(),
  ENCRYPTION_KEY: generateJWTSecret(),
  CLOUDINARY_API_SECRET: generateApiKey(),
  REDIS_PASSWORD: generatePassword(),
  MONGODB_PASSWORD: generatePassword(),
  SMTP_PASS: generatePassword(),
  SENTRY_DSN: '', // User must configure
  STRIPE_SECRET_KEY: '', // User must configure
  GOOGLE_MAPS_API_KEY: '', // User must configure with NEW key
  CLOUDINARY_API_KEY: '', // User must configure
};

// Files to update
const ENV_FILES = [
  '.env',
  'backend-api/.env',
  'backend-api/.env.production',
  'eventconnect-frontend/.env.local',
  'eventconnect-frontend/.env.production',
  'mobile-app/.env.local',
  'mobile-app/.env.production'
];

function rotateCredentials() {
  console.log('\n🔄 Rotating compromised credentials...');

  const backupDir = './security-backup-' + Date.now();
  fs.mkdirSync(backupDir, { recursive: true });

  ENV_FILES.forEach(envFile => {
    const fullPath = path.resolve(envFile);

    if (fs.existsSync(fullPath)) {
      console.log(`📄 Processing: ${envFile}`);

      // Backup original
      const backupPath = path.join(backupDir, envFile.replace(/\//g, '_'));
      fs.copyFileSync(fullPath, backupPath);
      console.log(`✅ Backed up to: ${backupPath}`);

      // Read and process
      let content = fs.readFileSync(fullPath, 'utf8');

      // Replace compromised keys
      Object.entries(COMPROMISED_KEYS).forEach(([key, compromisedValue]) => {
        if (content.includes(compromisedValue)) {
          console.log(`⚠️  FOUND COMPROMISED ${key} in ${envFile}`);
          content = content.replace(new RegExp(compromisedValue, 'g'), '# ROTATED_FOR_SECURITY');
        }
      });

      // Update with new secure credentials
      Object.entries(NEW_SECURE_CREDENTIALS).forEach(([key, newValue]) => {
        const patterns = [
          new RegExp(`${key}=.*`, 'g'),
          new RegExp(`${key}=".*"`, 'g'),
          new RegExp(`${key}='.*'`, 'g')
        ];

        patterns.forEach(pattern => {
          if (pattern.test(content)) {
            content = content.replace(pattern, `${key}=${newValue}`);
            console.log(`🔐 Updated ${key}`);
          }
        });
      });

      // Write secured file
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Secured: ${envFile}`);
    }
  });

  return backupDir;
}

function createSecureEnvTemplate() {
  const template = `# EventConnect 2.0 - SECURE Environment Configuration
# Generated: ${new Date().toISOString()}
# Security Rotation: ${Date.now()}

# CRITICAL SECURITY NOTICE:
# 1. NEVER commit this file to version control
# 2. All keys below are production-ready secure values
# 3. Some keys marked with # USER_CONFIG require manual setup

NODE_ENV=development
PORT=5000
HOST=localhost

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/eventconnect
MONGODB_PASSWORD=${NEW_SECURE_CREDENTIALS.MONGODB_PASSWORD}

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=${NEW_SECURE_CREDENTIALS.REDIS_PASSWORD}

# JWT Configuration (SECURE - 512 bits each)
JWT_SECRET=${NEW_SECURE_CREDENTIALS.JWT_SECRET}
JWT_REFRESH_SECRET=${NEW_SECURE_CREDENTIALS.JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Session Security
SESSION_SECRET=${NEW_SECURE_CREDENTIALS.SESSION_SECRET}
COOKIE_SECRET=${NEW_SECURE_CREDENTIALS.COOKIE_SECRET}
ENCRYPTION_KEY=${NEW_SECURE_CREDENTIALS.ENCRYPTION_KEY}

# CORS Configuration (SECURE)
CORS_ORIGIN=http://localhost:3000,http://localhost:8081
CORS_CREDENTIALS=true

# External Services (USER_CONFIG REQUIRED)
# Visit https://console.cloud.google.com/apis/credentials to create NEW key
GOOGLE_MAPS_API_KEY=# USER_CONFIG_REQUIRED

# Visit https://cloudinary.com/console to create NEW credentials
CLOUDINARY_CLOUD_NAME=# USER_CONFIG_REQUIRED
CLOUDINARY_API_KEY=# USER_CONFIG_REQUIRED
CLOUDINARY_API_SECRET=${NEW_SECURE_CREDENTIALS.CLOUDINARY_API_SECRET}

# Visit https://stripe.com/dashboard/apikeys for NEW keys
STRIPE_SECRET_KEY=# USER_CONFIG_REQUIRED
STRIPE_PUBLISHABLE_KEY=# USER_CONFIG_REQUIRED

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=# USER_CONFIG_REQUIRED
SMTP_PASS=${NEW_SECURE_CREDENTIALS.SMTP_PASS}
SMTP_FROM="EventConnect <noreply@eventconnect.com>"

# Security Configuration
BCRYPT_ROUNDS=12
HELMET_CSP_ENABLED=true
TRUST_PROXY=false

# Rate Limiting (SECURE)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=true

# Monitoring (USER_CONFIG)
SENTRY_DSN=# USER_CONFIG_REQUIRED
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=false

# Features
ENABLE_SWAGGER=false
ENABLE_GRAPHQL=false
ENABLE_WEBSOCKETS=true
ENABLE_FILE_UPLOADS=true

# Development
DEBUG=
ENABLE_DEV_ROUTES=false
`;

  fs.writeFileSync('.env.secure.template', template);
  console.log('📋 Created secure environment template: .env.secure.template');
}

function createSecurityReport(backupDir) {
  const report = `
🚨 EMERGENCY SECURITY ROTATION REPORT
=====================================
Date: ${new Date().toISOString()}
Rotation ID: ${Date.now()}

COMPROMISED CREDENTIALS ROTATED:
- Google Maps API Key: AIzaSyDNN_nzVkisOiUq-O-3TT6vNYscXz5wkXo (EXPOSED)
- JWT Secrets: Multiple weak/hardcoded values (REPLACED)
- Session Secrets: Weak values (REPLACED)

NEW SECURE CREDENTIALS GENERATED:
✅ JWT_SECRET: 128-character cryptographically secure
✅ JWT_REFRESH_SECRET: 128-character cryptographically secure
✅ SESSION_SECRET: 128-character cryptographically secure
✅ COOKIE_SECRET: 128-character cryptographically secure
✅ ENCRYPTION_KEY: 128-character cryptographically secure
✅ REDIS_PASSWORD: 32-character secure password
✅ MONGODB_PASSWORD: 32-character secure password

ACTIONS REQUIRED:
🔴 IMMEDIATE (< 1 hour):
1. Create NEW Google Maps API key at: https://console.cloud.google.com/apis/credentials
2. Restrict the NEW API key to your domains only
3. Update GOOGLE_MAPS_API_KEY in all .env files
4. Revoke the old compromised key: AIzaSyDNN_nzVkisOiUq-O-3TT6vNYscXz5wkXo

🟡 URGENT (< 24 hours):
1. Setup new Cloudinary account or rotate existing credentials
2. Setup new Stripe keys (if using Stripe)
3. Configure new SMTP credentials
4. Update database passwords in production
5. Update Redis passwords in production

🟢 IMPORTANT (< 1 week):
1. Audit all user sessions (JWT rotation will log out all users)
2. Enable 2FA on all external service accounts
3. Setup proper secrets management (HashiCorp Vault, AWS Secrets Manager)
4. Implement API key rotation schedule
5. Add secret scanning to CI/CD pipeline

BACKUPS CREATED:
Original files backed up to: ${backupDir}

NEXT STEPS:
1. Review .env.secure.template for secure configuration
2. Update production environment variables
3. Restart all services with new credentials
4. Monitor logs for authentication failures
5. Test all external integrations

⚠️  WARNING: All existing user sessions will be invalidated due to JWT secret rotation.
⚠️  WARNING: External services will fail until new API keys are configured.

Generated by: EventConnect Security Rotation Script
`;

  fs.writeFileSync('SECURITY_ROTATION_REPORT.md', report);
  console.log('📊 Security rotation report: SECURITY_ROTATION_REPORT.md');
}

function updateGitignore() {
  const gitignorePath = '.gitignore';
  const securityEntries = `
# Security - NEVER commit these files
.env
.env.local
.env.production
.env.staging
.env.development
**/.env
**/.env.local
**/.env.production
**/.env.staging
**/config/secrets.json
**/credentials.json
**/service-account-key.json
**/*-key.pem
**/*.p12
**/*.pfx

# Security backups
security-backup-*/
SECURITY_ROTATION_REPORT.md
.env.secure.template

# API Keys and Secrets
api-keys/
secrets/
credentials/
`;

  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignoreContent.includes('# Security - NEVER commit')) {
      fs.appendFileSync(gitignorePath, securityEntries);
      console.log('✅ Updated .gitignore with security patterns');
    }
  } else {
    fs.writeFileSync(gitignorePath, securityEntries);
    console.log('✅ Created .gitignore with security patterns');
  }
}

// Execute rotation
try {
  console.log('🔐 STARTING EMERGENCY SECURITY ROTATION');
  console.log('⚠️  This will invalidate all current user sessions');

  const backupDir = rotateCredentials();
  createSecureEnvTemplate();
  createSecurityReport(backupDir);
  updateGitignore();

  console.log('\n✅ EMERGENCY SECURITY ROTATION COMPLETED');
  console.log(`📁 Backups saved to: ${backupDir}`);
  console.log('📋 Review SECURITY_ROTATION_REPORT.md for next steps');
  console.log('\n🚨 IMMEDIATE ACTION REQUIRED:');
  console.log('1. Create NEW Google Maps API key (old one is compromised)');
  console.log('2. Update all production environment variables');
  console.log('3. Restart all services');

} catch (error) {
  console.error('❌ SECURITY ROTATION FAILED:', error.message);
  process.exit(1);
}