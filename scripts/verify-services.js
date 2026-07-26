#!/usr/bin/env node

/**
 * Script de verificación de servicios externos
 * Verifica qué servicios están disponibles y configurados correctamente
 */

const fs = require('fs');
const path = require('path');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function readEnvFile(filePath) {
  try {
    if (!checkFileExists(filePath)) return {};
    
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return env;
  } catch (error) {
    return {};
  }
}

async function checkPort(port, host = 'localhost') {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    
    socket.setTimeout(3000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

async function checkURL(url) {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, { 
      method: 'GET',
      timeout: 5000 
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function main() {
  log('\n🔍 VERIFICACIÓN DE SERVICIOS EXTERNOS - EVENTCONNECT\n', 'bright');
  
  // Verificar archivos de configuración
  log('📁 ARCHIVOS DE CONFIGURACIÓN:', 'cyan');
  
  const backendEnvPath = path.join(__dirname, '../backend/.env');
  const webEnvPath = path.join(__dirname, '../web/.env.local');
  const mobileEnvPath = path.join(__dirname, '../mobile-final/.env');
  
  const backendEnvExists = checkFileExists(backendEnvPath);
  const webEnvExists = checkFileExists(webEnvPath);
  const mobileEnvExists = checkFileExists(mobileEnvPath);
  
  log(`  backend/.env: ${backendEnvExists ? '✅ Existe' : '❌ No existe'}`, backendEnvExists ? 'green' : 'red');
  log(`  web/.env.local: ${webEnvExists ? '✅ Existe' : '❌ No existe'}`, webEnvExists ? 'green' : 'red');
  log(`  mobile-final/.env: ${mobileEnvExists ? '✅ Existe' : '⚪ Opcional'}`, mobileEnvExists ? 'green' : 'yellow');
  
  // Leer configuración del backend
  const backendEnv = readEnvFile(backendEnvPath);
  
  log('\n🗃️ BASE DE DATOS:', 'cyan');
  
  // Verificar MongoDB
  const mongoUri = backendEnv.MONGODB_URI || 'mongodb://localhost:27017/eventconnect';
  const isMongoLocal = mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1');
  
  if (isMongoLocal) {
    const mongoPort = 27017;
    const mongoAvailable = await checkPort(mongoPort);
    log(`  MongoDB Local (puerto ${mongoPort}): ${mongoAvailable ? '✅ Disponible' : '❌ No disponible'}`, mongoAvailable ? 'green' : 'red');
    
    if (!mongoAvailable) {
      log('    💡 Para iniciar MongoDB:', 'yellow');
      log('       Windows: mongod --dbpath C:\\data\\db', 'yellow');
      log('       macOS/Linux: mongod --dbpath /usr/local/var/mongodb', 'yellow');
    }
  } else {
    log(`  MongoDB Atlas: ${mongoUri.includes('mongodb+srv') ? '✅ Configurado' : '⚪ Configuración manual'}`, 'green');
  }
  
  log('\n🔐 AUTENTICACIÓN:', 'cyan');
  
  const hasJWTSecret = backendEnv.JWT_SECRET && backendEnv.JWT_SECRET.length > 20;
  const hasRefreshSecret = backendEnv.REFRESH_TOKEN_SECRET && backendEnv.REFRESH_TOKEN_SECRET.length > 20;
  
  log(`  JWT Secret: ${hasJWTSecret ? '✅ Configurado' : '❌ Falta o muy corto'}`, hasJWTSecret ? 'green' : 'red');
  log(`  Refresh Secret: ${hasRefreshSecret ? '✅ Configurado' : '❌ Falta o muy corto'}`, hasRefreshSecret ? 'green' : 'red');
  
  log('\n🖼️ SERVICIOS DE ARCHIVOS:', 'cyan');
  
  const hasCloudinary = backendEnv.CLOUDINARY_CLOUD_NAME && 
                       backendEnv.CLOUDINARY_API_KEY && 
                       backendEnv.CLOUDINARY_API_SECRET;
  
  const isCloudinaryDemo = backendEnv.CLOUDINARY_CLOUD_NAME === 'demo-eventconnect';
  
  log(`  Cloudinary: ${hasCloudinary ? (isCloudinaryDemo ? '⚪ Demo (configurar para producción)' : '✅ Configurado') : '❌ No configurado'}`, 
      hasCloudinary ? (isCloudinaryDemo ? 'yellow' : 'green') : 'red');
  
  log('\n🗺️ MAPAS Y GEOLOCALIZACIÓN:', 'cyan');
  
  const webEnv = readEnvFile(webEnvPath);
  const hasGoogleMapsWeb = webEnv.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  log(`  Google Maps (Web): ${hasGoogleMapsWeb ? '✅ Configurado' : '❌ No configurado'}`, hasGoogleMapsWeb ? 'green' : 'red');
  log(`  Google Maps (Mobile): ⚪ Verificar en mobile-final/app.json`, 'yellow');
  
  log('\n📧 SERVICIOS DE EMAIL:', 'cyan');
  
  const hasEmailConfig = backendEnv.EMAIL_SERVICE && backendEnv.EMAIL_USER && backendEnv.EMAIL_PASS;
  const isEmailDemo = backendEnv.EMAIL_USER === 'demo@eventconnect.com';
  
  log(`  Email Service: ${hasEmailConfig ? (isEmailDemo ? '⚪ Demo (configurar para producción)' : '✅ Configurado') : '❌ No configurado'}`, 
      hasEmailConfig ? (isEmailDemo ? 'yellow' : 'green') : 'red');
  
  log('\n🔗 OAUTH PROVIDERS:', 'cyan');
  
  const hasGoogleOAuth = backendEnv.GOOGLE_CLIENT_ID && backendEnv.GOOGLE_CLIENT_SECRET;
  const hasFacebookOAuth = backendEnv.FACEBOOK_APP_ID && backendEnv.FACEBOOK_APP_SECRET;
  const hasGitHubOAuth = backendEnv.GITHUB_CLIENT_ID && backendEnv.GITHUB_CLIENT_SECRET;
  
  const isGoogleDemo = backendEnv.GOOGLE_CLIENT_ID === 'demo-google-client-id.apps.googleusercontent.com';
  const isFacebookDemo = backendEnv.FACEBOOK_APP_ID === '123456789012345';
  const isGitHubDemo = backendEnv.GITHUB_CLIENT_ID === 'demo-github-client-id';
  
  log(`  Google OAuth: ${hasGoogleOAuth ? (isGoogleDemo ? '⚪ Demo' : '✅ Configurado') : '❌ No configurado'}`, 
      hasGoogleOAuth ? (isGoogleDemo ? 'yellow' : 'green') : 'red');
  log(`  Facebook OAuth: ${hasFacebookOAuth ? (isFacebookDemo ? '⚪ Demo' : '✅ Configurado') : '❌ No configurado'}`, 
      hasFacebookOAuth ? (isFacebookDemo ? 'yellow' : 'green') : 'red');
  log(`  GitHub OAuth: ${hasGitHubOAuth ? (isGitHubDemo ? '⚪ Demo' : '✅ Configurado') : '❌ No configurado'}`, 
      hasGitHubOAuth ? (isGitHubDemo ? 'yellow' : 'green') : 'red');
  
  log('\n⚡ SERVICIOS DE CACHE:', 'cyan');
  
  const redisUri = backendEnv.REDIS_URL || 'redis://localhost:6379';
  const isRedisLocal = redisUri.includes('localhost') || redisUri.includes('127.0.0.1');
  
  if (isRedisLocal) {
    const redisAvailable = await checkPort(6379);
    log(`  Redis Local: ${redisAvailable ? '✅ Disponible' : '⚪ No disponible (opcional)'}`, redisAvailable ? 'green' : 'yellow');
  } else {
    log(`  Redis Cloud: ✅ Configurado`, 'green');
  }
  
  log('\n🌐 CONECTIVIDAD DE SERVICIOS:', 'cyan');
  
  // Verificar backend
  const backendPort = backendEnv.PORT || 5000;
  const backendRunning = await checkPort(backendPort);
  log(`  Backend (puerto ${backendPort}): ${backendRunning ? '✅ Ejecutándose' : '❌ No disponible'}`, backendRunning ? 'green' : 'red');
  
  if (backendRunning) {
    const healthEndpoint = `http://localhost:${backendPort}/api/health`;
    const healthOK = await checkURL(healthEndpoint);
    log(`  Health Endpoint: ${healthOK ? '✅ Responde' : '❌ No responde'}`, healthOK ? 'green' : 'red');
  }
  
  // Verificar frontend web
  const webRunning = await checkPort(3000);
  log(`  Frontend Web (puerto 3000): ${webRunning ? '✅ Ejecutándose' : '⚪ No iniciado'}`, webRunning ? 'green' : 'yellow');
  
  // Verificar móvil
  const mobileMetroRunning = await checkPort(8081);
  log(`  Mobile Metro (puerto 8081): ${mobileMetroRunning ? '✅ Ejecutándose' : '⚪ No iniciado'}`, mobileMetroRunning ? 'green' : 'yellow');
  
  log('\n📊 RESUMEN:', 'bright');
  
  const criticalServices = [
    { name: 'Archivo .env backend', status: backendEnvExists },
    { name: 'JWT Secrets', status: hasJWTSecret && hasRefreshSecret },
    { name: 'MongoDB', status: isMongoLocal ? await checkPort(27017) : true }
  ];
  
  const criticalOK = criticalServices.every(service => service.status);
  
  log(`  🔴 Servicios críticos: ${criticalOK ? '✅ Todos configurados' : '❌ Faltan configuraciones'}`, criticalOK ? 'green' : 'red');
  
  const importantServices = [
    { name: 'Cloudinary', status: hasCloudinary && !isCloudinaryDemo },
    { name: 'Google Maps', status: hasGoogleMapsWeb },
    { name: 'Email Service', status: hasEmailConfig && !isEmailDemo }
  ];
  
  const importantOK = importantServices.filter(service => service.status).length;
  log(`  🟡 Servicios importantes: ${importantOK}/${importantServices.length} configurados`, importantOK === importantServices.length ? 'green' : 'yellow');
  
  if (!criticalOK) {
    log('\n❌ ACCIÓN REQUERIDA:', 'red');
    log('   1. Crear backend/.env (ver CONFIGURACION-SERVICIOS-EXTERNOS.md)', 'red');
    log('   2. Configurar MongoDB local o Atlas', 'red');
    log('   3. Verificar que JWT secrets estén configurados', 'red');
  } else {
    log('\n✅ CONFIGURACIÓN BÁSICA COMPLETA:', 'green');
    log('   • Backend puede iniciarse', 'green');
    log('   • Autenticación funcionará', 'green');
    log('   • Base de datos conectará', 'green');
  }
  
  log('\n📖 Para configuración completa, ver: CONFIGURACION-SERVICIOS-EXTERNOS.md\n', 'cyan');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };





